# OnHyper.io Sales Pipeline Funnel

> Complete sales pipeline implementation plan with recommended tools, integrations, and checklists.

---

## Table of Contents
1. [Recommended Stack](#recommended-stack)
2. [Landing Page Lead Capture](#1-landing-page-lead-capture)
3. [Email Welcome Sequence](#2-email-welcome-sequence)
4. [CRM Pipeline Stages](#3-crm-pipeline-stages)
5. [Analytics Events](#4-analytics-events)
6. [Implementation Plan](#5-implementation-plan)
7. [Checklists](#implementation-checklists)

---

## Recommended Stack

| Service | Purpose | Pricing | Notes |
|---------|---------|---------|-------|
| **Pipedrive** | CRM | $14/user/mo | Simple sales pipeline, easy automation |
| **Resend** | Transactional Email API | Free → $20/mo | Developer-friendly, reliable delivery |
| **Buttondown** | Newsletter | Free → $9/mo | Simple newsletter, good for developers |
| **PostHog** | Analytics | Free (1M events) | Self-hostable, session replay, feature flags |

---

## 1. Landing Page Lead Capture

### Current State
- Landing page exists at `onhyper-production.up.railway.app`
- Has pricing section and CTA to `/signup`
- No newsletter/waitlist capture (only full account creation)

### Recommended Lead Capture Strategy

#### A. Newsletter/Waitlist Signup Form

**Add to landing page hero section or bottom CTA:**

```svelte
<!-- Simple email capture before full signup -->
<section class="py-12 px-6 bg-surface-alt">
  <div class="max-w-xl mx-auto text-center">
    <h3 class="text-2xl font-bold mb-2">Stay in the loop</h3>
    <p class="text-text-secondary mb-6">
      Join 500+ developers building secure AI apps. Get tips, updates, and early access to new features.
    </p>
    <form action="/api/subscribe" method="POST" class="flex gap-3 max-w-md mx-auto">
      <input 
        type="email" 
        name="email" 
        placeholder="you@example.com" 
        required
        class="flex-1 px-4 py-3 rounded-lg border border-border bg-surface focus:ring-2 focus:ring-accent"
      />
      <button type="submit" class="px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90">
        Subscribe
      </button>
    </form>
    <p class="text-text-muted text-xs mt-3">No spam. Unsubscribe anytime.</p>
  </div>
</section>
```

#### B. Free Tool Lead Magnet: "API Key Security Scanner"

**Concept:** A simple web tool that checks if a URL has exposed API keys.

**How it works:**
1. User enters a GitHub URL or website URL
2. Tool scans for common API key patterns (sk-*, api_key=, bearer tokens, etc.)
3. Reports potential exposures (without actually exposing them)

**Why this works:**
- Immediate value - security insight without signup
- Viral potential - developers share interesting findings
- Natural lead-in: "We found potential exposures. OnHyper prevents this."

**Implementation:**
```javascript
// Free tool endpoint at /tools/security-scan
const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,           // OpenAI keys
  /sk-ant-[a-zA-Z0-9-]{20,}/g,      // Anthropic keys
  /xox[baprs]-[a-zA-Z0-9-]{10,}/g, // Slack tokens
  /api_key\s*[=:]\s*['"][^'"]+['"]/gi,
  /bearer\s+[a-zA-Z0-9-._~+/]+=*/gi,
];

// Scan URL and return findings (masked for safety)
// Upsell: "Protect your keys with OnHyper"
```

**Lead capture:**
- Show teaser results without signup
- Full report requires email (added to pipeline)

#### C. Downloadable Resource: "API Security Checklist for Frontend Apps"

**Content outline:**
- 10 security checks every frontend developer should do
- Common leak vectors (Git, console.log, error messages)
- When to use client-side vs server-side vs proxy
- OnHyper pitch at the end

**Format:** PDF or simple web page at `/resources/api-security-checklist`

---

## 2. Email Welcome Sequence

### Email 1: Welcome + What to Expect
**Send:** Immediately after signup (via Resend webhook or Resend API)

**Subject:** Welcome to OnHyper - your API keys are safe here 🚀

```
Hi {{name}},

Welcome to OnHyper! You just made your API keys exponentially safer.

Here's what you can do now:

1. Add your first API key
   → https://onhyper.io/keys
   Store your OpenAI, Anthropic, Ollama, or other keys securely.

2. Build your first app
   → https://onhyper.io/apps/new
   Write HTML/CSS/JS and call APIs through our secure proxy.

3. Check out the docs
   → https://onhyper.io/docs
   Quick start guide and API reference.

---

What to expect from us:
• Tips on building AI-powered apps securely
• New proxy endpoints and features (we're adding more soon)
• Occasional product updates (no spam, promised)

If you hit any blockers, reply to this email. I read every response.

— The OnHyper Team
https://onhyper.io
```

---

### Email 2: Value - Quick Win Tutorial
**Send:** 2 days after signup

**Subject:** Build an AI chat app in 15 minutes (no backend needed)

```
Hey {{name}},

Let's build something real.

One of the most common questions we get: "How do I call OpenAI from a static site?"

Here's the entire implementation:

---

Step 1: Add your OpenAI key
https://onhyper.io/keys
Add key name: OPENAI_API_KEY

Step 2: Create a new app
https://onhyper.io/apps/new

Step 3: Paste this code:

<script>
async function chat(message) {
  const res = await fetch('/proxy/openai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: message }]
    })
  });
  return await res.json();
}
</script>

That's it. Your key stays server-side. The user never sees it.

---

Try it now and reply with a link to what you built. I'd love to see it.

Next email: How to handle rate limiting and errors gracefully.

— OnHyper Team
```

---

### Email 3: Engagement - Feedback + Community
**Send:** 7 days after signup

**Subject:** Quick question about your experience

```
Hi {{name}},

You've been with us for a week now. Quick question:

What's been the biggest blocker for you?

[ ] Haven't had time to try it yet
[ ] The setup was confusing
[ ] I'm not sure what to build
[ ] Other (reply and tell me)

---

Also, two things:

1. We're building a community
   → https://discord.gg/onhyper (placeholder)
   Connect with other developers building AI apps securely.

2. We're hiring feedback
   → Reply with any feature requests or pain points
   First 10 responders get a free month of Pro.

Your feedback shapes what we build next.

— OnHyper Team
```

---

### Email Sequence Configuration

| Email | Delay | Trigger | Purpose |
|-------|-------|---------|---------|
| Email 1 | Immediate | Account signup | Welcome, set expectations |
| Email 2 | +2 days | Signup date | Quick win tutorial |
| Email 3 | +7 days | Signup date | Engagement, feedback |

**Implementation (Resend):**
```typescript
// After successful signup, queue welcome sequence
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmail(email: string, name: string) {
  await resend.emails.send({
    from: 'OnHyper <hello@onhyper.io>',
    to: email,
    subject: 'Welcome to OnHyper - your API keys are safe here 🚀',
    html: generateWelcomeTemplate(name),
  });
  
  // Schedule follow-ups (store in database or use Resend scheduling)
  await scheduleEmail(email, 'tutorial', 2 * 24 * 60 * 60 * 1000); // 2 days
  await scheduleEmail(email, 'feedback', 7 * 24 * 60 * 60 * 1000); // 7 days
}
```

---

## 3. CRM Pipeline Stages

### Pipeline Structure

```
┌──────────┐    ┌───────────┐    ┌───────┐    ┌──────┐    ┌─────────┐
│   LEAD   │───>│ QUALIFIED │───>│ TRIAL │───>│ PAID │───>│CHURNED/ │
│          │    │           │    │       │    │      │    │RETAINED │
└──────────┘    └───────────┘    └───────┘    └──────┘    └─────────┘
```

### Stage Definitions

| Stage | Entry Criteria | Exit Criteria | Notes |
|-------|---------------|---------------|-------|
| **LEAD** | Email captured (newsletter, lead magnet, or inquiry) | Engaged with content or requested demo | Top of funnel |
| **QUALIFIED** | Visited pricing page OR opened 2+ emails OR clicked product link | Started signup or booked call | Marketing qualified lead (MQL) |
| **TRIAL** | Created account (FREE plan) | Upgraded to paid OR inactive for 30+ days | Onboarding is critical here |
| **PAID** | Active subscription (HOBBY, PRO, or BUSINESS) | Cancelled or downgraded | Track usage and satisfaction |
| **CHURNED** | Cancelled subscription or inactive for 60+ days | Re-subscribed | Win-back campaigns |
| **RETAINED** | Active for 6+ months with consistent usage | N/A | Testimonial/referral candidates |

### Detailed Criteria

#### Lead → Qualified
- **Automatic qualification signals:**
  - Visited `/signup` or `/pricing` page
  - Downloaded lead magnet
  - Used free tool and submitted email
  - Opened 2+ marketing emails
  - Clicked link to product page

- **Manual qualification:**
  - Requested demo via email
  - Engaged on social media with purchase intent

#### Qualified → Trial
- **Conversion actions:**
  - Created account (becomes FREE plan user)
  - Completed onboarding (added first API key)

#### Trial → Paid
- **Upgrade triggers:**
  - Exceeded free tier limits
  - Reached 80% of free tier usage (proactive upgrade prompt)
  - Requested custom domain feature
  - Team collaboration need (Business tier)

- **Risk indicators (may churn instead):**
  - No app created within 7 days
  - No API key added within 3 days
  - Zero proxy requests in 14 days

#### Paid → Churned
- **Churn signals:**
  - Subscription cancelled
  - No usage for 30+ days
  - Credit card fails and not updated within 7 days

#### Churned → Retained (Win-back)
- **Re-engagement:**
  - Win-back email sequence
  - Discount offer for returning
  - New feature announcement

### Pipedrive Setup

**Custom Fields:**
- `source` - Lead source (newsletter, lead_magnet, organic, referral, social)
- `apps_created` - Number of apps created
- `proxy_requests` - Total proxy requests
- `last_active` - Last activity timestamp
- `plan` - Current plan (FREE, HOBBY, PRO, BUSINESS)
- `signup_date` - Account creation date

**Automations:**
1. New signup → Create Deal in "Trial" stage
2. Free user exceeds 80 requests/day → Move to "Hot Trial", create task
3. Payment received → Move to "Paid", update plan field
4. No activity for 14 days → Create follow-up task
5. Subscription cancelled → Move to "Churned", send win-back sequence

---

## 4. Analytics Events

### PostHog Event Tracking

#### Core Events to Track

| Event Name | Properties | Description |
|------------|------------|-------------|
| `page_view` | `path`, `referrer` | All page views |
| `signup` | `email`, `plan`, `source` | Account created |
| `login` | `email` | User logged in |
| `api_key_added` | `key_name` (not value!) | Secret stored |
| `app_created` | `app_id`, `app_name` | New app published |
| `app_updated` | `app_id` | App edited |
| `app_deleted` | `app_id` | App removed |
| `proxy_request` | `endpoint`, `status`, `duration_ms`, `app_id` | Request proxied |
| `usage_warning` | `percentage` | 80% of limit reached |
| `upgrade_clicked` | `from_plan`, `to_plan` | Upgrade CTA clicked |
| `upgrade_completed` | `from_plan`, `to_plan`, `revenue` | Payment successful |
| `downgrade_clicked` | `from_plan`, `to_plan` | Downgrade initiated |
| `churn` | `plan`, `reason` | Subscription cancelled |

### Implementation Code

```typescript
// src/lib/analytics.ts
import posthog from 'posthog-js';

// Initialize PostHog
export function initAnalytics() {
  if (typeof window !== 'undefined' && process.env.POSTHOG_KEY) {
    posthog.init(process.env.POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      capture_pageviews: false, // We'll do this manually for control
    });
  }
}

// Identify user after login/signup
export function identifyUser(userId: string, email: string, plan: string) {
  posthog.identify(userId, {
    email,
    plan,
    signup_date: new Date().toISOString(),
  });
}

// Track signup
export function trackSignup(email: string, plan: string, source: string = 'organic') {
  posthog.capture('signup', {
    email,
    plan,
    source,
  });
}

// Track API key added
export function trackApiKeyAdded(keyName: string) {
  posthog.capture('api_key_added', {
    key_name: keyName, // e.g., "OPENAI_API_KEY"
  });
}

// Track app created
export function trackAppCreated(appId: string, appName: string) {
  posthog.capture('app_created', {
    app_id: appId,
    app_name: appName,
  });
}

// Track proxy request (server-side via PostHog Node library)
export function trackProxyRequest(
  endpoint: string,
  status: number,
  duration: number,
  appId: string,
  userId: string
) {
  // Use PostHog Node.js SDK for server-side tracking
  posthog.capture('proxy_request', {
    distinct_id: userId,
    endpoint,
    status,
    duration_ms: duration,
    app_id: appId,
  });
}

// Track upgrade
export function trackUpgrade(fromPlan: string, toPlan: string) {
  posthog.capture('upgrade_completed', {
    from_plan: fromPlan,
    to_plan: toPlan,
  });
  
  // Update user properties
  posthog.people.set({
    plan: toPlan,
    upgrade_date: new Date().toISOString(),
  });
}
```

### Server-Side PostHog Integration

```typescript
// Server-side tracking in proxy.ts
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_KEY!);

// In proxy handler, after successful request
await posthog.capture({
  distinctId: userId,
  event: 'proxy_request',
  properties: {
    endpoint,
    status: response.status,
    duration_ms: duration,
    app_id: appId,
  },
});

// Shutdown on process exit
process.on('SIGTERM', () => posthog.shutdown());
```

### PostHog Dashboards

**Dashboard 1: Funnel Overview**
- Signups (daily/weekly)
- Activation rate (signup → first app)
- Trial to paid conversion rate
- Revenue (MRR)

**Dashboard 2: Product Usage**
- Total proxy requests (daily)
- Requests by endpoint
- Error rate
- Top apps by request volume

**Dashboard 3: User Engagement**
- DAU/MAU ratio
- Average apps per user
- Average API keys per user
- Feature adoption (% users with keys, with apps)

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### Code Changes in OnHyper

- [ ] **Add email capture API endpoint**
  - `POST /api/subscribe` - simple newsletter signup
  - Store in new `subscribers` table or send directly to Buttondown/Resend

- [ ] **Add PostHog client-side tracking**
  - Install `posthog-js`
  - Initialize in root layout
  - Add `page_view` tracking on route changes

- [ ] **Add PostHog server-side tracking**
  - Install `posthog-node`
  - Track proxy requests, signups, upgrades

- [ ] **Add analytics events to auth flow**
  - `signup` event on account creation
  - `identify_user` after login
  - Track `source` parameter from URL

#### External Service Setup

- [ ] **PostHog Setup**
  - Create account at posthog.com
  - Get project API key
  - Add `POSTHOG_KEY` to `.env`
  - Create initial dashboards

- [ ] **Resend Setup**
  - Create account at resend.com
  - Verify domain (onhyper.io)
  - Get API key
  - Add `RESEND_API_KEY` to `.env`
  - Create email templates

- [ ] **Buttondown Setup** (if using for newsletter)
  - Create account at buttondown.email
  - Set up onhyper newsletter
  - Integrate subscribe endpoint

---

### Phase 2: Lead Capture (Week 3)

#### Code Changes in OnHyper

- [ ] **Add newsletter signup section to landing page**
  - Add below pricing section
  - Style consistently with existing design

- [ ] **Create lead magnet: API Security Scanner**
  - New route: `/tools/security-scan`
  - Basic URL scanner for exposed keys
  - Gate full results behind email capture

- [ ] **Create downloadable resource page**
  - `/resources/api-security-checklist`
  - Simple checklist with email gate

#### External Service Setup

- [ ] **Pipedrive Setup**
  - Create account
  - Set up pipeline stages (Lead → Qualified → Trial → Paid → Churned)
  - Create custom fields (source, plan, apps_created, etc.)
  - Get API key for integrations

---

### Phase 3: Email Automation (Week 4)

#### Code Changes in OnHyper

- [ ] **Implement welcome email on signup**
  - Call Resend API after successful signup
  - Store email sequence state in user record

- [ ] **Add email preferences to user dashboard**
  - Toggle for marketing emails
  - Unsubscribe link in footer

#### Email Content Creation

- [ ] **Write Email 1: Welcome**
  - Template with dynamic name
  - Add to Resend

- [ ] **Write Email 2: Tutorial**
  - Code examples
  - Screenshots/links

- [ ] **Write Email 3: Feedback**
  - Simple survey or reply-based

- [ ] **Set up email scheduling**
  - Either Resend scheduling or database-driven cron

---

### Phase 4: CRM Integration (Week 5)

#### Code Changes in OnHyper

- [ ] **Add Pipedrive webhook endpoints**
  - `POST /api/webhooks/signup` - create deal
  - `POST /api/webhooks/upgrade` - update deal
  - `POST /api/webhooks/usage` - update fields

- [ ] **Add internal CRM sync job**
  - Sync user data to Pipedrive daily
  - Update deal stage based on plan

#### Pipedrive Automation

- [ ] **Create automations in Pipedrive**
  - "New signup" → create deal in Trial
  - "Usage spike" → create task for follow-up
  - "No activity 14 days" → create task
  - "Cancelled" → move to Churned, trigger win-back

---

### Phase 5: Analytics Dashboard (Week 6)

#### PostHog Configuration

- [ ] **Create conversion funnels**
  - Landing → Signup → First App → First Proxy Request → Upgrade
  - Track drop-off points

- [ ] **Set up retention cohorts**
  - Weekly return rate by signup cohort
  - Product stickiness (DAU/MAU)

- [ ] **Create alerting**
  - Error rate spike
  - Unusual traffic patterns
  - Conversion rate drops

- [ ] **Set up session replay for QA**
  - Sample 10% of sessions
  - Use for UX debugging

---

### Phase 6: Newsletter & Content (Ongoing)

#### Content Creation

- [ ] **Create monthly newsletter content**
  - Tips and tutorials
  - Feature updates
  - User spotlights

- [ ] **Set up RSS feed for blog**
  - Auto-post to newsletter

- [ ] **Create email templates for common scenarios**
  - Usage limit warnings
  - Payment failures
  - Win-back campaigns

---

## Implementation Checklists

### Week 1-2: Foundation
- [ ] Install `posthog-js` in frontend
- [ ] Install `posthog-node` in backend
- [ ] Add `POSTHOG_KEY` to environment
- [ ] Initialize PostHog in root layout
- [ ] Add page_view tracking on route changes
- [ ] Track signup event with source property
- [ ] Track login event
- [ ] Track api_key_added event
- [ ] Track app_created event
- [ ] Track proxy_request event (server-side)
- [ ] Create Resend account and verify domain
- [ ] Add `RESEND_API_KEY` to environment

### Week 3: Lead Capture
- [ ] Create `POST /api/subscribe` endpoint
- [ ] Add newsletter signup section to landing page
- [ ] Create `/tools/security-scan` free tool
- [ ] Create `/resources/api-security-checklist` page
- [ ] Create Pipedrive account
- [ ] Set up pipeline stages
- [ ] Add custom fields

### Week 4: Email Automation
- [ ] Write welcome email template
- [ ] Write tutorial email template  
- [ ] Write feedback email template
- [ ] Implement send on signup
- [ ] Implement email scheduling
- [ ] Add email preferences to dashboard

### Week 5: CRM Integration
- [ ] Add Pipedrive API integration
- [ ] Create deal on signup
- [ ] Update deal on upgrade
- [ ] Update deal on churn
- [ ] Set up Pipedrive automations

### Week 6: Analytics Dashboard
- [ ] Create conversion funnel in PostHog
- [ ] Create retention cohorts
- [ ] Set up alerts
- [ ] Configure session replay sampling

---

## Database Additions

### New Tables Needed

```sql
-- Newsletter subscribers (separate from users)
CREATE TABLE subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT,              -- 'newsletter', 'lead_magnet', 'free_tool'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at DATETIME,
  unsubscribed_reason TEXT
);

-- Email sequence tracking
CREATE TABLE email_sequences (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subscriber_id TEXT,
  sequence_type TEXT NOT NULL, -- 'welcome', 'winback', etc.
  current_step INTEGER DEFAULT 0,
  last_sent_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE SET NULL
);

-- Event log (for analytics backup/debugging)
CREATE TABLE event_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  properties TEXT,           -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_source ON subscribers(source);
CREATE INDEX idx_email_sequences_user ON email_sequences(user_id);
CREATE INDEX idx_event_log_user ON event_log(user_id);
CREATE INDEX idx_event_log_type ON event_log(event_type);
CREATE INDEX idx_event_log_created ON event_log(created_at);
```

---

## Environment Variables

Add to `.env`:

```bash
# PostHog Analytics
POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTHOG_HOST=https://app.posthog.com

# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=hello@onhyper.io

# Pipedrive CRM
PIPEDRIVE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxx
PIPEDRIVE_COMPANY_DOMAIN=onhyper

# Buttondown Newsletter (optional)
BUTTONDOWN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxx
BUTTONDOWN_USERNAME=onhyper
```

---

## Summary: What to Build First

### Priority 1: Analytics (Must Have)
Without tracking, everything else is flying blind.
1. PostHog setup
2. Basic event tracking (signup, app created, proxy request)
3. User identification

### Priority 2: Email on Signup (High Impact)
First impression matters. The welcome sequence drives activation.
1. Resend setup
2. Welcome email on signup
3. Tutorial email (2 days later)

### Priority 3: CRM Integration (Operational)
Essential for scaling, but manual tracking works for <100 users.
1. Pipedrive account
2. Pipeline configuration
3. Sync on signup/upgrade

### Priority 4: Lead Magnets (Growth)
Nice to have for expanding funnel, but organic signups work first.
1. Newsletter section on landing page
2. Free tool (security scanner)

---

*Sales Funnel v1.0 — February 2026*
*Created for OnHyper.io*