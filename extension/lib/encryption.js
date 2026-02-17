/**
 * @fileoverview Encryption utilities for the OnHyper Dev browser extension.
 * 
 * This module provides secure AES-256-GCM encryption for API keys using the
 * Web Crypto API. Keys are encrypted with a user-provided password using
 * PBKDF2 for key derivation with 100,000 iterations (OWASP recommended minimum).
 * 
 * The encryption flow:
 * 1. Generate random salt (16 bytes) and IV (12 bytes)
 * 2. Derive encryption key from password using PBKDF2-SHA256
 * 3. Encrypt plaintext with AES-256-GCM
 * 4. Store salt, IV, and ciphertext (all base64 encoded)
 * 
 * @module lib/encryption
 * @requires crypto.subtle (Web Crypto API)
 * 
 * @example
 * // Encrypt an API key with a password
 * const { salt, iv, ciphertext } = await encryptWithPassword('sk-xxxx', userPassword);
 * 
 * // Store the encrypted data
 * await saveKey('openai', { salt, iv, ciphertext });
 * 
 * // Later, decrypt with the same password
 * const decrypted = await decryptWithPassword(ciphertext, iv, salt, userPassword);
 */

/**
 * Generates a cryptographically secure random salt for key derivation.
 * 
 * The salt ensures that the same password produces different encryption keys,
 * protecting against rainbow table attacks.
 * 
 * @returns {Uint8Array} 16-byte random salt
 * 
 * @example
 * const salt = generateSalt();
 * // Uint8Array(16) [42, 157, 23, ...]
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generates a cryptographically secure random initialization vector (IV).
 * 
 * AES-GCM requires a 12-byte IV for optimal security and performance.
 * Each encryption operation should use a unique IV.
 * 
 * @returns {Uint8Array} 12-byte random IV (recommended size for AES-GCM)
 * 
 * @example
 * const iv = generateIV();
 * // Uint8Array(12) [183, 42, 7, ...]
 */
export function generateIV() {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Derives an AES-256 encryption key from a password using PBKDF2.
 * 
 * Uses 100,000 iterations of SHA-256 as recommended by OWASP.
 * The derived key is not extractable and can only be used for encryption/decryption.
 * 
 * @param {string} password - The user's password (any length, typically 8+ chars recommended)
 * @param {Uint8Array} salt - The salt for key derivation (16 bytes from generateSalt)
 * @returns {Promise<CryptoKey>} The derived AES-256-GCM encryption key
 * @throws {Error} If password cannot be encoded or key derivation fails
 * 
 * @example
 * const salt = generateSalt();
 * const key = await deriveKey('my-secure-password', salt);
 * // Use key for encrypt() and decrypt()
 */
export async function deriveKey(password, salt) {
  // First, import the password as a raw key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000, // OWASP recommended minimum
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * 
 * AES-GCM provides both confidentiality and authenticity (AEAD).
 * The authentication tag is automatically appended to the ciphertext.
 * 
 * @param {string} plaintext - The text to encrypt (e.g., an API key)
 * @param {CryptoKey} key - The encryption key from deriveKey()
 * @param {Uint8Array} [iv] - Optional IV (generates random 12-byte IV if not provided)
 * @returns {Promise<{iv: Uint8Array, ciphertext: Uint8Array}>} Object containing IV and ciphertext
 * @throws {Error} If encryption fails (e.g., invalid key or data)
 * 
 * @example
 * const key = await deriveKey(password, salt);
 * const { iv, ciphertext } = await encrypt('sk-secret-key', key);
 * // Store both iv and ciphertext for later decryption
 */
export async function encrypt(plaintext, key, iv) {
  const actualIV = iv || generateIV();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: actualIV },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    iv: actualIV,
    ciphertext: new Uint8Array(ciphertext)
  };
}

/**
 * Decrypts ciphertext using AES-256-GCM.
 * 
 * Verifies the authentication tag automatically. If decryption fails,
 * it typically means the wrong key, IV, or corrupted ciphertext was used.
 * 
 * @param {Uint8Array} ciphertext - The encrypted data (including auth tag)
 * @param {Uint8Array} iv - The IV used during encryption (12 bytes)
 * @param {CryptoKey} key - The decryption key (must be same key derived from password)
 * @returns {Promise<string>} The decrypted plaintext
 * @throws {Error} If decryption fails (wrong key, wrong IV, or data corrupted)
 * 
 * @example
 * const key = await deriveKey(password, salt);
 * const plaintext = await decrypt(ciphertext, iv, key);
 * console.log(plaintext); // 'sk-secret-key'
 */
export async function decrypt(ciphertext, iv, key) {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}

/**
 * Convenience function to encrypt plaintext with just a password.
 * 
 * Handles salt generation, key derivation, and encryption in one call.
 * Returns all data needed for later decryption.
 * 
 * @param {string} plaintext - The text to encrypt (e.g., an API key)
 * @param {string} password - The user's password for encryption
 * @returns {Promise<{salt: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array}>}
 *   Object containing all data needed for decryption - store all three values
 * @throws {Error} If encryption fails
 * 
 * @example
 * // One-step encryption
 * const encrypted = await encryptWithPassword('sk-xxxxx', 'user-password');
 * 
 * // Store for later
 * await chrome.storage.local.set({ openai_key: encrypted });
 */
export async function encryptWithPassword(plaintext, password) {
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const { iv, ciphertext } = await encrypt(plaintext, key);
  return { salt, iv, ciphertext };
}

/**
 * Convenience function to decrypt ciphertext with just a password.
 * 
 * Derives the key from the password and salt, then decrypts the ciphertext.
 * 
 * @param {Uint8Array} ciphertext - The encrypted data
 * @param {Uint8Array} iv - The IV used during encryption
 * @param {Uint8Array} salt - The salt used for key derivation
 * @param {string} password - The user's password
 * @returns {Promise<string>} The decrypted plaintext
 * @throws {Error} If decryption fails (wrong password, corrupted data, or tampering detected)
 * 
 * @example
 * // One-step decryption
 * const plaintext = await decryptWithPassword(
 *   encrypted.ciphertext,
 *   encrypted.iv,
 *   encrypted.salt,
 *   'user-password'
 * );
 */
export async function decryptWithPassword(ciphertext, iv, salt, password) {
  const key = await deriveKey(password, salt);
  return decrypt(ciphertext, iv, key);
}

/**
 * Converts binary data to a base64-encoded string for storage.
 * 
 * Base64 encoding is necessary because chrome.storage cannot store binary data.
 * 
 * @param {Uint8Array} data - Binary data to encode
 * @returns {string} Base64-encoded string (ASCII-safe)
 * 
 * @example
 * const salt = generateSalt();
 * const base64Salt = toBase64(salt);
 * // 'k5fH2...' (can be stored as string)
 */
export function toBase64(data) {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Converts a base64-encoded string back to binary data.
 * 
 * @param {string} base64 - Base64-encoded string from toBase64()
 * @returns {Uint8Array} Binary data ready for decryption
 * 
 * @example
 * const storedSalt = 'k5fH2...'; // from storage
 * const salt = fromBase64(storedSalt);
 * // Uint8Array(16) ready for decryption
 */
export function fromBase64(base64) {
  const binary = atob(base64);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i);
  }
  return data;
}

/**
 * Serializes encrypted data to a JSON string for storage.
 * 
 * Converts all binary fields (salt, IV, ciphertext) to base64 strings,
 * making the data JSON-serializable for chrome.storage.
 * 
 * @param {Object} encryptedData - The encrypted data object
 * @param {Uint8Array} encryptedData.salt - Salt from encryption
 * @param {Uint8Array} encryptedData.iv - IV from encryption
 * @param {Uint8Array} encryptedData.ciphertext - Ciphertext from encryption
 * @returns {string} JSON string with base64-encoded fields
 * 
 * @example
 * const encrypted = await encryptWithPassword(key, password);
 * const serialized = serializeEncryptedData(encrypted);
 * await saveKey('openai', { serialized });
 * // OR
 * localStorage.setItem('key', serialized);
 */
export function serializeEncryptedData({ salt, iv, ciphertext }) {
  return JSON.stringify({
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext)
  });
}

/**
 * Deserializes encrypted data from a JSON string.
 * 
 * Reverses serializeEncryptedData, converting base64 strings back to
 * Uint8Arrays ready for decryption.
 * 
 * @param {string} serialized - JSON string from serializeEncryptedData
 * @returns {{salt: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array}}
 *   Object with binary fields ready for decryptWithPassword
 * @throws {SyntaxError} If serialized string is not valid JSON
 * 
 * @example
 * const serialized = await getKey('openai');
 * const encrypted = deserializeEncryptedData(serialized);
 * const decrypted = await decryptWithPassword(
 *   encrypted.ciphertext,
 *   encrypted.iv,
 *   encrypted.salt,
 *   password
 * );
 */
export function deserializeEncryptedData(serialized) {
  const { salt, iv, ciphertext } = JSON.parse(serialized);
  return {
    salt: fromBase64(salt),
    iv: fromBase64(iv),
    ciphertext: fromBase64(ciphertext)
  };
}