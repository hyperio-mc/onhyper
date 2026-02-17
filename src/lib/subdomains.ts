/**
 * Subdomain Management Library for OnHyper.io
 * 
 * Handles subdomain validation, reservation, and ownership tracking.
 * Each user can claim a unique subdomain for their published app.
 * 
 * ## Features
 * 
 * - Reserved subdomain protection (www, api, admin, etc.)
 * - Format validation (3-63 chars, lowercase, no leading/trailing hyphens)
 * - Ownership tracking via subdomain_reservations table
 * - Claim/release lifecycle management
 * 
 * ## Usage
 * 
 * ```typescript
 * import { validateSubdomain, claimSubdomain, isReserved } from './lib/subdomains.js';
 * 
 * // Check if subdomain is reserved
 * if (isReserved('api')) {
 *   console.log('Cannot claim reserved subdomain');
 * }
 * 
 * // Validate format
 * const validation = validateSubdomain('my-app');
 * if (!validation.valid) {
 *   console.error(validation.error);
 * }
 * 
 * // Claim subdomain
 * const result = await claimSubdomain(userId, 'my-app');
 * if (result.success) {
 *   console.log('Subdomain claimed!');
 * }
 * ```
 * 
 * @module lib/subdomains
 */

import { getDatabase } from './db.js';

/**
 * Reserved subdomains that cannot be claimed by users.
 * These are system/administrative subdomains that serve infrastructure purposes.
 * 
 * List of ~50 reserved subdomains organized by category.
 */
export const RESERVED_SUBDOMAINS: readonly string[] = [
  // Web/mail infrastructure
  'www', 'mail', 'email', 'smtp', 'pop', 'imap', 'pop3',
  
  // API endpoints
  'api', 'api-v1', 'api-v2', 'graphql', 'rest',
  
  // Admin/control panels
  'admin', 'dashboard', 'console', 'panel', 'control',
  
  // Environment/deployment
  'app', 'apps', 'staging', 'dev', 'test', 'demo',
  
  // Content/documentation
  'blog', 'docs', 'help', 'support', 'status',
  
  // Static assets/CDN
  'cdn', 'static', 'assets', 'media', 'img', 'images',
  
  // Authentication
  'auth', 'login', 'logout', 'signup', 'register',
  
  // Database services
  'db', 'database', 'mysql', 'postgres', 'mongo', 'redis',
  
  // DNS/protocol services
  'ns', 'dns', 'mx', 'txt', 'srv', 'ftp', 'sftp', 'ssh',
] as const;

/**
 * Subdomain validation result
 */
export interface ValidationResult {
  /** Whether the subdomain is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Subdomain claim result
 */
export interface ClaimResult {
  /** Whether the claim was successful */
  success: boolean;
  /** Error message if claim failed */
  error?: string;
}

/**
 * Check if a subdomain is in the reserved list.
 * Case-insensitive comparison against RESERVED_SUBDOMAINS.
 * 
 * @param subdomain - The subdomain to check
 * @returns true if the subdomain is reserved, false otherwise
 * 
 * @example
 * ```typescript
 * isReserved('api');     // true - reserved
 * isReserved('API');     // true - case-insensitive
 * isReserved('my-app');  // false - not reserved
 * ```
 */
export function isReserved(subdomain: string): boolean {
  const normalized = subdomain.toLowerCase();
  return RESERVED_SUBDOMAINS.includes(normalized);
}

/**
 * Validate a subdomain against format rules.
 * 
 * Rules:
 * - 3-63 characters in length
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start or end with a hyphen
 * - No consecutive hyphens
 * - Must match regex: ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
 * 
 * Note: This only validates the format. Use isReserved() to check if
 * the subdomain is in the reserved list.
 * 
 * @param subdomain - The subdomain to validate
 * @returns ValidationResult with valid flag and optional error message
 * 
 * @example
 * ```typescript
 * validateSubdomain('my-app');     // { valid: true }
 * validateSubdomain('ab');         // { valid: false, error: 'Subdomain must be 3-63 characters' }
 * validateSubdomain('-invalid');   // { valid: false, error: 'Subdomain cannot start with hyphen' }
 * validateSubdomain('My-App');      // { valid: false, error: 'Subdomain must be lowercase' }
 * ```
 */
export function validateSubdomain(subdomain: string): ValidationResult {
  // Check length
  if (subdomain.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters' };
  }
  if (subdomain.length > 63) {
    return { valid: false, error: 'Subdomain must be at most 63 characters' };
  }
  
  // Check for uppercase letters
  if (subdomain !== subdomain.toLowerCase()) {
    return { valid: false, error: 'Subdomain must be lowercase letters, numbers, and hyphens only' };
  }
  
  // Check for invalid characters
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return { valid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
  }
  
  // Check for leading hyphen
  if (subdomain.startsWith('-')) {
    return { valid: false, error: 'Subdomain cannot start with a hyphen' };
  }
  
  // Check for trailing hyphen
  if (subdomain.endsWith('-')) {
    return { valid: false, error: 'Subdomain cannot end with a hyphen' };
  }
  
  // Check for consecutive hyphens
  if (subdomain.includes('--')) {
    return { valid: false, error: 'Subdomain cannot contain consecutive hyphens' };
  }
  
  // Final regex validation (combines all rules)
  // Note: We already checked length >= 3, so this regex works
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    return { valid: false, error: 'Subdomain format is invalid' };
  }
  
  return { valid: true };
}

/**
 * Check if a subdomain is available for claiming.
 * Queries the subdomain_reservations table to check if anyone has claimed it.
 * 
 * Note: This does not check if the subdomain is reserved. Use isReserved() first.
 * 
 * @param subdomain - The subdomain to check (should be lowercase)
 * @returns Promise resolving to true if available, false if already claimed
 * 
 * @example
 * ```typescript
 * const available = await isSubdomainAvailable('my-app');
 * if (available) {
 *   console.log('Subdomain is free to claim!');
 * }
 * ```
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  const db = getDatabase();
  
  const result = db.prepare(`
    SELECT subdomain FROM subdomain_reservations WHERE subdomain = ?
  `).get(subdomain.toLowerCase());
  
  return result === undefined;
}

/**
 * Claim a subdomain for a user.
 * 
 * Performs the following checks:
 * 1. Validates subdomain format
 * 2. Checks if subdomain is reserved
 * 3. Checks if subdomain is already claimed
 * 4. Inserts reservation record
 * 
 * @param userId - The user ID claiming the subdomain
 * @param subdomain - The subdomain to claim
 * @param appId - Optional app ID to associate with the subdomain
 * @returns Promise resolving to ClaimResult with success flag and optional error
 * 
 * @example
 * ```typescript
 * const result = await claimSubdomain('user-123', 'my-app');
 * if (result.success) {
 *   console.log('Subdomain claimed successfully!');
 * } else {
 *   console.error('Failed to claim:', result.error);
 * }
 * ```
 */
export async function claimSubdomain(
  userId: string,
  subdomain: string,
  appId?: string
): Promise<ClaimResult> {
  // Normalize subdomain to lowercase
  const normalizedSubdomain = subdomain.toLowerCase();
  
  // 1. Validate subdomain format
  const validation = validateSubdomain(normalizedSubdomain);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  // 2. Check if reserved
  if (isReserved(normalizedSubdomain)) {
    return { success: false, error: 'This subdomain is reserved and cannot be claimed' };
  }
  
  // 3. Check availability
  const available = await isSubdomainAvailable(normalizedSubdomain);
  if (!available) {
    return { success: false, error: 'This subdomain is already claimed by another user' };
  }
  
  // 4. Insert reservation
  const db = getDatabase();
  
  try {
    db.prepare(`
      INSERT INTO subdomain_reservations (subdomain, owner_id, app_id)
      VALUES (?, ?, ?)
    `).run(normalizedSubdomain, userId, appId || null);
    
    return { success: true };
  } catch (error) {
    // Handle UNIQUE constraint violation (race condition)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'This subdomain was just claimed by another user' };
    }
    throw error;
  }
}

/**
 * Get the owner ID of a subdomain.
 * 
 * @param subdomain - The subdomain to query
 * @returns Promise resolving to owner ID if claimed, null if available
 * 
 * @example
 * ```typescript
 * const ownerId = await getSubdomainOwner('my-app');
 * if (ownerId) {
 *   console.log('Owned by:', ownerId);
 * } else {
 *   console.log('Subdomain is available');
 * }
 * ```
 */
export async function getSubdomainOwner(subdomain: string): Promise<string | null> {
  const db = getDatabase();
  
  const result = db.prepare(`
    SELECT owner_id FROM subdomain_reservations WHERE subdomain = ?
  `).get(subdomain.toLowerCase()) as { owner_id: string } | undefined;
  
  return result?.owner_id ?? null;
}

/**
 * Release a subdomain back to the pool.
 * Only the owner can release their subdomain.
 * 
 * @param userId - The user ID attempting to release
 * @param subdomain - The subdomain to release
 * @returns Promise resolving to true if released, false if not owned or doesn't exist
 * 
 * @example
 * ```typescript
 * const released = await releaseSubdomain('user-123', 'my-app');
 * if (released) {
 *   console.log('Subdomain released successfully');
 * } else {
 *   console.log('Could not release (not owner or not found)');
 * }
 * ```
 */
export async function releaseSubdomain(userId: string, subdomain: string): Promise<boolean> {
  const db = getDatabase();
  
  // Verify ownership first (DELETE returns 0 rows affected if not owner)
  const result = db.prepare(`
    DELETE FROM subdomain_reservations 
    WHERE subdomain = ? AND owner_id = ?
  `).run(subdomain.toLowerCase(), userId);
  
  // Check if any row was deleted
  return result.changes > 0;
}

/**
 * Subdomain with associated app info
 */
export interface SubdomainWithApp {
  subdomain: string;
  app_id: string | null;
  app_name: string | null;
  claimed_at: string;
}

/**
 * Get all subdomains owned by a user with optional app association.
 * 
 * @param userId - The user ID to query
 * @returns Promise resolving to array of subdomain objects with app info (most recently claimed first)
 * 
 * @example
 * ```typescript
 * const subdomains = await getUserSubdomains('user-123');
 * console.log('User owns:', subdomains); 
 * // [{ subdomain: 'my-app', app_id: 'abc', app_name: 'My Cool App', claimed_at: '...' }]
 * ```
 */
export async function getUserSubdomains(userId: string): Promise<SubdomainWithApp[]> {
  const db = getDatabase();
  
  const results = db.prepare(`
    SELECT 
      sr.subdomain, 
      sr.app_id, 
      sr.claimed_at,
      a.name as app_name
    FROM subdomain_reservations sr
    LEFT JOIN apps a ON sr.app_id = a.id
    WHERE sr.owner_id = ? 
    ORDER BY sr.claimed_at DESC
  `).all(userId) as { subdomain: string; app_id: string | null; claimed_at: string; app_name: string | null }[];
  
  return results.map(row => ({
    subdomain: row.subdomain,
    app_id: row.app_id,
    app_name: row.app_name,
    claimed_at: row.claimed_at,
  }));
}

/**
 * Check if a subdomain can be claimed by a user.
 * Combines validation, reserved check, and availability check.
 * 
 * @param subdomain - The subdomain to check
 * @returns Promise resolving to ValidationResult with error details
 * 
 * @example
 * ```typescript
 * const result = await canClaimSubdomain('my-app');
 * if (result.valid) {
 *   console.log('Subdomain can be claimed!');
 * } else {
 *   console.error('Cannot claim:', result.error);
 * }
 * ```
 */
export async function canClaimSubdomain(subdomain: string): Promise<ValidationResult> {
  const normalizedSubdomain = subdomain.toLowerCase();
  
  // Check format
  const validation = validateSubdomain(normalizedSubdomain);
  if (!validation.valid) {
    return validation;
  }
  
  // Check if reserved
  if (isReserved(normalizedSubdomain)) {
    return { valid: false, error: 'This subdomain is reserved and cannot be claimed' };
  }
  
  // Check availability
  const available = await isSubdomainAvailable(normalizedSubdomain);
  if (!available) {
    return { valid: false, error: 'This subdomain is already claimed' };
  }
  
  return { valid: true };
}