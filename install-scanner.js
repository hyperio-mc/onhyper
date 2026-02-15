#!/usr/bin/env node
/**
 * Install API Key Scanner into OnHyper database
 */

import Database from 'better-sqlite3';
import { open } from 'lmdb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const onhyperDir = __dirname;
const scannerDir = join(__dirname, '..', 'api-key-scanner');
const dbPath = join(onhyperDir, 'data', 'onhyper.db');
const lmdbPath = join(onhyperDir, 'data', 'onhyper.lmdb');

console.log('Installing API Key Scanner to OnHyper...\n');
console.log('Database:', dbPath);
console.log('LMDB:', lmdbPath);
console.log('');

// Read the scanner files (body-only HTML)
const html = readFileSync(join(scannerDir, 'scanner-body.html'), 'utf-8');
const css = '';
const js = ''; // JS is embedded in the HTML

console.log('Scanner files loaded:');
console.log('  - scanner-body.html:', html.length, 'bytes');
console.log('');

// Open databases
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const lmdb = open({
  path: lmdbPath,
  compression: true,
});

// Find a user to assign the app to (use the first test user)
const user = db.prepare('SELECT id, email FROM users LIMIT 1').get();
if (!user) {
  console.error('No users found in database. Create a user first.');
  process.exit(1);
}
console.log('Assigning to user:', user.email);

// Generate app ID and slug
const appId = '9b8c3d2e-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
const slug = 'api-key-scanner';
const name = 'API Key Security Scanner';
const now = new Date().toISOString();

// Check if app already exists
const existing = db.prepare('SELECT id FROM apps WHERE slug = ?').get(slug);
if (existing) {
  console.log('\nApp already exists with slug:', slug);
  console.log('Updating existing app...');
  
  // Update existing app
  db.prepare(`
    UPDATE apps 
    SET html = ?, css = ?, js = ?, updated_at = ?
    WHERE slug = ?
  `).run(html, css, js, now, slug);
  
  // Update LMDB content
  lmdb.put(`app:${existing.id}:content`, {
    appId: existing.id,
    html,
    css,
    js,
    updatedAt: now,
  });
  
  console.log('App updated successfully!');
  console.log('\n🌐 View your scanner at: http://localhost:3000/a/' + slug);
  process.exit(0);
}

// Insert into SQLite
console.log('\nCreating new app...');
db.prepare(`
  INSERT INTO apps (id, user_id, name, slug, html, css, js, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(appId, user.id, name, slug, html, css, js, now, now);

// Store content in LMDB
lmdb.put(`app:${appId}:content`, {
  appId,
  html,
  css,
  js,
  updatedAt: now,
});

// Store metadata in LMDB
lmdb.put(`app:${appId}:meta`, {
  appId,
  userId: user.id,
  name,
  slug,
});

// Add to user's app list
const userAppsKey = `user:${user.id}:apps`;
const existingApps = lmdb.get(userAppsKey) || [];
if (!existingApps.includes(appId)) {
  existingApps.push(appId);
  lmdb.put(userAppsKey, existingApps);
}

// Close connections
db.close();
lmdb.close();

console.log('\n✅ API Key Scanner installed successfully!');
console.log('\n📱 App Details:');
console.log('   ID:', appId);
console.log('   Name:', name);
console.log('   Slug:', slug);
console.log('   User:', user.email);
console.log('\n🌐 View your scanner at: http://localhost:3000/a/' + slug);
console.log('\nNext steps:');
console.log('1. Start the OnHyper server: npm run dev');
console.log('2. Open http://localhost:3000/a/' + slug + ' to see the scanner');