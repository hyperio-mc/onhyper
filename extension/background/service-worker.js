/**
 * Service Worker for OnHyper Dev Extension
 * Intercepts proxy requests and routes them to real APIs with authentication
 * 
 * Uses chrome.declarativeNetRequest for interception (MV3 compliant)
 */

import { getKeys, getKey, getProviderList } from '../lib/storage.js';
import { decryptWithPassword, fromBase64 } from '../lib/encryption.js';
import { PROXY_MAP, matchProxyUrl, buildRealUrl, getAuthHeaders, isLocalhost, getProviders } from '../lib/proxy-map.js';
import { ERRORS, mapHttpStatus, createError, createSuccess, errorLogger, logAndReturnError } from '../lib/errors.js';

// ============================================
// Session State (in-memory, cleared on reload)
// ============================================

/** @type {string|null} Current password (in memory only, not persisted) */
let sessionPassword = null;

/** @type {Object<string, string>} Decrypted API keys (provider -> plaintext key) */
let decryptedKeys = {};

/** @type {boolean} Whether rules are currently registered */
let rulesRegistered = false;

// ============================================
// Icon Status Management
// ============================================

/**
 * Status types for the extension icon
 * @enum {string}
 */
const IconStatus = {
  UNLOCKED: 'unlocked',  // Green - Keys configured, unlocked
  LOCKED: 'locked',      // Yellow - Keys configured, locked (needs password)
  ERROR: 'error',        // Red - API error detected
  EMPTY: 'empty'         // Gray - No keys configured
};

/** @type {string} Current icon status */
let currentStatus = IconStatus.EMPTY;

/** @type {Object<string, string>} Color mapping for icon status */
const STATUS_COLORS = {
  [IconStatus.UNLOCKED]: 'green',
  [IconStatus.LOCKED]: 'yellow',
  [IconStatus.ERROR]: 'red',
  [IconStatus.EMPTY]: 'gray'
};

/** @type {Object<string, string>} Tooltip text for each status */
const STATUS_TOOLTIPS = {
  [IconStatus.UNLOCKED]: 'OnHyper: Unlocked ✓',
  [IconStatus.LOCKED]: 'OnHyper: Locked (click to unlock)',
  [IconStatus.ERROR]: 'OnHyper: API Error',
  [IconStatus.EMPTY]: 'OnHyper: No keys configured'
};

/** @type {number|null} Timer for error status reset */
let errorResetTimer = null;

/**
 * Update the extension icon and tooltip based on status
 * @param {string} status - One of IconStatus values
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
 * Set error status and auto-reset after 30 seconds
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
 * Determine and set the appropriate status based on current state
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

const LOG_PREFIX = '[OnHyper]';

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

// ============================================
// Password Management
// ============================================

/**
 * Set the session password and decrypt all keys
 * @param {string} password - The password from the user
 * @returns {Promise<Object>} Structured response with success/error
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
 * Clear the session password and decrypted keys
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
 * Decrypt a single key from encrypted storage data
 * @param {Object|string} encryptedData - The encrypted data object or serialized string
 * @param {string} password - The password for decryption
 * @returns {Promise<string>} The decrypted API key
 * @throws {Error} With error code from ERRORS if decryption fails
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
 * Build declarativeNetRequest rules for all providers with decrypted keys
 * @returns {Array|Promise<Array>} Array of rule objects
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
 * Register all proxy rules dynamically
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
 * Unregister all dynamic rules
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
 * Handle messages from popup and content scripts
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
 * Handle a message and return a response
 * @param {Object} message - The message object
 * @returns {Promise<Object>}
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
 * Handle a proxy request via messaging
 * This is a fallback for when declarativeNetRequest rules don't cover all cases
 * @param {Object} message - The proxy request message
 * @returns {Promise<Object>}
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
 * Initialize the service worker
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

// Listen for install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    log('Extension installed');
  } else if (details.reason === 'update') {
    log(`Extension updated from ${details.previousVersion}`);
    // Clear any stale rules
    unregisterAllRules();
  }
});

// Listen for startup (after crash or force-kill)
chrome.runtime.onStartup.addListener(() => {
  log('Extension started');
  initialize();
});