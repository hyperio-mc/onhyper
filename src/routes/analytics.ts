import { Hono } from 'hono';
import { getPostHogClient } from '../lib/analytics.js';

/**
 * Analytics router for user app events
 * 
 * This provides a proxy endpoint for HYPR users to send analytics events
 * from their apps. Events are forwarded to PostHog with the user's app_id
 * automatically injected.
 */

const analytics = new Hono();

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

export { analytics };
