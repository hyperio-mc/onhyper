/**
 * Secrets Management for OnHyper.io
 * 
 * High-level API for storing and retrieving encrypted user secrets.
 * Wraps the encryption module with database operations.
 * 
 * ## Design Principles
 * 
 * 1. **Never return plaintext**: Values are shown exactly once during creation.
 * 2. **Normalize names**: All names converted to `SCOUT_API_KEY` format.
 * 3. **Per-secret encryption**: Each secret has unique salt for key derivation.
 * 4. **Ownership scoping**: Secrets are scoped to user IDs.
 * 
 * ## Usage Flow
 * 
 * ```typescript
 * import { storeSecret, getSecretValue, listSecrets, deleteSecret } from './lib/secrets.js';
 * 
 * // User adds a new API key
 * await storeSecret('user-uuid', 'SCOUT_API_KEY', 'sk-ant-api03-xxxxx');
 * // → { id: "secret-uuid", name: "SCOUT_API_KEY", masked: "••••••••" }
 * 
 * // During proxy request, retrieve the decrypted value
 * const apiKey = getSecretValue('user-uuid', 'SCOUT_API_KEY');
 * // → "sk-ant-api03-xxxxx" or null if not found
 * 
 * // List secrets for dashboard (values always masked)
 * const secrets = listSecrets('user-uuid');
 * // → [{ id, name, masked: "••••••••", created_at }]
 * 
 * // Check if secret exists before proxying
 * if (hasSecret('user-uuid', 'SCOUT_API_KEY')) {
 *   // Safe to proxy
 * }
 * 
 * // Delete a secret
 * deleteSecret('user-uuid', 'SCOUT_API_KEY');
 * ```
 * 
 * ## Security Considerations
 * 
 * - Values are encrypted with AES-256-GCM before database storage
 * - Each secret gets a unique random salt
 * - Decryption happens only in-memory during proxy requests
 * - Values are never logged or returned in API responses
 * 
 * ## Integration Points
 * 
 * | Consumer | Usage |
 * |----------|-------|
 * | `routes/secrets.ts` | CRUD API for dashboard |
 * | `routes/proxy.ts` | Retrieves values for API calls |
 * | `lib/usage.ts` | Context for tracking |
 * 
 * @module lib/secrets
 */

import { randomUUID } from 'crypto';
import { getDatabase, Secret } from './db.js';
import { encrypt, decrypt, generateSalt } from './encryption.js';

/**
 * Store a new secret for a user
 * 
 * @param userId - The user's ID
 * @param name - The secret name (e.g., "SCOUT_API_KEY")
 * @param value - The plaintext secret value
 * @returns The created secret record (without the plaintext value)
 */
export async function storeSecret(userId: string, name: string, value: string): Promise<Secret> {
  const db = getDatabase();
  
  // Normalize the name to uppercase with underscores
  const normalizedName = name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  
  // Check if secret already exists
  const existing = db.prepare('SELECT id FROM secrets WHERE user_id = ? AND name = ?')
    .get(userId, normalizedName);
  if (existing) {
    throw new Error(`Secret "${normalizedName}" already exists. Delete it first to update.`);
  }
  
  // Generate a per-user salt for encryption
  const salt = generateSalt();
  
  // Encrypt the secret value
  const { encrypted, iv } = encrypt(value, salt);
  
  // Store in database
  const id = randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO secrets (id, user_id, name, value_encrypted, iv, salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, normalizedName, encrypted, iv, salt, now, now);
  
  return {
    id,
    user_id: userId,
    name: normalizedName,
    value_encrypted: encrypted,
    iv,
    salt,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get a decrypted secret value by name
 * 
 * @param userId - The user's ID
 * @param name - The secret name
 * @returns The decrypted secret value, or null if not found
 */
export function getSecretValue(userId: string, name: string): string | null {
  const db = getDatabase();
  
  const secret = db.prepare('SELECT * FROM secrets WHERE user_id = ? AND name = ?')
    .get(userId, name.toUpperCase()) as Secret | undefined;
  
  if (!secret) {
    return null;
  }
  
  try {
    return decrypt(secret.value_encrypted, secret.iv, secret.salt);
  } catch (error) {
    console.error(`Failed to decrypt secret ${name} for user ${userId}:`, error);
    return null;
  }
}

/**
 * List all secrets for a user (with masked values)
 * 
 * @param userId - The user's ID
 * @returns Array of secrets with masked values
 */
export function listSecrets(userId: string): Array<{ id: string; name: string; masked: string; created_at: string }> {
  const db = getDatabase();
  
  const secrets = db.prepare('SELECT id, name, created_at FROM secrets WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Array<{ id: string; name: string; created_at: string }>;
  
  // Return with masked placeholder (we don't show actual values after creation)
  return secrets.map(s => ({
    id: s.id,
    name: s.name,
    masked: '••••••••••••••••',
    created_at: s.created_at,
  }));
}

/**
 * Check if a user has a specific secret configured
 */
export function hasSecret(userId: string, name: string): boolean {
  const db = getDatabase();
  const secret = db.prepare('SELECT id FROM secrets WHERE user_id = ? AND name = ?')
    .get(userId, name.toUpperCase());
  return !!secret;
}

/**
 * Delete a secret by name
 * 
 * @param userId - The user's ID
 * @param name - The secret name
 * @returns true if deleted, false if not found
 */
export function deleteSecret(userId: string, name: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM secrets WHERE user_id = ? AND name = ?')
    .run(userId, name.toUpperCase());
  return result.changes > 0;
}

/**
 * Get the count of secrets for a user
 */
export function getSecretCount(userId: string): number {
  const db = getDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM secrets WHERE user_id = ?')
    .get(userId) as { count: number };
  return result.count;
}

/**
 * Update an existing secret
 * Deletes and recreates the secret with a new encrypted value
 */
export async function updateSecret(userId: string, name: string, value: string): Promise<Secret> {
  const db = getDatabase();
  const normalizedName = name.toUpperCase();
  
  // Check if secret exists
  const existing = db.prepare('SELECT * FROM secrets WHERE user_id = ? AND name = ?')
    .get(userId, normalizedName) as Secret | undefined;
  
  if (!existing) {
    throw new Error(`Secret "${normalizedName}" not found`);
  }
  
  // Generate new salt and encrypt
  const salt = generateSalt();
  const { encrypted, iv } = encrypt(value, salt);
  
  // Update the record
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE secrets 
    SET value_encrypted = ?, iv = ?, salt = ?, updated_at = ?
    WHERE id = ?
  `).run(encrypted, iv, salt, now, existing.id);
  
  return {
    ...existing,
    value_encrypted: encrypted,
    iv,
    salt,
    updated_at: now,
  };
}