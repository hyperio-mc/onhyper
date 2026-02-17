/**
 * Encryption utilities for browser extension
 * Uses Web Crypto API with AES-GCM for secure encryption
 */

/**
 * Generate a random salt for key derivation
 * @returns {Uint8Array} 16-byte random salt
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate a random IV for encryption
 * @returns {Uint8Array} 12-byte random IV (recommended for AES-GCM)
 */
export function generateIV() {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Derive an encryption key from a password using PBKDF2
 * @param {string} password - The user's password
 * @param {Uint8Array} salt - The salt for key derivation
 * @returns {Promise<CryptoKey>} The derived encryption key
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
 * Encrypt plaintext using AES-GCM
 * @param {string} plaintext - The text to encrypt
 * @param {CryptoKey} key - The encryption key
 * @param {Uint8Array} [iv] - Optional IV (generates random one if not provided)
 * @returns {Promise<{iv: Uint8Array, ciphertext: Uint8Array}>}
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
 * Decrypt ciphertext using AES-GCM
 * @param {Uint8Array} ciphertext - The encrypted data
 * @param {Uint8Array} iv - The IV used during encryption
 * @param {CryptoKey} key - The decryption key
 * @returns {Promise<string>} The decrypted plaintext
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
 * Encrypt plaintext with a password (convenience function)
 * Generates salt and IV internally, returns everything needed for decryption
 * @param {string} plaintext - The text to encrypt
 * @param {string} password - The user's password
 * @returns {Promise<{salt: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array}>}
 */
export async function encryptWithPassword(plaintext, password) {
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  const { iv, ciphertext } = await encrypt(plaintext, key);
  return { salt, iv, ciphertext };
}

/**
 * Decrypt ciphertext with a password (convenience function)
 * @param {Uint8Array} ciphertext - The encrypted data
 * @param {Uint8Array} iv - The IV used during encryption
 * @param {Uint8Array} salt - The salt used for key derivation
 * @param {string} password - The user's password
 * @returns {Promise<string>} The decrypted plaintext
 */
export async function decryptWithPassword(ciphertext, iv, salt, password) {
  const key = await deriveKey(password, salt);
  return decrypt(ciphertext, iv, key);
}

/**
 * Convert binary data to base64 string for storage
 * @param {Uint8Array} data - Binary data
 * @returns {string} Base64 encoded string
 */
export function toBase64(data) {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string back to binary data
 * @param {string} base64 - Base64 encoded string
 * @returns {Uint8Array} Binary data
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
 * Serialize encrypted data for storage
 * @param {Object} encryptedData - {salt, iv, ciphertext}
 * @returns {string} JSON string with base64 encoded binary fields
 */
export function serializeEncryptedData({ salt, iv, ciphertext }) {
  return JSON.stringify({
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext)
  });
}

/**
 * Deserialize encrypted data from storage
 * @param {string} serialized - JSON string from serializeEncryptedData
 * @returns {{salt: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array}}
 */
export function deserializeEncryptedData(serialized) {
  const { salt, iv, ciphertext } = JSON.parse(serialized);
  return {
    salt: fromBase64(salt),
    iv: fromBase64(iv),
    ciphertext: fromBase64(ciphertext)
  };
}