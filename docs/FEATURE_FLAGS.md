# Feature Flags in OnHyper

OnHyper uses a flexible feature flag system to control feature access based on user plans, rollout percentages, and custom rules.

## Overview

Feature flags allow you to:
- Control access to features based on subscription tier (FREE/PRO/BUSINESS)
- Gradually roll out features to a percentage of users
- Apply custom logic for feature access

## Plan-Based Gating

Features can be restricted to specific subscription tiers:

```typescript
{
  name: 'custom_subdomain',
  enabled: true,
  planTier: 'PRO',  // Requires PRO or higher
  rolloutPercentage: 100,
  customRules: undefined
}
```

Plan tiers (in order):
1. `FREE` - Basic access
2. `PRO` - Enhanced features
3. `BUSINESS` - Full access

Users on a higher tier inherit all features from lower tiers.

## Rollout Percentages

Gradually expose features to a percentage of users:

```typescript
{
  name: 'new_dashboard',
  enabled: true,
  planTier: 'FREE',
  rolloutPercentage: 10,  // Only 10% of eligible users
  customRules: undefined
}
```

The rollout is deterministic - the same user always gets the same result based on their userId hash.

## Custom Rules

Advanced conditions for feature access:

```typescript
{
  name: 'beta_api',
  enabled: true,
  planTier: 'FREE',
  rolloutPercentage: 100,
  customRules: {
    type: 'and',
    conditions: [
      { type: 'email_domain', operator: '==', value: '@company.com' },
      { type: 'subdomain_length', operator: '<', value: 6 }
    ]
  }
}
```

### Available Rule Types

| Type | Description | Example |
|------|-------------|---------|
| `plan_tier` | Compare user's plan tier | `{ type: 'plan_tier', operator: '>=', value: 'PRO' }` |
| `subdomain_length` | Check subdomain length | `{ type: 'subdomain_length', operator: '<', value: 6 }` |
| `email_domain` | Match email domain | `{ type: 'email_domain', operator: '==', value: '@company.com' }` |
| `and` | All conditions must pass | `{ type: 'and', conditions: [...] }` |
| `or` | Any condition passes | `{ type: 'or', conditions: [...] }` |
| `not` | Negate a condition | `{ type: 'not', condition: {...} }` |

### Operators

- `==` - Equals
- `!=` - Not equals
- `>` - Greater than (for numbers)
- `<` - Less than (for numbers)
- `>=` - Greater than or equal
- `<=` - Less than or equal
- `contains` - String contains
- `startsWith` - String starts with
- `endsWith` - String ends with

## API Endpoints

### Get All Flags

```bash
GET /api/flags
```

Returns all feature flags with their current status for the authenticated user.

### Check Single Flag

```bash
GET /api/flags/:name
```

Returns whether a specific feature is enabled for the user.

### Update Flag (Admin)

```bash
PUT /api/admin/flags/:name
```

Update a feature flag configuration.

Example:
```bash
curl -X PUT https://onhyper.io/api/admin/flags/custom_subdomain \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "planTier": "PRO",
    "rolloutPercentage": 50,
    "customRules": { "type": "and", "conditions": [] }
  }'
```

## Frontend Integration

### Using the Flags API

```typescript
// Check if a feature is enabled
const response = await fetch('/api/flags/my_feature');
const { enabled } = await response.json();

if (enabled) {
  // Show feature
}
```

### Server-Side Rendering

For SSR, flags are evaluated on the server and passed to the client:

```typescript
// In your API route
const flags = await getUserFlags(userId);
return { flags };
```

## Adding New Feature Flags

1. **Define the flag** in the flags configuration:

```typescript
// src/lib/flags.ts
export const FEATURE_FLAGS: FeatureFlag[] = [
  // ...existing flags
  {
    name: 'new_feature',
    description: 'A cool new feature',
    enabled: true,
    planTier: 'FREE',
    rolloutPercentage: 0,  // Start at 0%
    customRules: undefined
  }
];
```

2. **Check the flag** in your code:

```typescript
const result = await isFeatureEnabled('new_feature', userId);
if (result.enabled) {
  // Show the feature
}
```

3. **Gradually increase rollout**:

```typescript
// Increase to 10%
rolloutPercentage: 10

// Then 50%
rolloutPercentage: 50

// Then 100%
rolloutPercentage: 100
```

## Example: Subdomain Feature

```typescript
{
  name: 'custom_subdomain',
  description: 'Custom short subdomains for PRO users',
  enabled: true,
  planTier: 'PRO',
  rolloutPercentage: 100,
  customRules: {
    type: 'subdomain_length',
    operator: '>=',
    value: 3
  }
}
```

This flag:
- Is enabled for PRO and BUSINESS tiers
- Allows subdomains with 3+ characters
- Is visible to 100% of eligible users

## Best Practices

1. **Start with 0% rollout** - Enable incrementally
2. **Use custom rules for testing** - Target specific users
3. **Document each flag** - Explain why it exists
4. **Clean up old flags** - Remove when fully rolled out
5. **Monitor usage** - Track which features are being used
