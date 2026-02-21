/**
 * SQLite Database Setup for OnHyper.io
 * 
 * Handles structured data storage with ACID guarantees:
 * - Users and authentication data
 * - Encrypted API secrets
 * - Published apps metadata
 * - API keys for programmatic access
 * - Usage tracking and analytics
 * - Waitlist and lead management
 * 
 * ## Architecture
 * 
 * SQLite is chosen for:
 * - Zero-config embedded database
 * - Full ACID transactions
 * - Complex queries with JOINs
 * - Reliable persistence
 * - Easy backup (single file)
 * 
 * For high-performance content serving, see `lmdb.ts`.
 * 
 * ## Schema Overview
 * 
 * ```
 * users ─┬─< secrets (user's API keys, encrypted)
 *        ├─< apps (published applications)
 *        ├─< api_keys (programmatic access tokens)
 *        └─< subdomain_reservations (owned subdomains)
 * 
 * apps ───< usage (API call tracking)
 *        └─< subdomain_reservations (linked subdomains)
 * 
 * waitlist_entries ───< waitlist_referrals
 * ```
 * 
 * ## Initialization
 * 
 * ```typescript
 * import { initDatabase, getDatabase } from './lib/db.js';
 * 
 * // Call once at startup
 * initDatabase();
 * 
 * // Get instance for queries
 * const db = getDatabase();
 * const users = db.prepare('SELECT * FROM users').all();
 * ```
 * 
 * @module lib/db
 */

import Database from 'better-sqlite3';
import { config } from '../config.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

let db: Database.Database | null = null;
let testMode = false;

/**
 * Enable test mode - uses in-memory database and allows resetting
 * Must be called before initDatabase()
 */
export function enableTestMode(): void {
  testMode = true;
}

/**
 * Reset the database connection (for testing)
 * Closes existing connection and allows re-initialization
 */
export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Initialize the SQLite database
 * Creates tables if they don't exist
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // In test mode, use in-memory database
  const dbPath = testMode ? ':memory:' : config.sqlitePath;
  
  // Ensure data directory exists (skip for in-memory)
  if (!testMode && dbPath !== ':memory:') {
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
  }

  db = new Database(dbPath);
  
  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  
  // Create tables
  createTables(db);
  
  return db;
}

/**
 * Get the database instance
 * Throws if database not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Create all required tables
 */
function createTables(db: Database.Database): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'FREE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // Encrypted secrets (API keys)
  db.exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value_encrypted TEXT NOT NULL,
      iv TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_secrets_user ON secrets(user_id);
  `);

  // API keys for programmatic access
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
  `);

  // Published apps
  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      html TEXT,
      css TEXT,
      js TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_apps_user ON apps(user_id);
    CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
  `);

  // Migration: Add subdomain columns to apps table if they don't exist
  migrateAppsTable(db);

  // Usage tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id TEXT PRIMARY KEY,
      api_key_id TEXT,
      app_id TEXT,
      endpoint TEXT NOT NULL,
      status INTEGER,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_usage_api_key ON usage(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_usage_app ON usage(app_id);
    CREATE INDEX IF NOT EXISTS idx_usage_created ON usage(created_at);
  `);

  // Waitlist entries
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist_entries (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      referral_code TEXT UNIQUE NOT NULL,
      
      -- Qualification answers
      question_what_building TEXT NOT NULL,
      question_project_link TEXT,
      question_apis_used TEXT,
      question_referral_source TEXT DEFAULT '',
      
      -- Scoring
      auto_score INTEGER DEFAULT 0,
      manual_score INTEGER,
      final_score INTEGER,
      
      -- Status
      status TEXT DEFAULT 'pending',
      
      -- Position tracking
      position INTEGER,
      referral_count INTEGER DEFAULT 0,
      position_boost INTEGER DEFAULT 0,
      referred_by TEXT,
      
      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      rejected_at DATETIME,
      
      FOREIGN KEY (referred_by) REFERENCES waitlist_entries(id)
    );

    CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_entries(email);
    CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);
    CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist_entries(position);
    CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON waitlist_entries(referral_code);
  `);

  // Waitlist referrals
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist_referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referral_email TEXT NOT NULL,
      position_boost INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (referrer_id) REFERENCES waitlist_entries(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON waitlist_referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_email ON waitlist_referrals(referral_email);
  `);

  // Invite codes
  db.exec(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      tier TEXT NOT NULL DEFAULT 'access',
      created_by TEXT,
      used_by TEXT,
      is_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME,
      
      FOREIGN KEY (created_by) REFERENCES waitlist_entries(id) ON DELETE SET NULL,
      FOREIGN KEY (used_by) REFERENCES waitlist_entries(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
    CREATE INDEX IF NOT EXISTS idx_invite_codes_tier ON invite_codes(tier);
  `);

  // Chat leads (captured from support chat)
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_leads_session ON leads(session_id);
    CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
  `);

  // Subdomain reservations (track subdomain ownership)
  db.exec(`
    CREATE TABLE IF NOT EXISTS subdomain_reservations (
      subdomain TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      app_id TEXT,
      claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_subdomain_reservations_owner ON subdomain_reservations(owner_id);
  `);

  // User settings (for self-API and other preferences)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      onhyper_api_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Per-app analytics (views and API calls)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_analytics (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      endpoint TEXT,
      referrer TEXT,
      user_agent TEXT,
      ip_hash TEXT,
      status INTEGER,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_app_analytics_app ON app_analytics(app_id);
    CREATE INDEX IF NOT EXISTS idx_app_analytics_event ON app_analytics(event_type);
    CREATE INDEX IF NOT EXISTS idx_app_analytics_created ON app_analytics(created_at);
  `);

  // App analytics summary (daily aggregates for fast queries)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_analytics_daily (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      date TEXT NOT NULL,
      view_count INTEGER DEFAULT 0,
      api_call_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      avg_duration INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
      UNIQUE(app_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_app_analytics_daily_app ON app_analytics_daily(app_id);
    CREATE INDEX IF NOT EXISTS idx_app_analytics_daily_date ON app_analytics_daily(date);
  `);

  // Custom secrets (user-defined API backends with configurable auth)
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_secrets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      auth_header TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_custom_secrets_user ON custom_secrets(user_id);
    CREATE INDEX IF NOT EXISTS idx_custom_secrets_name ON custom_secrets(user_id, name);
  `);

  // Audit logs for tracking user actions and security events
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
  `);

  // Feature flags for controlling feature availability
  db.exec(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      rollout_percentage INTEGER DEFAULT 100,
      min_plan_tier TEXT DEFAULT 'FREE',
      custom_rules TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
  `);

  // Per-user feature flag overrides
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_feature_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      feature_name TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      reason TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (feature_name) REFERENCES feature_flags(name) ON DELETE CASCADE,
      UNIQUE(user_id, feature_name)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_feature_overrides_user_feature ON user_feature_overrides(user_id, feature_name);
    CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_user ON user_feature_overrides(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_feature ON user_feature_overrides(feature_name);
  `);
}

/**
 * Migrate apps table to add subdomain columns
 * SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS,
 * so we check for column existence first.
 * Also, SQLite doesn't allow UNIQUE on ALTER TABLE ADD COLUMN,
 * so we create a separate unique index.
 */
function migrateAppsTable(db: Database.Database): void {
  // Get current table info
  const tableInfo = db.prepare('PRAGMA table_info(apps)').all() as { name: string }[];
  const existingColumns = new Set(tableInfo.map(col => col.name));

  // Add subdomain column if missing (without UNIQUE - will add index separately)
  if (!existingColumns.has('subdomain')) {
    db.exec(`ALTER TABLE apps ADD COLUMN subdomain TEXT`);
  }

  // Add subdomain_claimed_at column if missing
  if (!existingColumns.has('subdomain_claimed_at')) {
    db.exec(`ALTER TABLE apps ADD COLUMN subdomain_claimed_at DATETIME`);
  }

  // Add subdomain_owner_id column if missing
  if (!existingColumns.has('subdomain_owner_id')) {
    db.exec(`ALTER TABLE apps ADD COLUMN subdomain_owner_id TEXT`);
  }

  // Create unique index on subdomain if not exists
  // This ensures subdomains are unique across all apps
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_subdomain ON apps(subdomain) WHERE subdomain IS NOT NULL`);

  // Password reset tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
    CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
  `);
}

// Type exports
export interface User {
  id: string;
  email: string;
  password_hash: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface Secret {
  id: string;
  user_id: string;
  name: string;
  value_encrypted: string;
  iv: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key: string;
  plan: string;
  created_at: string;
}

export interface App {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  html: string | null;
  css: string | null;
  js: string | null;
  created_at: string;
  updated_at: string;
  subdomain: string | null;
  subdomain_claimed_at: string | null;
  subdomain_owner_id: string | null;
}

export interface UsageRecord {
  id: string;
  api_key_id: string | null;
  app_id: string | null;
  endpoint: string;
  status: number | null;
  duration: number | null;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  referral_code: string;
  question_what_building: string;
  question_project_link: string | null;
  question_apis_used: string | null;
  question_referral_source: string;
  auto_score: number;
  manual_score: number | null;
  final_score: number | null;
  status: 'pending' | 'approved' | 'rejected';
  position: number | null;
  referral_count: number;
  position_boost: number;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

export interface WaitlistReferral {
  id: string;
  referrer_id: string;
  referral_email: string;
  position_boost: number;
  created_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  tier: 'founding' | 'early' | 'access';
  created_by: string | null;
  used_by: string | null;
  is_used: number;
  created_at: string;
  used_at: string | null;
}

export interface Lead {
  id: number;
  email: string;
  session_id: string | null;
  created_at: string;
}

export interface SubdomainReservation {
  subdomain: string;
  owner_id: string;
  app_id: string | null;
  claimed_at: string;
}

export interface UserSettings {
  user_id: string;
  onhyper_api_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface AppAnalyticsEvent {
  id: string;
  app_id: string;
  event_type: 'view' | 'api_call';
  endpoint: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  status: number | null;
  duration: number | null;
  created_at: string;
}

export interface AppAnalyticsDaily {
  id: string;
  app_id: string;
  date: string;
  view_count: number;
  api_call_count: number;
  error_count: number;
  avg_duration: number;
  updated_at: string;
}

export interface CustomSecret {
  id: string;
  user_id: string;
  name: string;
  base_url: string;
  api_key: string;  // Encrypted in storage, decrypted on retrieval
  auth_type: 'bearer' | 'custom';
  auth_header: string | null;  // For custom auth, e.g., 'X-API-Key'
  created_at: string;
}

// User settings helper functions
export function getUserSettings(userId: string): UserSettings | null {
  const stmt = db!.prepare('SELECT * FROM user_settings WHERE user_id = ?');
  const row = stmt.get(userId) as UserSettings | undefined;
  return row || null;
}

export function setUserSettings(userId: string, settings: Partial<UserSettings>): void {
  const stmt = db!.prepare(`
    INSERT INTO user_settings (user_id, onhyper_api_enabled, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      onhyper_api_enabled = excluded.onhyper_api_enabled,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(userId, settings.onhyper_api_enabled ? 1 : 0);
}

export interface PasswordReset {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;  // JSON string
  ip_address: string | null;
  user_agent: string | null;
  created_at: number;  // milliseconds since epoch
}

export interface AuditEventParams {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event to the audit_logs table
 * 
 * @param params - Audit event parameters
 * @param params.userId - ID of the user performing the action
 * @param params.action - Action type (e.g., 'login', 'app_create', 'secret_delete')
 * @param params.resourceType - Type of resource affected (e.g., 'app', 'secret', 'session')
 * @param params.resourceId - ID of the affected resource
 * @param params.details - Additional metadata (stored as JSON)
 * @param params.ipAddress - Client IP address
 * @param params.userAgent - Client user agent string
 */
export function logAuditEvent(params: AuditEventParams): void {
  const stmt = db!.prepare(`
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const created_at = Date.now();
  const detailsJson = params.details ? JSON.stringify(params.details) : null;
  
  stmt.run(
    params.userId,
    params.action,
    params.resourceType || null,
    params.resourceId || null,
    detailsJson,
    params.ipAddress || null,
    params.userAgent || null,
    created_at
  );
}

/**
 * Get audit logs for a user, ordered by most recent first
 * 
 * @param userId - User ID to fetch logs for
 * @param limit - Maximum number of logs to return (default 100)
 * @param offset - Number of logs to skip (for pagination)
 */
export function getAuditLogs(userId: string, limit: number = 100, offset: number = 0): AuditLog[] {
  const stmt = db!.prepare(`
    SELECT * FROM audit_logs 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `);
  return stmt.all(userId, limit, offset) as AuditLog[];
}

/**
 * Get audit logs for a specific resource
 * 
 * @param resourceType - Type of resource (e.g., 'app', 'secret')
 * @param resourceId - ID of the resource
 * @param limit - Maximum number of logs to return
 */
export function getResourceAuditLogs(resourceType: string, resourceId: string, limit: number = 100): AuditLog[] {
  const stmt = db!.prepare(`
    SELECT * FROM audit_logs 
    WHERE resource_type = ? AND resource_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  return stmt.all(resourceType, resourceId, limit) as AuditLog[];
}

// Feature flag types
export interface FeatureFlag {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  enabled: number;  // 0 or 1 (SQLite boolean)
  rollout_percentage: number;
  min_plan_tier: string;
  custom_rules: string | null;  // JSON string
  created_at: string;
  updated_at: string;
}

export interface UserFeatureOverride {
  id: number;
  user_id: string;
  feature_name: string;
  enabled: number;  // 0 or 1 (SQLite boolean)
  reason: string | null;
  expires_at: string | null;
  created_at: string;
}