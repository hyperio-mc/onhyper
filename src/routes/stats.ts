/**
 * Public Stats Endpoint for OnHyper.io
 * 
 * Returns aggregated platform statistics for the landing page.
 * Results are cached in-memory for 5 minutes to prevent DB overload.
 * 
 * @module routes/stats
 */

import { Hono } from 'hono';
import { getDatabase } from '../lib/db.js';

export const stats = new Hono();

// In-memory cache
interface StatsCache {
  data: {
    apps: number;
    published: number;
    subdomains: number;
  };
  timestamp: number;
}

let cache: StatsCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/stats
 * 
 * Returns platform statistics:
 * - apps: Total number of apps created
 * - published: Number of apps with content (published)
 * - subdomains: Number of subdomains claimed
 * 
 * No authentication required - public endpoint.
 * Results cached for 5 minutes.
 */
stats.get('/', (c) => {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_TTL_MS) {
      return c.json(cache.data);
    }

    // Cache expired or missing - fetch fresh data
    const db = getDatabase();

    // Total apps created
    const appsResult = db.prepare('SELECT COUNT(*) as count FROM apps').get() as { count: number };
    const apps = appsResult.count;

    // Published apps: apps that have HTML content
    // An app is considered "published" when it has been deployed with content
    const publishedResult = db.prepare(
      'SELECT COUNT(*) as count FROM apps WHERE html IS NOT NULL AND html != ""'
    ).get() as { count: number };
    const published = publishedResult.count;

    // Subdomains claimed
    const subdomainsResult = db.prepare(
      'SELECT COUNT(*) as count FROM subdomain_reservations'
    ).get() as { count: number };
    const subdomains = subdomainsResult.count;

    // Build response
    const data = {
      apps,
      published,
      subdomains,
    };

    // Update cache
    cache = {
      data,
      timestamp: now,
    };

    return c.json(data);

  } catch (error) {
    console.error('[Stats] Failed to get stats:', error);
    
    // Return cached data even if expired on error, fallback to zeros
    if (cache) {
      return c.json(cache.data);
    }
    
    return c.json({
      apps: 0,
      published: 0,
      subdomains: 0,
    });
  }
});