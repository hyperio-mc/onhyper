/**
 * Server-side PostHog analytics for OnHyper.io
 * 
 * Tracks events from the backend: proxy requests, upgrades, trials, etc.
 */

import { PostHog } from 'posthog-node';

// Initialize PostHog client (server-side)
let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  if (!posthogClient && process.env.POSTHOG_KEY) {
    posthogClient = new PostHog(process.env.POSTHOG_KEY, {
      host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    });
  }
  return posthogClient;
}

/**
 * Track a server-side event
 */
export function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
): void {
  const client = getPostHogClient();
  
  if (!client) {
    // Log to console if no PostHog key
    console.log('[Analytics] (no key)', event, { distinctId, ...properties });
    return;
  }
  
  try {
    client.capture({
      distinctId,
      event,
      properties,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Identify a user (server-side)
 */
export function identifyServerUser(
  distinctId: string,
  properties: {
    email?: string;
    plan?: string;
    createdAt?: string;
    appsCount?: number;
    secretsCount?: number;
  }
): void {
  const client = getPostHogClient();
  
  if (!client) {
    console.log('[Analytics] (no key) identify', distinctId, properties);
    return;
  }
  
  try {
    client.identify({
      distinctId,
      properties,
    });
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Track a proxy request event
 */
export function trackProxyRequest(params: {
  userId: string;
  appId?: string;
  endpoint: string;
  status: number;
  durationMs: number;
  success: boolean;
}): void {
  trackServerEvent(params.userId, 'proxy_request', {
    app_id: params.appId,
    endpoint: params.endpoint,
    status: params.status,
    duration_ms: params.durationMs,
    success: params.success,
  });
}

/**
 * Track upgrade clicked event
 */
export function trackUpgradeClicked(params: {
  userId: string;
  fromPlan: string;
  toPlan: string;
}): void {
  trackServerEvent(params.userId, 'upgrade_clicked', {
    from_plan: params.fromPlan,
    to_plan: params.toPlan,
  });
}

/**
 * Track trial started event
 */
export function trackTrialStarted(params: {
  userId: string;
  plan: string;
  source?: string;
}): void {
  trackServerEvent(params.userId, 'trial_started', {
    plan: params.plan,
    source: params.source,
  });
}

/**
 * Track subscription event
 */
export function trackSubscription(params: {
  userId: string;
  plan: string;
  revenue?: number;
  source?: string;
}): void {
  trackServerEvent(params.userId, 'subscription', {
    plan: params.plan,
    revenue: params.revenue,
    source: params.source,
  });
}

/**
 * Cleanup PostHog client on shutdown
 */
export async function shutdownAnalytics(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}

// Export for use in main process lifecycle
export { getPostHogClient };