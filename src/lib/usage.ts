/**
 * Usage tracking for OnHyper.io
 * 
 * Records proxy requests for analytics and rate limiting.
 */

import { randomUUID } from 'crypto';
import { getDatabase } from './db.js';

export interface UsageRecordInput {
  apiKeyId?: string;
  appId?: string;
  endpoint: string;
  status: number;
  duration: number;
}

/**
 * Record a proxy request for analytics
 */
export function recordUsage(input: UsageRecordInput): void {
  const db = getDatabase();
  
  const id = randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO usage (id, api_key_id, app_id, endpoint, status, duration, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.apiKeyId || null,
    input.appId || null,
    input.endpoint,
    input.status,
    input.duration,
    now
  );
}

/**
 * Get usage stats for a user
 */
export function getUserUsageStats(userId: string, days: number = 30): {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  byStatus: Record<number, number>;
  avgDuration: number;
} {
  const db = getDatabase();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Get all usage for user's apps and API keys
  const records = db.prepare(`
    SELECT u.* FROM usage u
    LEFT JOIN apps a ON u.app_id = a.id
    LEFT JOIN api_keys k ON u.api_key_id = k.id
    WHERE (a.user_id = ? OR k.user_id = ?)
    AND u.created_at >= ?
  `).all(userId, userId, startDate.toISOString()) as any[];
  
  const byEndpoint: Record<string, number> = {};
  const byStatus: Record<number, number> = {};
  let totalDuration = 0;
  
  for (const record of records) {
    byEndpoint[record.endpoint] = (byEndpoint[record.endpoint] || 0) + 1;
    byStatus[record.status] = (byStatus[record.status] || 0) + 1;
    totalDuration += record.duration || 0;
  }
  
  return {
    totalRequests: records.length,
    byEndpoint,
    byStatus,
    avgDuration: records.length > 0 ? Math.round(totalDuration / records.length) : 0,
  };
}

/**
 * Get usage count for today (for rate limiting)
 */
export function getTodayUsageCount(userId: string): number {
  const db = getDatabase();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM usage u
    LEFT JOIN apps a ON u.app_id = a.id
    LEFT JOIN api_keys k ON u.api_key_id = k.id
    WHERE (a.user_id = ? OR k.user_id = ?)
    AND u.created_at >= ?
  `).get(userId, userId, today.toISOString()) as { count: number };
  
  return result.count;
}

/**
 * Get usage for a specific app
 */
export function getAppUsage(appId: string, days: number = 30): any[] {
  const db = getDatabase();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return db.prepare(`
    SELECT * FROM usage
    WHERE app_id = ?
    AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 1000
  `).all(appId, startDate.toISOString());
}