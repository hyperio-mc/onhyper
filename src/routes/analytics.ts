import { Hono } from 'hono';
import { getPostHogClient } from '../lib/analytics.js';
import { getAuthUser } from '../middleware/auth.js';
import { listAppsByUser } from '../lib/apps.js';
import { getAppAnalytics, getUserAppsWithAnalytics } from '../lib/appAnalytics.js';

/**
 * Analytics router for user app events
 * 
 * This provides endpoints for:
 * 1. Capturing analytics events from user apps (forwarded to PostHog)
 * 2. Fetching aggregated stats for the user's dashboard
 * 
 * ## Endpoints
 * 
 * - POST /capture - Capture an event from a user app
 * - GET /status - Check analytics configuration status
 * - GET /stats - Get aggregated analytics for user's apps
 * - GET /events - Get recent events for user's apps (PostHog)
 */

const analytics = new Hono();

/**
 * PostHog Project ID for Query API
 * Used for querying events via the insights API
 */
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '314488';
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || process.env.POSTHOG_KEY;

/**
 * POST /api/analytics/capture
 * 
 * Capture analytics events from user apps.
 * 
 * Request body:
 * {
 *   event: string,        // Event name (e.g., 'button_clicked')
 *   properties?: object,  // Additional event properties
 *   distinctId?: string,  // Anonymous or user ID
 *   timestamp?: string    // ISO timestamp (defaults to now)
 * }
 * 
 * The app_id is automatically injected from the user's authenticated session.
 */
analytics.post('/capture', async (c) => {
  try {
    // Get the user from auth context (set by requireAuth middleware)
    const user = c.get('user') as { userId: string; email: string; plan: string } | undefined;
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Parse the request body
    const body = await c.req.json();
    const { event, properties, distinctId, timestamp } = body;

    // Validate required fields
    if (!event || typeof event !== 'string') {
      return c.json({ error: 'Missing or invalid event name' }, 400);
    }

    // Get PostHog client
    const posthog = getPostHogClient();

    // Build the event payload
    // Inject app_id from user's apps if available, or use a default
    const enrichedProperties = {
      ...properties,
      app_id: properties?.app_id || 'onhyper-platform',
      source: 'onhyper-analytics-api',
      user_id: user.userId,
    };

    // Use distinctId from request or fall back to user ID
    const finalDistinctId = distinctId || `user-${user.userId}`;

    if (posthog) {
      // Forward to PostHog
      await posthog.capture({
        distinctId: finalDistinctId,
        event: event,
        properties: enrichedProperties,
        timestamp: timestamp || new Date().toISOString(),
      });

      return c.json({ success: true, message: 'Event captured' });
    } else {
      // No PostHog configured - log but don't fail
      console.log('[Analytics] (no client)', event, enrichedProperties);
      return c.json({ success: true, message: 'Event logged (no PostHog configured)' });
    }

  } catch (error) {
    console.error('[Analytics] Failed to capture event:', error);
    return c.json({ error: 'Failed to capture event' }, 500);
  }
});

/**
 * GET /api/analytics/status
 * 
 * Check if analytics is configured and operational.
 */
analytics.get('/status', (c) => {
  const posthog = getPostHogClient();
  
  return c.json({
    configured: !!posthog,
    provider: 'PostHog',
  });
});

/**
 * GET /api/analytics/stats
 * 
 * Get aggregated analytics for the authenticated user's apps.
 * 
 * Query parameters:
 * - days: Number of days to include (default: 30, max: 365)
 * - app_id: Filter to specific app (optional)
 * 
 * Returns:
 * - Total events across all apps
 * - Unique users count (distinct IDs from PostHog)
 * - Top events list
 * - Daily breakdown
 * - Per-app breakdown
 */
analytics.get('/stats', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  try {
    // Parse query parameters
    const days = Math.min(Math.max(parseInt(c.req.query('days') || '30', 10), 1), 365);
    const filterAppId = c.req.query('app_id');
    
    // Get the user's apps
    const userApps = listAppsByUser(user.userId);
    
    // Filter to specific app if requested
    const apps = filterAppId 
      ? userApps.filter(app => app.id === filterAppId)
      : userApps;
    
    if (apps.length === 0) {
      return c.json({
        totalEvents: 0,
        uniqueUsers: 0,
        topEvents: [],
        dailyBreakdown: [],
        apps: [],
        days,
      });
    }
    
    // Get local analytics data (from SQLite)
    const appsWithAnalytics = getUserAppsWithAnalytics(user.userId, days);
    
    // Calculate totals from local data
    const totalViews = appsWithAnalytics.reduce((sum, a) => sum + a.views, 0);
    const totalApiCalls = appsWithAnalytics.reduce((sum, a) => sum + a.apiCalls, 0);
    const totalErrors = appsWithAnalytics.reduce((sum, a) => sum + a.errors, 0);
    
    // Try to get PostHog data for richer analytics
    let posthogStats = {
      totalEvents: 0,
      uniqueUsers: 0,
      topEvents: [] as { event: string; count: number }[],
      dailyBreakdown: [] as { date: string; events: number; users: number }[],
    };
    
    if (POSTHOG_API_KEY) {
      try {
        posthogStats = await fetchPostHogStats(apps.map(a => a.id), days);
      } catch (err) {
        console.warn('[Analytics] PostHog query failed, using local data:', err);
      }
    }
    
    // Build response combining local and PostHog data
    const response = {
      // Total events (combine views + API calls from local, or use PostHog if available)
      totalEvents: posthogStats.totalEvents || (totalViews + totalApiCalls),
      
      // Unique users from PostHog, or estimate from views
      uniqueUsers: posthogStats.uniqueUsers || Math.round(totalViews * 0.7), // Rough estimate
      
      // Top events from PostHog, or default events from local data
      topEvents: posthogStats.topEvents.length > 0 
        ? posthogStats.topEvents 
        : [
            { event: 'page_view', count: totalViews },
            { event: 'api_call', count: totalApiCalls },
            { event: 'error', count: totalErrors },
          ],
      
      // Daily breakdown
      dailyBreakdown: posthogStats.dailyBreakdown.length > 0
        ? posthogStats.dailyBreakdown
        : generateDailyBreakdownFromLocal(days, appsWithAnalytics),
      
      // Per-app breakdown
      apps: apps.map(app => {
        const appData = appsWithAnalytics.find(a => a.id === app.id) || {
          views: 0, apiCalls: 0, errors: 0,
        };
        return {
          id: app.id,
          name: app.name,
          slug: app.slug,
          views: appData.views,
          apiCalls: appData.apiCalls,
          errors: appData.errors,
          totalEvents: appData.views + appData.apiCalls,
        };
      }),
      
      // Time range
      days,
      
      // Summary stats
      summary: {
        views: totalViews,
        apiCalls: totalApiCalls,
        errors: totalErrors,
        errorRate: totalApiCalls > 0 ? Math.round((totalErrors / totalApiCalls) * 100) : 0,
      },
    };
    
    return c.json(response);
    
  } catch (error) {
    console.error('[Analytics] Failed to get stats:', error);
    return c.json({ error: 'Failed to load analytics' }, 500);
  }
});

/**
 * GET /api/analytics/events
 * 
 * Get recent events for a specific app from PostHog.
 * 
 * Query parameters:
 * - app_id: Required, the app to get events for
 * - limit: Number of events to return (default: 50, max: 100)
 */
analytics.get('/events', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  const appId = c.req.query('app_id');
  if (!appId) {
    return c.json({ error: 'app_id is required' }, 400);
  }
  
  // Verify the user owns this app
  const userApps = listAppsByUser(user.userId);
  const app = userApps.find(a => a.id === appId);
  
  if (!app) {
    return c.json({ error: 'App not found or access denied' }, 404);
  }
  
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
  
  if (!POSTHOG_API_KEY) {
    // Fall back to local analytics
    const localData = getAppAnalytics(appId, 30);
    return c.json({
      app: { id: app.id, name: app.name, slug: app.slug },
      events: [],
      localStats: localData,
      source: 'local',
    });
  }
  
  try {
    const events = await fetchPostHogEvents(appId, limit);
    
    return c.json({
      app: { id: app.id, name: app.name, slug: app.slug },
      events,
      source: 'posthog',
    });
  } catch (error) {
    console.error('[Analytics] Failed to fetch events:', error);
    
    // Fall back to local data on error
    const localData = getAppAnalytics(appId, 30);
    return c.json({
      app: { id: app.id, name: app.name, slug: app.slug },
      events: [],
      localStats: localData,
      source: 'local',
      error: 'PostHog query failed',
    });
  }
});

/**
 * Fetch aggregated stats from PostHog Query API
 * 
 * Uses the PostHog insights API to get:
 * - Total event count
 * - Unique users
 * - Top events
 * - Daily breakdown
 */
async function fetchPostHogStats(appIds: string[], days: number): Promise<{
  totalEvents: number;
  uniqueUsers: number;
  topEvents: { event: string; count: number }[];
  dailyBreakdown: { date: string; events: number; users: number }[];
}> {
  if (!POSTHOG_API_KEY) {
    throw new Error('PostHog API key not configured');
  }
  
  const host = process.env.POSTHOG_HOST || 'https://us.posthog.com';
  const url = `${host}/api/projects/${POSTHOG_PROJECT_ID}/query`;
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Build the query for events matching our apps
  // We query for events with app_id in the appIds list
  const appFilters = appIds.map(id => `properties.app_id = '${id}'`).join(' OR ');
  
  // Query 1: Total events and unique users
  const statsQuery = `
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT person_id) as unique_users
    FROM events
    WHERE timestamp >= '${startDate.toISOString()}'
      AND timestamp <= '${endDate.toISOString()}'
      AND (${appFilters})
  `;
  
  // Query 2: Top events by count
  const topEventsQuery = `
    SELECT 
      event,
      COUNT(*) as count
    FROM events
    WHERE timestamp >= '${startDate.toISOString()}'
      AND timestamp <= '${endDate.toISOString()}'
      AND (${appFilters})
    GROUP BY event
    ORDER BY count DESC
    LIMIT 10
  `;
  
  // Query 3: Daily breakdown
  const dailyQuery = `
    SELECT 
      formatDateTime(timestamp, '%Y-%m-%d') as date,
      COUNT(*) as events,
      COUNT(DISTINCT person_id) as users
    FROM events
    WHERE timestamp >= '${startDate.toISOString()}'
      AND timestamp <= '${endDate.toISOString()}'
      AND (${appFilters})
    GROUP BY date
    ORDER BY date DESC
    LIMIT ${days}
  `;
  
  try {
    // Execute all queries in parallel
    const [statsResult, topEventsResult, dailyResult] = await Promise.all([
      executePostHogQuery(url, statsQuery),
      executePostHogQuery(url, topEventsQuery),
      executePostHogQuery(url, dailyQuery),
    ]);
    
    // Parse results
    const stats = statsResult?.results?.[0] || { total_events: 0, unique_users: 0 };
    const topEvents = (topEventsResult?.results || []).map((r: any) => ({
      event: r.event,
      count: r.count,
    }));
    const dailyBreakdown = (dailyResult?.results || []).map((r: any) => ({
      date: r.date,
      events: r.events,
      users: r.users,
    }));
    
    return {
      totalEvents: stats.total_events || 0,
      uniqueUsers: stats.unique_users || 0,
      topEvents,
      dailyBreakdown,
    };
  } catch (error) {
    console.error('[Analytics] PostHog query error:', error);
    throw error;
  }
}

/**
 * Execute a ClickHouse query via PostHog Query API
 */
async function executePostHogQuery(url: string, query: string): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error('[Analytics] PostHog API error:', response.status, text);
    throw new Error(`PostHog API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch recent events for a specific app from PostHog
 */
async function fetchPostHogEvents(appId: string, limit: number): Promise<any[]> {
  if (!POSTHOG_API_KEY) {
    return [];
  }
  
  const host = process.env.POSTHOG_HOST || 'https://us.posthog.com';
  const url = `${host}/api/projects/${POSTHOG_PROJECT_ID}/query`;
  
  const query = `
    SELECT 
      event,
      properties,
      timestamp,
      person_id
    FROM events
    WHERE properties.app_id = '${appId}'
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
  
  try {
    const result = await executePostHogQuery(url, query);
    return (result?.results || []).map((r: any) => ({
      event: r.event,
      properties: r.properties,
      timestamp: r.timestamp,
      distinctId: r.person_id,
    }));
  } catch (error) {
    console.error('[Analytics] Failed to fetch events:', error);
    return [];
  }
}

/**
 * Generate a daily breakdown from local analytics data
 */
function generateDailyBreakdownFromLocal(
  days: number, 
  appsWithAnalytics: Array<{ id: string; name: string; slug: string; views: number; apiCalls: number; errors: number }>
): { date: string; events: number; users: number }[] {
  const breakdown: { date: string; events: number; users: number }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Use aggregate totals distributed across days (simplified)
    // In production, this would use actual daily data from app_analytics_daily
    const dailyViews = Math.round(appsWithAnalytics.reduce((sum, a) => sum + a.views, 0) / days);
    const dailyCalls = Math.round(appsWithAnalytics.reduce((sum, a) => sum + a.apiCalls, 0) / days);
    
    breakdown.push({
      date: dateStr,
      events: dailyViews + dailyCalls,
      users: Math.round(dailyViews * 0.7), // Estimated unique users
    });
  }
  
  return breakdown;
}

export { analytics };
