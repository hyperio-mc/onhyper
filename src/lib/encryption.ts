/**
 * Encryption Utilities for OnHyper.io
 * 
 * Implements AES-256-GCM encryption for secure storage of user secrets.
 * Uses PBKDF2 for key derivation with per-secret salts.
 * 
 * ## Security Model
 * 
 * ```
 * Secret Storage Flow:
 * 
 * 1. Generate random 32-byte salt
 * 2. Derive 256-bit key using PBKDF2:
 *    - Input: Master Key (env) + Salt
 *    - Iterations: 100,000
 *    - Algorithm: SHA-256
 * 3. Generate random 16-byte IV
 * 4. Encrypt with AES-256-GCM:
 *    - Produces ciphertext + 16-byte auth tag
 * 5. Store: ciphertext + auth tag + IV + salt
 * ```
 * 
 * ## Why We Use Each Component
 * 
 * | Component | Purpose |
 * |-----------|---------|
 * | AES-256-GCM | Authenticated encryption (confidentiality + integrity) |
 * | PBKDF2 | Key stretching (makes brute-force expensive) |
 * | Per-secret salt | Same secret → different ciphertext |
 * | Random IV | Prevents pattern detection |
 * | Auth tag | Detects any tampering |
 * 
 * ## Usage
 * 
 * ```typescript
 * import { encrypt, decrypt, generateSalt, maskSecret } from './lib/encryption.js';
 * 
 * // Encrypt a secret
 * const salt = generateSalt();  // Store this
 * const { encrypted, iv } = encrypt('my-api-key', salt);
 * 
 * // Decrypt later
 * const plaintext = decrypt(encrypted, iv, salt);
 * 
 * // Show masked version in UI
 * const masked = maskSecret('sk-ant-api03-xxxx');  // "sk-ant-ap••••xxxx"
 * ```
 * 
 * ## Environment Configuration
 * 
 * Set `ONHYPER_MASTER_KEY` in production:
 * ```bash
 * # Generate a secure key
 * openssl rand -hex 32
 * 
 * # Set in environment
 * export ONHYPER_MASTER_KEY="your-64-character-hex-string"
 * ```
 * 
 * ⚠️ **Security Warning**: Never commit the master key to source control.
 * The default development key is intentionally insecure.
 * 
 * @module lib/encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash, pbkdf2Sync } from 'crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derive an encryption key from the master key and user salt
 * Uses PBKDF2 for key derivation
 */
function deriveKey(salt: Buffer): Buffer {
  return pbkdf2Sync(
    config.masterKey,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Generate a new salt for a user
 * Returns hex-encoded salt string
 */
export function generateSalt(): string {
  return randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Encrypt a secret value using AES-256-GCM
 * 
 * @param plaintext - The secret value to encrypt
 * @param saltHex - The user's salt (hex-encoded)
 * @returns Object containing encrypted value and IV (both hex-encoded)
 */
export function encrypt(plaintext: string, saltHex: string): { encrypted: string; iv: string } {
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the auth tag and append it to the encrypted data
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted + authTag.toString('hex'),
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypt a secret value using AES-256-GCM
 * 
 * @param encryptedHex - The encrypted value with auth tag (hex-encoded)
 * @param ivHex - The initialization vector (hex-encoded)
 * @param saltHex - The user's salt (hex-encoded)
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedHex: string, ivHex: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(salt);
  const iv = Buffer.from(ivHex, 'hex');
  
  // Split the encrypted data and auth tag
  // Auth tag is the last 16 bytes (32 hex chars)
  const authTagHex = encryptedHex.slice(-AUTH_TAG_LENGTH * 2);
  const encryptedData = encryptedHex.slice(0, -AUTH_TAG_LENGTH * 2);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash a value using SHA-256
 * Used for masking secrets in display
 */
export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/**
 * Mask a secret value for display
 * Shows first 8 characters + •••• + last 4 characters
 */
export function maskSecret(value: string): string {
  if (value.length <= 12) {
    return '••••••••';
  }
  return `${value.slice(0, 8)}••••${value.slice(-4)}`;
}