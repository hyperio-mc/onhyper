/**
 * @fileoverview Service Worker for the OnHyper Dev browser extension.
 * 
 * This module is the background script that handles:
 * - API request interception and proxying using `chrome.declarativeNetRequest`
 * - Session password management for key decryption
 * - Dynamic rule registration for each configured provider
 * - Icon status updates based on extension state
 * - Message handling from popup and content scripts
 * 
 * Architecture:
 * 1. User sets password → keys are decrypted and stored in memory
 * 2. Rules are registered for each provider with decrypted keys
 * 3. Proxy requests are automatically redirected and authenticated
 * 4. Icon color indicates current state (unlocked/locked/error/empty)
 * 
 * @module background/service-worker
 * @requires lib/storage
 * @requires lib/encryption
 * @requires lib/proxy-map
 * @requires lib/errors
 * 
 * @example
 * // The service worker auto-initializes on load
 * // Users interact via messages from popup:
 * chrome.runtime.sendMessage({ type: 'SET_PASSWORD', password: 'xxx' });
 */

import { getKeys, getKey, getProviderList } from '../lib/storage.js';
import { decryptWithPassword, fromBase64 } from '../lib/encryption.js';
import { PROXY_MAP, matchProxyUrl, buildRealUrl, getAuthHeaders, isLocalhost, getProviders } from '../lib/proxy-map.js';
import { ERRORS, mapHttpStatus, createError, createSuccess, errorLogger, logAndReturnError } from '../lib/errors.js';

// ============================================
// Session State (in-memory, cleared on reload)
// ============================================

/**
 * Current password stored in session memory.
 * Not persisted - cleared when service worker terminates.
 * @type {string|null}
 */
let sessionPassword = null;

/**
 * Decrypted API keys indexed by provider.
 * Populated after successful password entry.
 * @type {Object.<string, string>}
 */
let decryptedKeys = {};

/**
 * Whether declarativeNetRequest rules are currently registered.
 * @type {boolean}
 */
let rulesRegistered = false;

// ============================================
// Icon Status Management
// ============================================

/**
 * Extension icon status types.
 * @readonly
 * @enum {string}
 * @property {string} UNLOCKED - Green: Keys configured and decrypted
 * @property {string} LOCKED - Yellow: Keys exist but need password
 * @property {string} ERROR - Red: API error detected
 * @property {string} EMPTY - Gray: No keys configured
 */
const IconStatus = {
  UNLOCKED: 'unlocked',
  LOCKED: 'locked',
  ERROR: 'error',
  EMPTY: 'empty'
};

/**
 * Current icon status.
 * @type {IconStatus}
 */
let currentStatus = IconStatus.EMPTY;

/**
 * Color mapping for each icon status.
 * @constant {Object.<IconStatus, string>}
 */
const STATUS_COLORS = {
  [IconStatus.UNLOCKED]: 'green',
  [IconStatus.LOCKED]: 'yellow',
  [IconStatus.ERROR]: 'red',
  [IconStatus.EMPTY]: 'gray'
};

/**
 * Tooltip text for each icon status.
 * @constant {Object.<IconStatus, string>}
 */
const STATUS_TOOLTIPS = {
  [IconStatus.UNLOCKED]: 'OnHyper: Unlocked ✓',
  [IconStatus.LOCKED]: 'OnHyper: Locked (click to unlock)',
  [IconStatus.ERROR]: 'OnHyper: API Error',
  [IconStatus.EMPTY]: 'OnHyper: No keys configured'
};

/**
 * Timer handle for automatic error status reset.
 * @type {number|null}
 */
let errorResetTimer = null;

/**
 * Updates the extension icon and tooltip based on status.
 * 
 * Changes the icon color and tooltip text to reflect the current
 * extension state. Colors: green (unlocked), yellow (locked), red (error), gray (empty).
 * 
 * @async
 * @param {IconStatus} status - One of the IconStatus enum values
 * @returns {Promise<void>}
 * 
 * @example
 * await updateIcon(IconStatus.UNLOCKED);  // Green icon
 * await updateIcon(IconStatus.LOCKED);    // Yellow icon
 */
async function updateIcon(status) {
  if (!STATUS_COLORS[status]) {
    logError('Invalid icon status:', status);
    return;
  }
  
  currentStatus = status;
  const color = STATUS_COLORS[status];
  
  try {
    // Update icon
    await chrome.action.setIcon({
      path: {
        16: `icons/icon-${color}-16.png`,
        48: `icons/icon-${color}-48.png`,
        128: `icons/icon-${color}-128.png`
      }
    });
    
    // Update tooltip (badge text for quick status, title for tooltip)
    await chrome.action.setBadgeText({ text: '' }); // Clear badge, use icon color instead
    await chrome.action.setTitle({ title: STATUS_TOOLTIPS[status] });
    
    log(`Icon updated: ${status} (${color})`);
  } catch (error) {
    logError('Failed to update icon:', error);
  }
}

/**
 * Sets the icon to error status and schedules automatic reset.
 * 
 * After 30 seconds, automatically resets to the appropriate status
 * based on current state (unlocked, locked, or empty).
 * 
 * @async
 * @returns {Promise<void>}
 */
async function setErrorStatus() {
  await updateIcon(IconStatus.ERROR);
  
  // Clear any existing timer
  if (errorResetTimer) {
    clearTimeout(errorResetTimer);
  }
  
  // Reset to appropriate status after 30 seconds
  errorResetTimer = setTimeout(async () => {
    errorResetTimer = null;
    await determineAndSetStatus();
  }, 30000);
}

/**
 * Determines and sets the appropriate icon status based on current state.
 * 
 * Logic:
 * - No keys stored → EMPTY (gray)
 * - Password set and keys decrypted → UNLOCKED (green)
 * - Keys exist but locked → LOCKED (yellow)
 * 
 * @async
 * @returns {Promise<void>}
 */
async function determineAndSetStatus() {
  try {
    const providers = await getProviderList();
    
    if (providers.length === 0) {
      // No keys stored
      await updateIcon(IconStatus.EMPTY);
    } else if (sessionPassword !== null && Object.keys(decryptedKeys).length > 0) {
      // Password set and keys decrypted
      await updateIcon(IconStatus.UNLOCKED);
    } else {
      // Keys stored but locked
      await updateIcon(IconStatus.LOCKED);
    }
  } catch (error) {
    logError('Failed to determine status:', error);
    await updateIcon(IconStatus.ERROR);
  }
}

// ============================================
// Logging
// ============================================

/** Prefix for all console logs from this module */
const LOG_PREFIX = '[OnHyper]';

/**
 * Logs an info message to console with module prefix.
 * @param {...*} args - Arguments to log
 */
function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

/**
 * Logs an error message to console with module prefix.
 * @param {...*} args - Arguments to log
 */
function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

// ============================================
// Password Management
// ============================================

/**
 * Sets the session password and decrypts all stored API keys.
 * 
 * Process:
 * 1. Stores password in memory
 * 2. Retrieves all encrypted keys from storage
 * 3. Attempts to decrypt each key
 * 4. Registers proxy rules for successfully decrypted keys
 * 5. Updates icon status
 * 
 * @async
 * @param {string} password - The user's password for decryption
 * @returns {Promise<Object>} Response with decrypted providers list
 * @property {string[]} providers - Successfully decrypted provider IDs
 * @property {string[]} failedProviders - Providers that failed decryption
 * @property {string|null} warning - Warning message if any decryption failed
 * @throws {Error} Via error response if unexpected failure
 * 
 * @example
 * const result = await setSessionPassword('user-password');
 * if (result.success) {
 *   console.log('Decrypted:', result.providers);
 *   if (result.warning) console.warn(result.warning);
 * }
 */
async function setSessionPassword(password) {
  try {
    sessionPassword = password;
    decryptedKeys = {};
    
    // Get all stored keys and decrypt them
    const storedKeys = await getKeys();
    const decryptedProviders = [];
    const failedProviders = [];
    
    for (const [provider, encryptedData] of Object.entries(storedKeys)) {
      try {
        const key = await decryptKey(encryptedData, password);
        decryptedKeys[provider] = key;
        decryptedProviders.push(provider);
        log(`Decrypted key for ${provider}`);
      } catch (e) {
        logError(`Failed to decrypt key for ${provider}:`, e.message);
        failedProviders.push(provider);
        // Log decryption failure
        errorLogger.log(ERRORS.DECRYPT_FAILED, { provider, originalError: e.message });
      }
    }
    
    // Register/update rules with new keys
    await registerProxyRules();
    
    // Update icon: unlocked (green) if we have decrypted keys, error if all failed
    if (decryptedProviders.length > 0) {
      await updateIcon(IconStatus.UNLOCKED);
    } else if (Object.keys(storedKeys).length > 0) {
      // Keys exist but decryption failed
      await updateIcon(IconStatus.ERROR);
    } else {
      await updateIcon(IconStatus.EMPTY);
    }
    
    return createSuccess({
      providers: decryptedProviders,
      failedProviders,
      // If some failed, include a warning
      warning: failedProviders.length > 0 
        ? `Could not decrypt keys for: ${failedProviders.join(', ')}. Check your password.`
        : null
    });
  } catch (error) {
    logError('Failed to set session password:', error);
    await updateIcon(IconStatus.ERROR);
    return logAndReturnError(ERRORS.UNKNOWN, { operation: 'setSessionPassword', originalError: error.message });
  }
}

/**
 * Clears the session password and all decrypted keys from memory.
 * 
 * Also unregisters all proxy rules and updates icon status.
 * Called on explicit logout or when user wants to re-lock.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function clearSessionPassword() {
  sessionPassword = null;
  decryptedKeys = {};
  await unregisterAllRules();
  log('Session password cleared');
  
  // Update icon: locked (yellow) if keys exist, empty (gray) if not
  await determineAndSetStatus();
}

/**
 * Decrypts a single API key from encrypted storage data.
 * 
 * Handles both serialized strings and parsed objects with base64 fields.
 * 
 * @async
 * @param {Object|string} encryptedData - Encrypted data object or serialized JSON string
 * @param {string|Uint8Array} encryptedData.salt - Salt for key derivation
 * @param {string|Uint8Array} encryptedData.iv - IV for AES-GCM decryption
 * @param {string|Uint8Array} encryptedData.ciphertext - Encrypted API key
 * @param {string} password - Password for decryption
 * @returns {Promise<string>} Decrypted API key plaintext
 * @throws {Error} With code 'DECRYPT_FAILED' if decryption fails
 * 
 * @example
 * const encrypted = await getKey('openai');
 * const decrypted = await decryptKey(encrypted, 'password');
 */
async function decryptKey(encryptedData, password) {
  try {
    // Handle both serialized strings and parsed objects
    let { salt, iv, ciphertext } = encryptedData;
    
    // Convert base64 strings to Uint8Array if needed
    if (typeof salt === 'string') {
      salt = fromBase64(salt);
    }
    if (typeof iv === 'string') {
      iv = fromBase64(iv);
    }
    if (typeof ciphertext === 'string') {
      ciphertext = fromBase64(ciphertext);
    }
    
    return await decryptWithPassword(ciphertext, iv, salt, password);
  } catch (e) {
    // Log the decryption failure
    errorLogger.log({ code: 'DECRYPT_FAILED', message: e.message }, { operation: 'decryptKey' });
    // Re-throw with proper error info
    const error = new Error(e.message);
    error.code = 'DECRYPT_FAILED';
    throw error;
  }
}

// ============================================
// Rule Registration
// ============================================

/**
 * Builds declarativeNetRequest rules for all providers with decrypted keys.
 * 
 * Each rule:
 * - Matches proxy URLs using regex patterns
 * - Redirects to real API endpoints
 * - Adds authentication headers
 * 
 * @async
 * @returns {Promise<Array<Object>>} Array of rule objects for declarativeNetRequest
 * 
 * @example
 * const rules = await buildProxyRules();
 * // [{ id: 1, priority: 1, action: { type: 'redirect', ... }, condition: { ... } }]
 */
async function buildProxyRules() {
  const rules = [];
  let ruleId = 1;
  
  for (const [provider, config] of Object.entries(PROXY_MAP)) {
    // Skip providers without decrypted keys
    if (!decryptedKeys[provider]) {
      continue;
    }
    
    const apiKey = decryptedKeys[provider];
    const authHeaders = config.authHeader(apiKey);
    const requestHeaders = Object.entries(authHeaders).map(([header, value]) => ({
      header,
      operation: chrome.declarativeNetRequest.HeaderOperation.SET,
      value
    }));
    
    // Build regex filter to match proxy URLs for this provider
    // Matches: http(s)://any-host/proxy/{provider}/{path}
    // Also matches chrome-extension:// URLs which can have fetch requests
    const regexFilter = `^https?://[^/]+/proxy/${provider}/(.*)$`;
    
    // The substitution uses $1 from the regex capture group
    const regexSubstitution = config.target;
    
    // Rule to redirect and add headers for this provider
    rules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          regexSubstitution
        },
        requestHeaders
      },
      condition: {
        regexFilter,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.FETCH
        ]
      }
    });
    
    log(`Built rule for ${provider}: ${regexFilter} -> ${regexSubstitution}`);
  }
  
  return rules;
}

/**
 * Registers all proxy rules dynamically via declarativeNetRequest API.
 * 
 * Removes existing dynamic rules before adding new ones.
 * If no providers have decrypted keys, unregisters all rules.
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If rule registration fails
 */
async function registerProxyRules() {
  try {
    // Get current dynamic rules to remove
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = currentRules.map(rule => rule.id);
    
    // Build new rules
    const newRules = await buildProxyRules();
    
    if (newRules.length === 0) {
      log('No providers with keys, not registering rules');
      if (ruleIdsToRemove.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove,
          addRules: []
        });
      }
      rulesRegistered = false;
      return;
    }
    
    // Update rules: remove old, add new
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: newRules
    });
    
    rulesRegistered = true;
    log(`Registered ${newRules.length} proxy rules`);
    
    // Log each registered rule for debugging
    for (const rule of newRules) {
      log(`Rule ${rule.id}: ${rule.condition.regexFilter || rule.condition.urlFilter} -> redirect`);
    }
  } catch (error) {
    logError('Failed to register proxy rules:', error);
    throw error;
  }
}

/**
 * Unregisters all dynamic declarativeNetRequest rules.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function unregisterAllRules() {
  try {
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = currentRules.map(rule => rule.id);
    
    if (ruleIdsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: []
      });
      log(`Unregistered ${ruleIdsToRemove.length} rules`);
    }
    
    rulesRegistered = false;
  } catch (error) {
    logError('Failed to unregister rules:', error);
  }
}

// ============================================
// Debugging: Rule Match Listener
// ============================================

// Listen for rule matches (debug mode only - requires extension to be unpacked)
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    log('Rule matched:', {
      ruleId: info.rule.ruleId,
      request: info.request.url,
      method: info.request.method
    });
  });
}

// ============================================
// Message Handling
// ============================================

/**
 * Message listener for popup and content script communication.
 * 
 * Handles messages asynchronously and returns responses via sendResponse.
 * Returns `true` to indicate async response.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message:', message.type);
  
  handleMessage(message)
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      logError('Message handling error:', error);
      // Send structured error response
      const errorResponse = createError(ERRORS.UNKNOWN, {
        operation: message.type,
        originalError: error.message
      });
      errorLogger.log({ code: 'UNKNOWN', message: error.message }, { operation: message.type });
      sendResponse(errorResponse);
    });
  
  // Return true to indicate async response
  return true;
});

/**
 * Handles incoming messages and routes to appropriate handlers.
 * 
 * Supported message types:
 * - `SET_PASSWORD` - Set session password and decrypt keys
 * - `CLEAR_PASSWORD` - Clear session and lock extension
 * - `GET_STATUS` - Get current extension state
 * - `GET_ERRORS` - Get error log for debugging
 * - `CLEAR_ERRORS` - Clear error log
 * - `KEYS_CHANGED` - Re-decrypt keys after storage change
 * - `PROXY_REQUEST` - Fallback proxy via messaging (when rules don't work)
 * 
 * @async
 * @param {Object} message - The message object
 * @param {string} message.type - Message type identifier
 * @returns {Promise<Object>} Response object with success/error
 */
async function handleMessage(message) {
  switch (message.type) {
    case 'SET_PASSWORD':
      return setSessionPassword(message.password);
    
    case 'CLEAR_PASSWORD':
      await clearSessionPassword();
      return createSuccess();
    
    case 'GET_STATUS':
      const providers = await getProviderList();
      const recentErrors = errorLogger.getErrors().slice(0, 3); // Last 3 errors for status
      return createSuccess({
        hasPassword: sessionPassword !== null,
        rulesRegistered,
        storedProviders: providers,
        decryptedProviders: Object.keys(decryptedKeys),
        recentErrors,
        errorCount: errorLogger.getErrors().length
      });
    
    case 'GET_ERRORS':
      // Get all logged errors for debugging
      return createSuccess({
        errors: errorLogger.getErrors()
      });
    
    case 'CLEAR_ERRORS':
      // Clear error log
      errorLogger.clear();
      return createSuccess();
    
    case 'KEYS_CHANGED':
      // Keys were updated in storage, re-decrypt if we have a password
      if (sessionPassword) {
        return setSessionPassword(sessionPassword);
      }
      // Update icon status since keys changed
      await determineAndSetStatus();
      return createSuccess();
    
    case 'PROXY_REQUEST':
      // Fallback: Handle request via message (for cases where rules don't work)
      return handleProxyRequest(message);
    
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

/**
 * Handles a proxy request via messaging (fallback mode).
 * 
 * Used when declarativeNetRequest rules don't cover certain cases.
 * Manually constructs and executes the API request.
 * 
 * @async
 * @param {Object} message - Proxy request message
 * @param {string} message.url - Original proxy URL
 * @param {string} message.method - HTTP method (GET, POST, etc.)
 * @param {Object} [message.headers] - Additional request headers
 * @param {string} [message.body] - Request body for POST/PUT
 * @returns {Promise<Object>} Response with status, headers, and body
 */
async function handleProxyRequest(message) {
  const { url, method, headers, body } = message;
  
  // Check if request should be proxied
  const match = matchProxyUrl(url);
  if (!match) {
    return logAndReturnError(ERRORS.UNKNOWN, { 
      operation: 'proxy', 
      reason: 'Invalid proxy URL',
      url 
    });
  }
  
  const { provider, path } = match;
  
  // Check if extension is locked (no password set)
  if (sessionPassword === null) {
    // Check if there are any stored keys
    const storedProviders = await getProviderList();
    if (storedProviders.length > 0) {
      return logAndReturnError(ERRORS.LOCKED, { provider });
    }
    // No keys stored at all
    return logAndReturnError(ERRORS.NO_KEY, { provider });
  }
  
  // Check if we have a key for this provider
  if (!decryptedKeys[provider]) {
    // Check if key exists in storage but couldn't be decrypted
    const storedKey = await getKey(provider);
    if (storedKey) {
      return logAndReturnError(ERRORS.DECRYPT_FAILED, { 
        provider, 
        hint: 'Key exists but could not be decrypted. Check your password.' 
      });
    }
    return logAndReturnError(ERRORS.NO_KEY, { provider });
  }
  
  try {
    // Build real URL and get auth headers
    const realUrl = buildRealUrl(provider, path);
    const authHeaders = getAuthHeaders(provider, decryptedKeys[provider]);
    
    log(`Proxying request: ${method} ${realUrl}`);
    
    // Make the real API request
    const response = await fetch(realUrl, {
      method,
      headers: {
        ...headers,
        ...authHeaders
      },
      body
    });
    
    // Check for error status codes
    if (!response.ok) {
      const errorType = mapHttpStatus(response.status);
      const responseBody = await response.text().catch(() => '');
      
      // Log the API error
      errorLogger.log(errorType, {
        provider,
        status: response.status,
        statusText: response.statusText,
        url: realUrl,
        responseBody: responseBody.slice(0, 500) // Truncate for logging
      });
      
      return createError(errorType, {
        provider,
        status: response.status,
        statusText: response.statusText,
        hint: response.status === 401 
          ? 'Your API key may be invalid or expired. Check the provider dashboard.'
          : response.status === 429
          ? 'You\'ve hit the rate limit. Wait a moment or upgrade your plan.'
          : undefined
      });
    }
    
    const responseBody = await response.text();
    
    return createSuccess({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    });
  } catch (error) {
    // Network or other fetch errors
    logError('Proxy request failed:', error);
    
    // Determine if it's a network error
    const isNetworkError = error.name === 'TypeError' && 
      (error.message.includes('fetch') || 
       error.message.includes('network') ||
       error.message.includes('Failed to fetch'));
    
    if (isNetworkError) {
      return logAndReturnError(ERRORS.NETWORK_ERROR, { 
        provider, 
        url: url.slice(0, 100),
        originalError: error.message 
      });
    }
    
    return logAndReturnError(ERRORS.UNKNOWN, { 
      provider, 
      originalError: error.message 
    });
  }
}

// ============================================
// Initialization
// ============================================

/**
 * Initializes the service worker on startup.
 * 
 * - Logs extension info
 * - Checks for stored keys
 * - Sets appropriate icon status
 * 
 * @async
 * @returns {Promise<void>}
 */
async function initialize() {
  log('Service worker initialized');
  
  // Log extension info
  const manifest = chrome.runtime.getManifest();
  log(`Extension: ${manifest.name} v${manifest.version}`);
  
  // Log available providers
  log('Supported providers:', getProviders());
  
  // Set initial icon status and log storage status
  try {
    const providers = await getProviderList();
    if (providers.length > 0) {
      log(`Keys stored for: ${providers.join(', ')}`);
      log('Waiting for password to unlock keys');
      // Set icon to locked (yellow) - keys exist but need password
      await updateIcon(IconStatus.LOCKED);
    } else {
      log('No API keys stored. Use popup to add keys.');
      // Set icon to empty (gray) - no keys configured
      await updateIcon(IconStatus.EMPTY);
    }
  } catch (error) {
    logError('Failed to check storage:', error);
    await updateIcon(IconStatus.ERROR);
  }
}

// Run initialization
initialize();

// ============================================
// Service Worker Lifecycle
// ============================================

// Note: In MV3, service workers can be terminated and restarted.
// All session state (password, decrypted keys) is lost on termination.
// The user will need to re-enter the password after service worker restarts.

/**
 * Listener for extension install/update events.
 * 
 * - Logs installation reason
 * - Clears stale rules on update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    log('Extension installed');
  } else if (details.reason === 'update') {
    log(`Extension updated from ${details.previousVersion}`);
    // Clear any stale rules
    unregisterAllRules();
  }
});

/**
 * Listener for extension startup (after crash or force-kill).
 * Re-initializes the service worker.
 */
chrome.runtime.onStartup.addListener(() => {
  log('Extension started');
  initialize();
});