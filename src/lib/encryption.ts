/**
 * Encryption utilities for OnHyper.io
 * 
 * Implements AES-256-GCM encryption for storing user secrets securely.
 * Each secret is encrypted with a per-user salt for additional security.
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