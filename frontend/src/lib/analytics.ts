/**
 * Client-side PostHog analytics for OnHyper.io
 * 
 * Tracks events from the browser: page views, signups, logins, app interactions
 */

import { browser } from './environment';
import posthog from 'posthog-js';

// PostHog configuration - PUBLIC_ prefix for SvelteKit public env vars
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

let initialized = false;

/**
 * Initialize PostHog on the client
 * Should be called once when the app loads
 */
export function initAnalytics(): void {
  if (!browser || initialized) return;
  
  if (POSTHOG_KEY) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true, // Auto-capture page views
        capture_exceptions: true, // Auto-capture exceptions
        session_recording: {
          maskAllInputs: true, // Don't record sensitive input values
        },
        // Respect user privacy
        disable_session_recording: !POSTHOG_KEY, // Disable if no key
      });
      initialized = true;
      console.log('[Analytics] PostHog initialized');
    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog:', error);
    }
  } else {
    console.log('[Analytics] No PostHog key configured - tracking disabled');
  }
}

/**
 * Identify a user after login/signup
 * This links all events to the user
 */
export function identifyUser(
  userId: string,
  properties: {
    email: string;
    plan?: string;
  }
): void {
  if (!browser || !initialized) {
    console.log('[Analytics] (no init) identify', userId, properties);
    return;
  }
  
  try {
    posthog.identify(userId, {
      email: properties.email,
      plan: properties.plan || 'FREE',
    });
    console.log('[Analytics] User identified:', userId);
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Reset user identity on logout
 */
export function resetUser(): void {
  if (!browser || !initialized) return;
  
  try {
    posthog.reset();
    console.log('[Analytics] User reset');
  } catch (error) {
    console.error('[Analytics] Failed to reset user:', error);
  }
}

/**
 * Track a custom event
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!browser) return;
  
  if (!initialized || !POSTHOG_KEY) {
    console.log('[Analytics] (no init)', event, properties);
    return;
  }
  
  try {
    posthog.capture(event, properties);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Track signup event
 */
export function trackSignup(params: {
  email: string;
  plan?: string;
  source?: string;
}): void {
  trackEvent('signup', {
    email: params.email,
    plan: params.plan || 'FREE',
    source: params.source || 'organic',
  });
}

/**
 * Track login event
 */
export function trackLogin(params: { email: string }): void {
  trackEvent('login', {
    email: params.email,
  });
}

/**
 * Track app created event
 */
export function trackAppCreated(params: {
  appId: string;
  appName: string;
}): void {
  trackEvent('app_created', {
    app_id: params.appId,
    app_name: params.appName,
  });
}

/**
 * Track app viewed event
 */
export function trackAppViewed(params: {
  appId: string;
  appName?: string;
}): void {
  trackEvent('app_viewed', {
    app_id: params.appId,
    app_name: params.appName,
  });
}

/**
 * Track secret added event
 */
export function trackSecretAdded(params: { keyName: string }): void {
  trackEvent('secret_added', {
    key_name: params.keyName,
  });
}

/**
 * Track upgrade clicked event
 */
export function trackUpgradeClicked(params: {
  fromPlan: string;
  toPlan: string;
}): void {
  trackEvent('upgrade_clicked', {
    from_plan: params.fromPlan,
    to_plan: params.toPlan,
  });
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (!browser || !initialized) return;
  
  try {
    posthog.people.set(properties);
  } catch (error) {
    console.error('[Analytics] Failed to set user properties:', error);
  }
}

/**
 * Get current session URL for debugging
 */
export function getSessionUrl(): string | null {
  if (!browser || !initialized) return null;
  
  return posthog.get_session_replay_url?.() || null;
}

// Re-export posthog for advanced usage
export { posthog };