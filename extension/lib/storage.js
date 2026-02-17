/**
 * @fileoverview Storage utilities for the OnHyper Dev browser extension.
 * 
 * This module provides a Promise-based wrapper around `chrome.storage.local` for
 * managing encrypted API keys. All keys are stored in a single object keyed by
 * provider name, with values containing encrypted key data (salt, IV, ciphertext).
 * 
 * @module lib/storage
 * @requires chrome.storage.local
 * 
 * @example
 * // Save an encrypted key
 * await saveKey('openai', { salt, iv, ciphertext });
 * 
 * // Retrieve all stored providers
 * const providers = await getProviderList();
 * // ['openai', 'anthropic']
 * 
 * // Check if a key exists
 * const hasOpenAI = await hasKey('openai');
 */

/** @constant {string} STORAGE_KEY - The key used to store API keys in chrome.storage.local */
const STORAGE_KEY = 'apiKeys';

/**
 * Retrieves all stored API keys from chrome.storage.local.
 * 
 * @returns {Promise<Object.<string, Object>>} Object mapping provider names to their
 *   encrypted key data. Returns an empty object `{}` if no keys are stored.
 * @throws {Error} If chrome.storage.local access fails (propagates chrome.runtime.lastError)
 * 
 * @example
 * const keys = await getKeys();
 * console.log(keys);
 * // { openai: { salt: '...', iv: '...', ciphertext: '...' } }
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
 * Saves an encrypted API key for a specific provider.
 * 
 * If a key already exists for the provider, it will be overwritten.
 * 
 * @param {string} provider - The provider identifier (e.g., 'openai', 'anthropic', 'openrouter')
 * @param {Object} encryptedData - The encrypted key data object
 * @param {string|Uint8Array} encryptedData.salt - Salt used for key derivation (base64 or binary)
 * @param {string|Uint8Array} encryptedData.iv - Initialization vector for AES-GCM (base64 or binary)
 * @param {string|Uint8Array} encryptedData.ciphertext - Encrypted API key (base64 or binary)
 * @returns {Promise<void>}
 * @throws {Error} If chrome.storage.local access fails
 * 
 * @example
 * // After encrypting with password
 * const { salt, iv, ciphertext } = await encryptWithPassword('sk-xxxx', password);
 * await saveKey('openai', { salt, iv, ciphertext });
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
 * Deletes an API key for a specific provider.
 * 
 * @param {string} provider - The provider identifier to delete
 * @returns {Promise<boolean>} `true` if the key was deleted, `false` if the key didn't exist
 * @throws {Error} If chrome.storage.local access fails
 * 
 * @example
 * const deleted = await deleteKey('openai');
 * if (deleted) {
 *   console.log('OpenAI key removed');
 * }
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
 * Retrieves the encrypted key data for a single provider.
 * 
 * @param {string} provider - The provider identifier
 * @returns {Promise<Object|null>} The encrypted key data object, or `null` if not found
 * @throws {Error} If chrome.storage.local access fails
 * 
 * @example
 * const keyData = await getKey('openai');
 * if (keyData) {
 *   const decrypted = await decryptWithPassword(keyData.ciphertext, keyData.iv, keyData.salt, password);
 * }
 */
export async function getKey(provider) {
  const keys = await getKeys();
  return keys[provider] || null;
}

/**
 * Checks if a provider has a stored API key.
 * 
 * @param {string} provider - The provider identifier
 * @returns {Promise<boolean>} `true` if a key exists for the provider
 * @throws {Error} If chrome.storage.local access fails
 * 
 * @example
 * if (await hasKey('openai')) {
 *   console.log('OpenAI key is configured');
 * }
 */
export async function hasKey(provider) {
  const keys = await getKeys();
  return provider in keys;
}

/**
 * Gets a list of all provider names that have stored keys.
 * 
 * @returns {Promise<string[]>} Array of provider identifiers with stored keys
 * @throws {Error} If chrome.storage.local access fails
 * 
 * @example
 * const providers = await getProviderList();
 * // ['openai', 'anthropic', 'openrouter']
 */
export async function getProviderList() {
  const keys = await getKeys();
  return Object.keys(keys);
}

/**
 * Removes all stored API keys from storage.
 * 
 * Use with caution - this operation cannot be undone.
 * 
 * @returns {Promise<void>}
 * @throws {Error} If chrome.storage.local access fails
 * 
 * @example
 * // Clear all keys (e.g., on logout)
 * await clearAll();
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
 * Gets the count of stored API keys.
 * 
 * @returns {Promise<number>} Number of providers with stored keys
 * @throws {Error} If chrome.storage.local access fails
 * 
 * @example
 * const count = await getKeyCount();
 * console.log(`${count} API keys configured`);
 */
export async function getKeyCount() {
  const keys = await getKeys();
  return Object.keys(keys).length;
}