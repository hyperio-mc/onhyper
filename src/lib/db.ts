/**
 * SQLite Database Setup for OnHyper.io
 * 
 * Handles structured data: users, secrets, apps, API keys, usage tracking
 */

import Database from 'better-sqlite3';
import { config } from '../config.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database
 * Creates tables if they don't exist
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  const dbPath = config.sqlitePath;
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
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