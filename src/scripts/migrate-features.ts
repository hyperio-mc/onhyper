#!/usr/bin/env npx tsx
/**
 * Feature Flag Migration Script
 * 
 * Syncs feature flag defaults from code to database.
 * Run via: npm run migrate:features
 * Or on Railway: railway run npm run migrate:features
 * 
 * @module scripts/migrate-features
 */

import { config } from 'dotenv';
config();

import { initDatabase, getDatabase, closeDatabase } from '../lib/db.js';
import { getFeatureFlag, updateFeatureFlag, createFeatureFlag } from '../lib/features.js';

/**
 * Feature flag defaults defined in code.
 * These values represent the "source of truth" for migrations.
 */
const FEATURE_FLAG_DEFAULTS = {
  subdomains: {
    name: 'subdomains',
    display_name: 'Custom Subdomains',
    description: 'Allow users to claim custom subdomains for their apps',
    enabled: true,
    rollout_percentage: 100,
    min_plan_tier: 'FREE',
    custom_rules: null,
  },
  short_subdomains: {
    name: 'short_subdomains',
    display_name: 'Short Subdomains',
    description: 'Allow subdomains with fewer than 6 characters (premium feature)',
    enabled: true,
    rollout_percentage: 100,
    min_plan_tier: 'PRO',
    custom_rules: {
      type: 'or',
      conditions: [
        { type: 'subdomain_length', operator: '>=', value: 6 },
        { type: 'plan_tier', operator: '>=', value: 'PRO' },
      ],
    },
  },
} as const;

interface MigrationResult {
  name: string;
  action: 'created' | 'updated' | 'skipped';
  changes?: string[];
}

/**
 * Run the migration
 */
async function migrate(): Promise<MigrationResult[]> {
  console.log('🔍 Checking feature flags...\n');
  
  const results: MigrationResult[] = [];
  
  for (const [name, defaults] of Object.entries(FEATURE_FLAG_DEFAULTS)) {
    const existing = getFeatureFlag(name);
    
    if (!existing) {
      console.log(`📝 Creating new flag: ${name}`);
      
      try {
        createFeatureFlag({
          name: defaults.name,
          display_name: defaults.display_name,
          description: defaults.description,
          enabled: defaults.enabled,
          rollout_percentage: defaults.rollout_percentage,
          min_plan_tier: defaults.min_plan_tier,
          custom_rules: defaults.custom_rules,
        });
        
        results.push({
          name,
          action: 'created',
          changes: ['Flag created with code defaults'],
        });
        
        console.log(`   ✅ Created: ${name}\n`);
      } catch (error) {
        console.error(`   ❌ Failed to create ${name}:`, error);
        results.push({
          name,
          action: 'skipped',
          changes: [`Failed to create: ${error}`],
        });
      }
      continue;
    }
    
    // Check for differences
    const changes: string[] = [];
    
    if (existing.min_plan_tier !== defaults.min_plan_tier) {
      changes.push(`min_plan_tier: "${existing.min_plan_tier}" → "${defaults.min_plan_tier}"`);
    }
    
    if (existing.display_name !== defaults.display_name) {
      changes.push(`display_name: "${existing.display_name}" → "${defaults.display_name}"`);
    }
    
    if (existing.description !== defaults.description) {
      changes.push(`description: updated`);
    }
    
    const existingEnabled = existing.enabled === 1;
    if (existingEnabled !== defaults.enabled) {
      changes.push(`enabled: ${existingEnabled} → ${defaults.enabled}`);
    }
    
    if (existing.rollout_percentage !== defaults.rollout_percentage) {
      changes.push(`rollout_percentage: ${existing.rollout_percentage} → ${defaults.rollout_percentage}`);
    }
    
    if (changes.length > 0) {
      console.log(`🔄 Updating flag: ${name}`);
      changes.forEach(change => console.log(`   - ${change}`));
      
      updateFeatureFlag(name, {
        display_name: defaults.display_name,
        description: defaults.description,
        enabled: defaults.enabled,
        rollout_percentage: defaults.rollout_percentage,
        min_plan_tier: defaults.min_plan_tier,
        custom_rules: defaults.custom_rules,
      });
      
      results.push({
        name,
        action: 'updated',
        changes,
      });
      
      console.log(`   ✅ Updated: ${name}\n`);
    } else {
      console.log(`✓ No changes needed: ${name}`);
      results.push({
        name,
        action: 'skipped',
        changes: ['No changes needed'],
      });
    }
  }
  
  return results;
}

/**
 * Main entry point
 */
async function main() {
  console.log('\n🚀 Feature Flag Migration\n');
  console.log('Database:', process.env.SQLITE_PATH || `${process.env.DATA_DIR || './data'}/onhyper.db`);
  console.log('');
  
  try {
    // Initialize database
    initDatabase();
    
    // Run migration
    const results = await migrate();
    
    // Summary
    console.log('\n📊 Summary\n');
    const created = results.filter(r => r.action === 'created');
    const updated = results.filter(r => r.action === 'updated');
    const skipped = results.filter(r => r.action === 'skipped');
    
    console.log(`   Created: ${created.length}`);
    console.log(`   Updated: ${updated.length}`);
    console.log(`   Skipped: ${skipped.length}`);
    console.log('');
    
    if (created.length > 0) {
      console.log('Created flags:', created.map(r => r.name).join(', '));
    }
    if (updated.length > 0) {
      console.log('Updated flags:', updated.map(r => r.name).join(', '));
    }
    
    console.log('\n✅ Migration complete!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Run the script
main();