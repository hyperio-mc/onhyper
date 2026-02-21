---
title: "Customer Feature Flags: Control Your App's Features in Real-Time"
date: 2026-02-21
author: MC
tags: [onhyper, feature-flags, javascript, api, deployment]
---

You just shipped a new feature. It's live. Users are... not happy. Something's broken, and now you're scrambling to deploy a hotfix.

Or worse: you're doing a slow rollout, watching metrics like a hawk, and at 3 AM you realize the new checkout flow is tanking conversions. But you can't ship a fix until morning.

**There's a better way.**

Feature flags let you toggle functionality on and off without deploying code. Ship confidently, roll back instantly, and control who sees what — all from a dashboard.

OnHyper now supports customer feature flags for your apps. Here's how they work and why you should use them.

## What Are Feature Flags?

A feature flag (also called a feature toggle) is a simple concept: instead of hard-coding whether a feature is enabled, you check a flag at runtime.

```javascript
// Traditional approach: hard-coded
const showNewUI = true; // Change = deploy

// Feature flag approach: dynamic
const flags = await getFeatureFlags();
const showNewUI = flags.new_ui_enabled === true;
```

That flag value comes from somewhere external — a database, an API, a config file. Change the value, and the feature turns on or off. No deployment required.

### Why This Matters

1. **Deploy safely** — Ship code with features disabled, then enable them when ready
2. **Roll back instantly** — Something broken? Turn it off. No hotfix needed.
3. **A/B test** — Show different features to different users
4. **Gradual rollouts** — Enable features for 10% of users, then 50%, then 100%
5. **Kill switches** — Disable problematic features without taking down your app
6. **Environment config** — Different settings for dev, staging, production

Feature flags separate *deployment* from *release*. You can deploy your code whenever you want, but control when (and who) sees your features independently.

## OnHyper Customer Feature Flags

OnHyper lets you create and manage feature flags for each of your apps. Your app can fetch these flags at runtime and adjust its behavior accordingly.

### How It Works

1. You create feature flags in the OnHyper dashboard for your app
2. Your app fetches flags via a simple API call
3. Your code checks the flag values and behaves accordingly
4. You can update flags anytime — no redeployment needed

### Dashboard Management

In your OnHyper dashboard, navigate to your app → **Features** tab:

| Field | Description |
|-------|-------------|
| **Name** | The flag identifier (e.g., `new_checkout`, `beta_feature`) |
| **Value** | The flag value (boolean, number, string, or JSON) |
| **Description** | What this flag controls (optional, for your reference) |

You can:
- **Create** new flags with any name and value
- **Update** flag values in real-time
- **Delete** flags you no longer need

Flag names must start with a letter and can contain letters, numbers, underscores, and hyphens. Values can be up to 1,000 characters.

## Fetching Flags in Your App

The simplest way to use feature flags is to fetch them when your app loads.

### The API

**GET** `/api/appflags/:appId`

Returns all flags for an app as a simple key-value object.

```json
{
  "appId": "app_abc123",
  "flags": {
    "new_ui_enabled": true,
    "max_items": 50,
    "welcome_message": "Welcome to the beta!",
    "feature_config": {
      "theme": "dark",
      "timeout": 30000
    }
  },
  "count": 4
}
```

Values are automatically parsed from their stored string representation:
- `"true"` / `"false"` → booleans
- Numbers → numbers
- JSON objects → objects
- Everything else → strings

### Basic Example

Here's a minimal example to get you started:

```javascript
// Fetch feature flags when app loads
let featureFlags = {};

async function loadFeatureFlags() {
  try {
    // Replace 'YOUR_APP_ID' with your actual app ID
    const response = await fetch('/api/appflags/YOUR_APP_ID');
    const data = await response.json();
    featureFlags = data.flags;
    console.log('Loaded flags:', featureFlags);
  } catch (error) {
    console.error('Failed to load feature flags:', error);
    // Keep using defaults
  }
}

// Check a flag
function isFeatureEnabled(flagName) {
  return featureFlags[flagName] === true;
}

// Get a flag value with a default
function getFeatureValue(flagName, defaultValue) {
  return featureFlags[flagName] ?? defaultValue;
}

// Usage
if (isFeatureEnabled('new_ui_enabled')) {
  showNewUI();
} else {
  showLegacyUI();
}

const maxItems = getFeatureValue('max_items', 10);
displayItems(items.slice(0, maxItems));
```

### Complete Integration Example

Here's a more robust pattern you can use in production:

```javascript
/**
 * Feature Flag Manager
 * Handles loading, caching, and checking feature flags
 */
class FeatureFlags {
  constructor(appId, options = {}) {
    this.appId = appId;
    this.flags = {};
    this.loaded = false;
    this.cacheKey = `feature_flags_${appId}`;
    this.cacheTTL = options.cacheTTL || 60000; // 1 minute default
    this.refreshInterval = options.refreshInterval || 300000; // 5 minutes default
    
    // Start auto-refresh if enabled
    if (options.autoRefresh !== false) {
      this.startAutoRefresh();
    }
  }
  
  /**
   * Load flags from API (with local cache fallback)
   */
  async load() {
    try {
      const response = await fetch(`/api/appflags/${this.appId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      this.flags = data.flags || {};
      this.loaded = true;
      
      // Cache in localStorage for offline fallback
      localStorage.setItem(this.cacheKey, JSON.stringify({
        flags: this.flags,
        timestamp: Date.now(),
      }));
      
      return this.flags;
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      
      // Try loading from cache
      const cached = this.loadFromCache();
      if (cached) {
        this.flags = cached;
        this.loaded = true;
        console.log('Using cached feature flags');
        return this.flags;
      }
      
      // No cache available, use empty flags
      this.flags = {};
      this.loaded = false;
      return this.flags;
    }
  }
  
  /**
   * Load flags from localStorage cache
   */
  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;
      
      const { flags, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > this.cacheTTL) {
        return null;
      }
      
      return flags;
    } catch {
      return null;
    }
  }
  
  /**
   * Check if a feature is enabled (boolean check)
   */
  isEnabled(flagName) {
    return this.flags[flagName] === true;
  }
  
  /**
   * Check if a feature is disabled (convenience method)
   */
  isDisabled(flagName) {
    return !this.isEnabled(flagName);
  }
  
  /**
   * Get a flag value with optional default
   */
  get(flagName, defaultValue = undefined) {
    return this.flags[flagName] ?? defaultValue;
  }
  
  /**
   * Get a string value
   */
  getString(flagName, defaultValue = '') {
    const value = this.flags[flagName];
    return typeof value === 'string' ? value : defaultValue;
  }
  
  /**
   * Get a number value
   */
  getNumber(flagName, defaultValue = 0) {
    const value = this.flags[flagName];
    return typeof value === 'number' ? value : defaultValue;
  }
  
  /**
   * Get an object value
   */
  getObject(flagName, defaultValue = {}) {
    const value = this.flags[flagName];
    return typeof value === 'object' && value !== null ? value : defaultValue;
  }
  
  /**
   * Get all flags
   */
  getAll() {
    return { ...this.flags };
  }
  
  /**
   * Start auto-refresh interval
   */
  startAutoRefresh() {
    this.refreshTimer = setInterval(() => {
      this.load().catch(console.error);
    }, this.refreshInterval);
  }
  
  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Initialize
const featureFlags = new FeatureFlags('app_abc123', {
  cacheTTL: 30000,      // Cache valid for 30 seconds
  refreshInterval: 60000, // Refresh every minute
});

// Load on startup
featureFlags.load().then(() => {
  console.log('Feature flags loaded:', featureFlags.getAll());
});

// Usage
if (featureFlags.isEnabled('dark_mode')) {
  document.body.classList.add('dark-theme');
}

const maxRetries = featureFlags.getNumber('max_retries', 3);

const welcomeConfig = featureFlags.getObject('welcome_banner', {
  enabled: false,
  message: 'Welcome!',
});
```

## Use Cases

### A/B Testing

Run experiments by showing different features to different users:

```javascript
// Get or create a user variant
function getUserVariant() {
  let variant = localStorage.getItem('experiment_variant');
  if (!variant) {
    variant = Math.random() < 0.5 ? 'control' : 'treatment';
    localStorage.setItem('experiment_variant', variant);
  }
  return variant;
}

// Check flags based on variant
const flags = await getFeatureFlags();
const variant = getUserVariant();

if (variant === 'treatment' && flags.new_checkout_enabled) {
  renderNewCheckout();
  trackEvent('checkout_view', { variant: 'new' });
} else {
  renderLegacyCheckout();
  trackEvent('checkout_view', { variant: 'legacy' });
}
```

### Gradual Rollouts

Enable features for a percentage of users:

```javascript
async function initializeApp() {
  const flags = await getFeatureFlags();
  
  // Check if feature is enabled AND user is in rollout group
  const rolloutPercentage = flags.new_feature_rollout_percent || 0;
  const userId = getCurrentUserId(); // Your user identification logic
  const userHash = hashUserId(userId); // Deterministic hash 0-100
  
  if (userHash < rolloutPercentage) {
    enableNewFeature();
  }
}

// Simple hash function for user ID
function hashUserId(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100;
}
```

### Kill Switches

Disable problematic features instantly:

```javascript
// Wrap risky features with a flag check
async function processPayment(paymentData) {
  const flags = await getFeatureFlags();
  
  // Check if payment processing is enabled
  if (flags.payment_processing_disabled) {
    throw new Error(
      'Payments are temporarily disabled. Please try again later.'
    );
  }
  
  // Check if the new processor is enabled
  if (flags.use_new_payment_processor) {
    return newPaymentProcessor.charge(paymentData);
  }
  
  return legacyPaymentProcessor.charge(paymentData);
}

// Similarly for third-party integrations
async function sendNotification(user, message) {
  const flags = await getFeatureFlags();
  
  // Third-party outage? Toggle this flag and notifications queue up
  if (flags.notifications_enabled === false) {
    return queueForLater(user, message);
  }
  
  return notificationService.send(user, message);
}
```

### Feature Toggles

Simple on/off switches for optional features:

```javascript
// UI feature toggles
const flags = await getFeatureFlags();

if (flags.show_banner) {
  renderPromoBanner(flags.banner_message || 'Check out our new features!');
}

if (flags.enable_comments) {
  renderCommentsSection();
}

if (flags.allow_file_uploads) {
  enableFileUploads({
    maxSize: flags.max_file_size_mb || 10,
    allowedTypes: flags.allowed_file_types || ['image/*', 'application/pdf'],
  });
}

// Configuration-driven behavior
const searchConfig = flags.search_config || {};
if (searchConfig.enable_advanced_filters) {
  showAdvancedFilters();
}
if (searchConfig.default_sort) {
  setDefaultSort(searchConfig.default_sort);
}
```

### Environment Configuration

Different settings for different environments:

```javascript
// Your app can adapt based on flag values
const flags = await getFeatureFlags();

const config = {
  apiTimeout: flags.api_timeout_ms || 30000,
  debugMode: flags.debug_mode || false,
  maxRetries: flags.max_retries || 3,
  analyticsEnabled: flags.analytics_enabled !== false,
  maintenanceMode: flags.maintenance_mode || false,
};

if (config.maintenanceMode) {
  showMaintenancePage(flags.maintenance_message);
}

// Use these values throughout your app
const apiClient = new ApiClient({
  timeout: config.apiTimeout,
  retries: config.maxRetries,
});
```

## Best Practices

### 1. Name Flags Clearly

```javascript
// ✅ Good: Clear, descriptive names
"new_checkout_enabled"
"search_debounce_ms"
"api_timeout_seconds"
"dark_mode_default"

// ❌ Bad: Vague or confusing names
"flag1"
"feature"
"new_thing"
"test"
```

### 2. Use Typed Values

Store values in their natural type. OnHyper will parse them automatically:

| Flag Name | Stored Value | Parsed Value |
|-----------|-------------|--------------|
| `max_items` | `"50"` | `50` (number) |
| `debug_mode` | `"true"` | `true` (boolean) |
| `welcome_message` | `"Hello!"` | `"Hello!"` (string) |
| `feature_config` | `{"theme":"dark"}` | `{theme: "dark"}` (object) |

### 3. Provide Defaults

Always have fallback values for when flags can't be loaded:

```javascript
// ✅ Good: Graceful fallback
const timeout = flags.api_timeout || 30000;

// ❌ Bad: App breaks if flag is missing
const timeout = flags.api_timeout; // Could be undefined!
```

### 4. Don't Over-Use Flags

Feature flags add complexity. Use them for:
- Features that might need quick rollback
- A/B tests and experiments
- Gradual rollouts
- Configuration that changes frequently

Don't use them for:
- Code that never changes
- Simple static configuration
- Secrets or sensitive data (use OnHyper's Secrets instead!)

### 5. Clean Up Old Flags

Remove flags you no longer need. If a feature is stable and permanently enabled, remove the flag and simplify your code:

```javascript
// Before (with flag)
if (flags.stable_feature_enabled) {
  doTheThing();
}

// After (feature is stable, remove flag)
doTheThing();
```

### 6. Document Your Flags

Use the description field to note:
- What the flag controls
- When to enable/disable it
- Any dependencies or gotchas

## Managing Flags in the Dashboard

### Creating a Flag

1. Open your app in the OnHyper dashboard
2. Navigate to **Features**
3. Click **Add Feature Flag**
4. Enter:
   - **Name**: `new_feature_enabled`
   - **Value**: `true`
   - **Description**: "Enable the new XYZ feature for all users"
5. Save

### Updating a Flag

1. Find the flag in your list
2. Click **Edit**
3. Change the value (e.g., from `true` to `false` to disable)
4. Save

Changes take effect immediately. Your app will see the new value on its next flag fetch.

### Deleting a Flag

1. Find the flag in your list
2. Click **Delete**
3. Confirm the deletion

**Warning**: Make sure your code has proper defaults before deleting a flag, otherwise `undefined` might cause issues.

## API Reference

### GET /api/appflags/:appId

Fetch all feature flags for an app.

**Request:**
```http
GET /api/appflags/app_abc123
```

**Response:**
```json
{
  "appId": "app_abc123",
  "flags": {
    "new_ui_enabled": true,
    "max_items": 50,
    "welcome_message": "Welcome to the beta!",
    "feature_config": {
      "theme": "dark",
      "timeout": 30000
    }
  },
  "count": 4
}
```

### Managing Flags (Dashboard API)

For programmatic flag management, use the authenticated endpoints:

**List flags:**
```http
GET /api/apps/:appId/features
Authorization: Bearer YOUR_JWT
```

**Create flag:**
```http
POST /api/apps/:appId/features
Authorization: Bearer YOUR_JWT
Content-Type: application/json

{
  "name": "new_feature_enabled",
  "value": "true",
  "description": "Enable the new feature"
}
```

**Update flag:**
```http
PUT /api/apps/:appId/features/new_feature_enabled
Authorization: Bearer YOUR_JWT
Content-Type: application/json

{
  "value": "false",
  "description": "Disabled due to bug"
}
```

**Delete flag:**
```http
DELETE /api/apps/:appId/features/new_feature_enabled
Authorization: Bearer YOUR_JWT
```

## Getting Started

1. **Create an app** on [onhyper.io](https://onhyper.io) if you haven't already
2. **Navigate to Features** in your app dashboard
3. **Add your first flag** — something simple like `debug_mode` with value `false`
4. **Add the code** to fetch and check flags in your app
5. **Test it** — enable/disable the flag and watch your app respond

Feature flags are available now for all OnHyper apps. No extra setup required — just start using them.

---

*Questions? Our support chat (an OnHyper app, naturally) is always available. Or check out the [analytics guide](/blog/analytics-guide) to learn how to track how your features are being used.*