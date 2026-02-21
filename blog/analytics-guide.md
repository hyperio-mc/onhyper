---
title: "Track User Behavior in Your Apps with OnHyper Analytics"
date: 2026-02-21
author: MC
tags: [onhyper, analytics, javascript, posthog]
---

Understanding how users interact with your app is essential. Which features do they love? Where do they drop off? What errors are they seeing?

OnHyper now includes built-in analytics that you can use from any app you publish. No setup required — just send events, and view them in your dashboard.

## Quick Start

The analytics API is a single endpoint that forwards events to PostHog (our analytics provider). Here's the simplest way to track an event:

```javascript
// Track an event from your app
await fetch('/api/analytics/capture', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}` // Your JWT from login
  },
  body: JSON.stringify({
    event: 'button_clicked',
    properties: {
      button: 'submit',
      page: 'checkout'
    }
  })
});
```

That's it. Your event is now tracked and visible in the OnHyper dashboard.

## The Analytics Endpoint

### POST `/api/analytics/capture`

Send custom analytics events from your apps.

**Authentication required:** Include your JWT token in the `Authorization` header.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | Yes | Event name (e.g., `button_clicked`, `purchase_completed`) |
| `properties` | object | No | Additional event properties |
| `distinctId` | string | No | Anonymous or user ID for identity tracking |
| `timestamp` | string | No | ISO timestamp (defaults to now) |

**Response:**

```json
{
  "success": true,
  "message": "Event captured"
}
```

**Error responses:**

```json
// 401 Unauthorized
{ "error": "Unauthorized" }

// 400 Bad Request
{ "error": "Missing or invalid event name" }

// 500 Server Error
{ "error": "Failed to capture event" }
```

## JavaScript Examples

### Basic Event Tracking

```javascript
// Simple event
async function trackEvent(eventName) {
  await fetch('/api/analytics/capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ event: eventName })
  });
}

// Usage
trackEvent('page_viewed');
```

### Event with Properties

```javascript
async function trackEvent(eventName, properties = {}) {
  try {
    const response = await fetch('/api/analytics/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        event: eventName,
        properties: properties
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      console.warn('Analytics tracking failed:', data.message);
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

// Usage
trackEvent('purchase_completed', {
  product: 'Pro Plan',
  amount: 29,
  currency: 'USD'
});
```

### User Identification

For consistent user tracking across sessions, include a `distinctId`:

```javascript
// Generate or get a user ID
let distinctId = localStorage.getItem('analytics_id');
if (!distinctId) {
  distinctId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('analytics_id', distinctId);
}

// Track with distinct ID
async function identifyAndTrack(eventName, properties = {}) {
  await fetch('/api/analytics/capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      event: eventName,
      properties: properties,
      distinctId: distinctId
    })
  });
}
```

### Creating an Analytics Helper Class

For larger apps, create a reusable analytics helper:

```javascript
class Analytics {
  constructor() {
    this.token = localStorage.getItem('token');
    this.distinctId = this.getOrCreateDistinctId();
  }

  getOrCreateDistinctId() {
    let id = localStorage.getItem('analytics_distinct_id');
    if (!id) {
      id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('analytics_distinct_id', id);
    }
    return id;
  }

  async track(event, properties = {}) {
    if (!this.token) {
      console.warn('Analytics: No auth token, skipping event');
      return;
    }

    try {
      const response = await fetch('/api/analytics/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          event,
          properties,
          distinctId: this.distinctId
        })
      });

      return response.json();
    } catch (error) {
      console.error('Analytics track error:', error);
    }
  }

  // Convenience methods for common events
  pageView(page) {
    return this.track('page_view', { page });
  }

  buttonClick(buttonName, context = {}) {
    return this.track('button_clicked', { button: buttonName, ...context });
  }

  formSubmit(formName, data = {}) {
    return this.track('form_submitted', { form: formName, ...data });
  }

  error(errorType, message, context = {}) {
    return this.track('error_occurred', { 
      error_type: errorType, 
      message: message.substring(0, 200), // Limit message length
      ...context 
    });
  }
}

// Usage
const analytics = new Analytics();

// Track page views
analytics.pageView('dashboard');

// Track interactions
analytics.buttonClick('upgrade_button', { location: 'header' });
analytics.formSubmit('contact_form', { fields: 5 });

// Track errors
analytics.error('api_error', 'Failed to fetch apps', { endpoint: '/api/apps' });
```

## Common Event Types

### User Engagement Events

| Event Name | Description | Suggested Properties |
|------------|-------------|---------------------|
| `page_view` | User viewed a page | `page`, `referrer`, `title` |
| `button_clicked` | User clicked a button | `button`, `location`, `page` |
| `form_submitted` | User submitted a form | `form`, `fields_count`, `validation_errors` |
| `search_performed` | User searched for something | `query`, `results_count`, `filters` |
| `feature_used` | User accessed a feature | `feature`, `context` |

### Conversion Events

| Event Name | Description | Suggested Properties |
|------------|-------------|---------------------|
| `signup_completed` | User signed up | `method`, `plan`, `source` |
| `purchase_completed` | User made a purchase | `product`, `amount`, `currency` |
| `trial_started` | User started a trial | `plan`, `source` |
| `upgrade_started` | User started upgrade flow | `from_plan`, `to_plan` |

### Error & Performance Events

| Event Name | Description | Suggested Properties |
|------------|-------------|---------------------|
| `error_occurred` | An error happened | `error_type`, `message`, `stack` |
| `api_error` | API request failed | `endpoint`, `status`, `message` |
| `performance_issue` | Slow operation detected | `operation`, `duration_ms`, `threshold` |

### App-Specific Events

| Event Name | Description | Suggested Properties |
|------------|-------------|---------------------|
| `app_created` | User created an app | `app_type`, `template` |
| `app_published` | User published an app | `app_id`, `app_name`, `subdomain` |
| `api_call_made` | Proxy API call made | `endpoint`, `provider`, `model` |
| `secret_added` | User added a secret | `secret_name`, `provider` |

## Automatic Properties

Every event you send is automatically enriched with:

| Property | Description |
|----------|-------------|
| `user_id` | Your OnHyper user ID |
| `app_id` | The app sending the event (if specified) |
| `source` | Set to `onhyper-analytics-api` |
| `timestamp` | ISO timestamp (if not provided) |

## Viewing Your Analytics

### Dashboard View

Navigate to your OnHyper dashboard and click the **Analytics** tab. You'll see:

- **Total Events** — Count of all events across your apps
- **Unique Users** — Distinct users tracked (via `distinctId`)
- **Top Events** — Your most common events
- **Daily Breakdown** — Events over time

### Per-App Analytics

For each app, you can view:

- Page views
- API calls made through the proxy
- Error rates
- Response times

### API Access

You can also fetch analytics via the API:

```javascript
// Get stats for all your apps (last 30 days)
const stats = await fetch('/api/analytics/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log(stats);
// {
//   totalEvents: 1234,
//   uniqueUsers: 56,
//   topEvents: [...],
//   dailyBreakdown: [...],
//   apps: [...],
//   summary: { views, apiCalls, errors, errorRate }
// }

// Get events for a specific app
const events = await fetch('/api/analytics/events?app_id=YOUR_APP_ID&limit=50', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log(events);
// {
//   app: { id, name, slug },
//   events: [{ event, properties, timestamp, distinctId }, ...],
//   source: 'posthog'
// }
```

### Query Parameters for Stats

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `days` | 30 | 365 | Number of days to include |
| `app_id` | all | — | Filter to specific app |

### Query Parameters for Events

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `app_id` | required | — | App to get events for |
| `limit` | 50 | 100 | Number of events to return |

## Best Practices

### 1. Use Consistent Event Names

Pick a naming convention and stick to it. We recommend `snake_case`:

```javascript
// ✅ Good
'button_clicked'
'form_submitted'
'purchase_completed'

// ❌ Avoid
'buttonClicked'
'FormSubmitted'
'user did purchase'
```

### 2. Keep Properties Consistent

Use the same property names across similar events:

```javascript
// ✅ Consistent
track('purchase_completed', { amount: 29, currency: 'USD' });
track('refund_processed', { amount: 29, currency: 'USD' });

// ❌ Inconsistent
track('purchase_completed', { price: 29, currency: 'USD' });
track('refund_processed', { value: 29, currency_type: 'USD' });
```

### 3. Don't Track Sensitive Data

Never send secrets, passwords, API keys, or personal information:

```javascript
// ❌ Never do this
track('login_attempt', { password: userInput });

// ✅ Track the action, not the secret
track('login_attempt', { method: 'password', success: false });
```

### 4. Batch When Possible

For high-frequency events, consider batching:

```javascript
// Simple batch tracker
class BatchAnalytics {
  constructor() {
    this.queue = [];
    this.flushInterval = 5000; // 5 seconds
    setInterval(() => this.flush(), this.flushInterval);
  }

  track(event, properties) {
    this.queue.push({ event, properties, timestamp: new Date().toISOString() });
    if (this.queue.length >= 20) this.flush(); // Also flush on size
  }

  async flush() {
    if (this.queue.length === 0) return;
    const events = [...this.queue];
    this.queue = [];
    
    // Send each event (or implement batch endpoint)
    for (const e of events) {
      await fetch('/api/analytics/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(e)
      });
    }
  }
}
```

### 5. Handle Offline Gracefully

Users might be offline. Queue events locally and retry:

```javascript
const pendingEvents = JSON.parse(localStorage.getItem('pending_analytics') || '[]');

async function trackWithRetry(event, properties) {
  try {
    const response = await fetch('/api/analytics/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ event, properties })
    });
    
    if (!response.ok) throw new Error('Tracking failed');
    
    // Successfully sent - clear any pending events
    localStorage.setItem('pending_analytics', '[]');
  } catch (error) {
    // Offline or error - queue for later
    pendingEvents.push({ event, properties, timestamp: new Date().toISOString() });
    localStorage.setItem('pending_analytics', JSON.stringify(pendingEvents));
  }
}

// On page load, retry pending events
window.addEventListener('online', () => {
  const pending = JSON.parse(localStorage.getItem('pending_analytics') || '[]');
  pending.forEach(e => trackWithRetry(e.event, e.properties));
});
```

## Privacy Considerations

- Events are stored in PostHog, a privacy-first analytics platform
- IP addresses are hashed before storage (cannot be reversed)
- User IDs are anonymous unless you provide `distinctId`
- You control what data is sent — OnHyper never tracks automatically without your code

## Need Help?

- Check the [OnHyper Dashboard](https://onhyper.io/dashboard) to see your analytics
- Review the [API Reference](/docs/api) for full endpoint details
- Join our [Discord](https://discord.gg/onhyper) for community support

---

*Questions or feedback? Our support chat (an OnHyper app itself) is always available. Try sending an event and watching it appear in real-time!*