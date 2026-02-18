/**
 * Per-App Analytics for OnHyper.io
 * 
 * Tracks views and API calls for each published app.
 * Provides aggregation endpoints for dashboard display.
 * 
 * ## Data Model
 * 
 * Two tables for efficient storage and querying:
 * 
 * 1. `app_analytics` - Raw event log
 *    - Every view and API call recorded
 *    - Includes referrer, user agent, timing
 * 
 * 2. `app_analytics_daily` - Daily aggregates
 *    - Pre-computed counts per day
 *    - Fast dashboard queries
 * 
 * ## Usage
 * 
 * ```typescript
 * import { trackAppView, trackAppApiCall, getAppAnalytics } from './lib/appAnalytics.js';
 * 
 * // Track a page view
 * trackAppView(appId, { referrer, userAgent, ipHash });
 * 
 * // Track an API call
 * trackAppApiCall(appId, { endpoint, status, duration });
 * 
 * // Get analytics for dashboard
 * const stats = getAppAnalytics(appId, 30);
 * // → { totalViews: 1234, totalApiCalls: 567, ... }
 * ```
 * 
 * @module lib/appAnalytics
 */

import { randomUUID, createHash } from 'crypto';
import { getDatabase, AppAnalyticsEvent, AppAnalyticsDaily } from './db.js';

export interface ViewData {
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface ApiCallData {
  endpoint: string;
  status: number;
  duration: number;
}

export interface AppAnalyticsSummary {
  appId: string;
  totalViews: number;
  totalApiCalls: number;
  totalErrors: number;
  avgDuration: number;
  dailyStats: DailyStats[];
  topEndpoints: { endpoint: string; count: number }[];
}

export interface DailyStats {
  date: string;
  views: number;
  apiCalls: number;
  errors: number;
}

/**
 * Hash an IP address for privacy (cannot be reversed)
 */
function hashIp(ip: string): string {
  return createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT || 'onhyper-default-salt'))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Track a page view for an app
 */
export function trackAppView(appId: string, data: ViewData = {}): void {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  
  const ipHash = data.ipAddress ? hashIp(data.ipAddress) : null;
  
  // Insert raw event
  db.prepare(`
    INSERT INTO app_analytics (id, app_id, event_type, referrer, user_agent, ip_hash, created_at)
    VALUES (?, ?, 'view', ?, ?, ?, ?)
  `).run(id, appId, data.referrer || null, data.userAgent || null, ipHash, now);
  
  // Update daily aggregate
  updateDailyAggregate(appId, today, 'view');
}

/**
 * Track an API call from an app
 */
export function trackAppApiCall(appId: string, data: ApiCallData): void {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  
  // Insert raw event
  db.prepare(`
    INSERT INTO app_analytics (id, app_id, event_type, endpoint, status, duration, created_at)
    VALUES (?, ?, 'api_call', ?, ?, ?, ?)
  `).run(id, appId, data.endpoint, data.status, data.duration, now);
  
  // Update daily aggregate (include error if status >= 400)
  const isError = data.status >= 400;
  updateDailyAggregate(appId, today, 'api_call', data.duration, isError);
}

/**
 * Update the daily aggregate table
 */
function updateDailyAggregate(
  appId: string, 
  date: string, 
  eventType: 'view' | 'api_call',
  duration: number = 0,
  isError: boolean = false
): void {
  const db = getDatabase();
  const id = `${appId}-${date}`;
  
  // Try to insert new row
  try {
    db.prepare(`
      INSERT INTO app_analytics_daily (id, app_id, date, view_count, api_call_count, error_count, avg_duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      appId, 
      date, 
      eventType === 'view' ? 1 : 0,
      eventType === 'api_call' ? 1 : 0,
      isError ? 1 : 0,
      eventType === 'api_call' ? duration : 0
    );
  } catch (e: any) {
    // Row exists, update it
    if (eventType === 'view') {
      db.prepare(`
        UPDATE app_analytics_daily 
        SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    } else {
      db.prepare(`
        UPDATE app_analytics_daily 
        SET 
          api_call_count = api_call_count + 1,
          error_count = error_count + ?,
          avg_duration = ((avg_duration * (api_call_count - 1)) + ?) / api_call_count,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(isError ? 1 : 0, duration, id);
    }
  }
}

/**
 * Get analytics summary for an app
 */
export function getAppAnalytics(appId: string, days: number = 30): AppAnalyticsSummary {
  const db = getDatabase();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  // Get daily stats
  const dailyStats = db.prepare(`
    SELECT date, view_count, api_call_count, error_count, avg_duration
    FROM app_analytics_daily
    WHERE app_id = ? AND date >= ?
    ORDER BY date DESC
  `).all(appId, startDateStr) as any[];
  
  // Calculate totals
  let totalViews = 0;
  let totalApiCalls = 0;
  let totalErrors = 0;
  let totalDuration = 0;
  let durationCount = 0;
  
  for (const stat of dailyStats) {
    totalViews += stat.view_count || 0;
    totalApiCalls += stat.api_call_count || 0;
    totalErrors += stat.error_count || 0;
    if (stat.avg_duration > 0) {
      totalDuration += stat.avg_duration * stat.api_call_count;
      durationCount += stat.api_call_count;
    }
  }
  
  // Get top endpoints
  const topEndpoints = db.prepare(`
    SELECT endpoint, COUNT(*) as count
    FROM app_analytics
    WHERE app_id = ? AND event_type = 'api_call' AND created_at >= ?
    GROUP BY endpoint
    ORDER BY count DESC
    LIMIT 10
  `).all(appId, startDate.toISOString()) as { endpoint: string; count: number }[];
  
  return {
    appId,
    totalViews,
    totalApiCalls,
    totalErrors,
    avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    dailyStats: dailyStats.map(s => ({
      date: s.date,
      views: s.view_count || 0,
      apiCalls: s.api_call_count || 0,
      errors: s.error_count || 0,
    })),
    topEndpoints,
  };
}

/**
 * Get analytics by app slug (convenience method)
 */
export function getAppAnalyticsBySlug(slug: string, days: number = 30): AppAnalyticsSummary | null {
  const db = getDatabase();
  const app = db.prepare('SELECT id FROM apps WHERE slug = ?').get(slug) as { id: string } | undefined;
  
  if (!app) return null;
  
  return getAppAnalytics(app.id, days);
}

/**
 * Get all apps with their analytics summary (for user dashboard)
 */
export function getUserAppsWithAnalytics(userId: string, days: number = 30): Array<{
  id: string;
  name: string;
  slug: string;
  views: number;
  apiCalls: number;
  errors: number;
}> {
  const db = getDatabase();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  const results = db.prepare(`
    SELECT 
      a.id, 
      a.name, 
      a.slug,
      COALESCE(SUM(d.view_count), 0) as views,
      COALESCE(SUM(d.api_call_count), 0) as apiCalls,
      COALESCE(SUM(d.error_count), 0) as errors
    FROM apps a
    LEFT JOIN app_analytics_daily d ON a.id = d.app_id AND d.date >= ?
    WHERE a.user_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all(startDateStr, userId) as any[];
  
  return results.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    views: r.views || 0,
    apiCalls: r.apiCalls || 0,
    errors: r.errors || 0,
  }));
}