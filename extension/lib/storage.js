/**
 * Storage utilities for browser extension
 * Wrapper around chrome.storage.local for managing API keys
 */

const STORAGE_KEY = 'apiKeys';

/**
 * Get all stored API keys
 * @returns {Promise<Object>} Object mapping provider names to encrypted key data
 */
export async function getKeys() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[STORAGE_KEY] || {});
      }
    });
  });
}

/**
 * Save an encrypted API key for a provider
 * @param {string} provider - The provider name (e.g., 'openai', 'anthropic')
 * @param {Object} encryptedData - The encrypted key data {salt, iv, ciphertext}
 * @returns {Promise<void>}
 */
export async function saveKey(provider, encryptedData) {
  const keys = await getKeys();
  keys[provider] = encryptedData;
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: keys }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Delete an API key for a provider
 * @param {string} provider - The provider name to delete
 * @returns {Promise<boolean>} True if key was deleted, false if it didn't exist
 */
export async function deleteKey(provider) {
  const keys = await getKeys();
  if (!(provider in keys)) {
    return false;
  }
  delete keys[provider];
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: keys }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Get a single key by provider name
 * @param {string} provider - The provider name
 * @returns {Promise<Object|null>} The encrypted key data or null if not found
 */
export async function getKey(provider) {
  const keys = await getKeys();
  return keys[provider] || null;
}

/**
 * Check if a provider has a stored key
 * @param {string} provider - The provider name
 * @returns {Promise<boolean>}
 */
export async function hasKey(provider) {
  const keys = await getKeys();
  return provider in keys;
}

/**
 * Get list of all provider names with stored keys
 * @returns {Promise<string[]>}
 */
export async function getProviderList() {
  const keys = await getKeys();
  return Object.keys(keys);
}

/**
 * Clear all stored API keys
 * @returns {Promise<void>}
 */
export async function clearAll() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([STORAGE_KEY], () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get the number of stored keys
 * @returns {Promise<number>}
 */
export async function getKeyCount() {
  const keys = await getKeys();
  return Object.keys(keys).length;
}