/**
 * Service Worker for OnHyper Dev Extension
 * Intercepts proxy requests and routes them to real APIs with authentication
 * 
 * Uses chrome.declarativeNetRequest for interception (MV3 compliant)
 */

import { getKeys, getKey, getProviderList } from '../lib/storage.js';
import { decryptWithPassword, fromBase64 } from '../lib/encryption.js';
import { PROXY_MAP, matchProxyUrl, buildRealUrl, getAuthHeaders, isLocalhost, getProviders } from '../lib/proxy-map.js';

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
 * @returns {Promise<{success: boolean, error?: string, providers?: string[]}>}
 */
async function setSessionPassword(password) {
  try {
    sessionPassword = password;
    decryptedKeys = {};
    
    // Get all stored keys and decrypt them
    const storedKeys = await getKeys();
    const decryptedProviders = [];
    
    for (const [provider, encryptedData] of Object.entries(storedKeys)) {
      try {
        const key = await decryptKey(encryptedData, password);
        decryptedKeys[provider] = key;
        decryptedProviders.push(provider);
        log(`Decrypted key for ${provider}`);
      } catch (e) {
        logError(`Failed to decrypt key for ${provider}:`, e.message);
      }
    }
    
    // Register/update rules with new keys
    await registerProxyRules();
    
    return {
      success: true,
      providers: decryptedProviders
    };
  } catch (error) {
    logError('Failed to set session password:', error);
    return {
      success: false,
      error: error.message
    };
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
}

/**
 * Decrypt a single key from encrypted storage data
 * @param {Object|string} encryptedData - The encrypted data object or serialized string
 * @param {string} password - The password for decryption
 * @returns {Promise<string>} The decrypted API key
 */
async function decryptKey(encryptedData, password) {
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
  
  return decryptWithPassword(ciphertext, iv, salt, password);
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
      sendResponse({ success: false, error: error.message });
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
      return { success: true };
    
    case 'GET_STATUS':
      const providers = await getProviderList();
      return {
        hasPassword: sessionPassword !== null,
        rulesRegistered,
        storedProviders: providers,
        decryptedProviders: Object.keys(decryptedKeys)
      };
    
    case 'KEYS_CHANGED':
      // Keys were updated in storage, re-decrypt if we have a password
      if (sessionPassword) {
        return setSessionPassword(sessionPassword);
      }
      return { success: true };
    
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
    return {
      success: false,
      error: 'Invalid proxy URL'
    };
  }
  
  const { provider, path } = match;
  
  // Check if we have a key for this provider
  if (!decryptedKeys[provider]) {
    return {
      success: false,
      error: `No key available for ${provider}. Please unlock the extension.`
    };
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
    
    const responseBody = await response.text();
    
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    };
  } catch (error) {
    logError('Proxy request failed:', error);
    return {
      success: false,
      error: `Network error: ${error.message}`
    };
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
  
  // Log storage status
  try {
    const providers = await getProviderList();
    if (providers.length > 0) {
      log(`Keys stored for: ${providers.join(', ')}`);
      log('Waiting for password to unlock keys');
    } else {
      log('No API keys stored. Use popup to add keys.');
    }
  } catch (error) {
    logError('Failed to check storage:', error);
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