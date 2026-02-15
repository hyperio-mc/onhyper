# OnHyper Pipedrive CRM Setup Guide

> **Purpose:** Complete configuration guide for tracking pilot users, ICP scoring, and waitlist integration  
> **Plan:** Essential ($14/user/month) - all features below are available on this tier  
> **Created:** February 15, 2026

---

## Table of Contents
1. [Account Signup](#1-account-signup)
2. [Pipeline Configuration](#2-pipeline-configuration)
3. [Custom Fields for ICP Scoring](#3-custom-fields-for-icp-scoring)
4. [Lead Source Tracking](#4-lead-source-tracking)
5. [Webhook Integrations](#5-webhook-integrations)
6. [Automation Workflows](#6-automation-workflows)
7. [API Integration Code](#7-api-integration-code)
8. [Essential Plan Limitations & Workarounds](#8-essential-plan-limitations--workarounds)

---

## 1. Account Signup

### Initial Setup
1. Go to [pipedrive.com](https://www.pipedrive.com) and click "Try it free"
2. Enter email: `rakis@onhyper.io` (or your preferred business email)
3. Complete email verification
4. Name your company: **OnHyper**
5. Select industry: **Technology / Software**
6. Team size: **Just me** (can add later)

### Plan Selection
- Start with **14-day free trial** (includes all features)
- After trial, subscribe to **Essential Plan ($14/user/month)**
- Features included on Essential:
  - Unlimited deals
  - Custom fields (up to 100)
  - Basic automation
  - API access
  - Email integration
  - Mobile app

---

## 2. Pipeline Configuration

### Pipeline Name: "OnHyper Sales Pipeline"

Create the following stages in order:

| Stage | Order | Description | Entry Criteria | Exit Criteria |
|-------|-------|-------------|----------------|---------------|
| **1. Lead** | 1 | Email captured (newsletter, lead magnet, inquiry) | Any email capture | Engaged with content or requested info |
| **2. Qualified** | 2 | Marketing Qualified Lead (MQL) | Visited pricing OR opened 2+ emails OR clicked product link | Started signup or booked call |
| **3. Trial** | 3 | Active FREE plan user | Created account | Upgraded to paid OR inactive 30+ days |
| **4. Hot Trial** | 4 | High-engagement trial user | 80%+ of free tier usage | Converted to paid OR churned |
| **5. Paid** | 5 | Active paid subscription | Payment received | Cancelled or downgraded |
| **6. Churned** | 6 | Cancelled or inactive | Subscription cancelled OR 60+ days inactive | Re-subscribed |
| **7. Retained** | 7 | Long-term customer | Active 6+ months with consistent usage | N/A (terminal state) |

### Stage Probabilities
Set win probabilities for forecasting:
- Lead: 5%
- Qualified: 15%
- Trial: 25%
- Hot Trial: 50%
- Paid: 100% (closed-won)
- Churned: 0% (closed-lost)
- Retained: 100% (closed-won, high LTV)

### How to Create Pipeline Stages
1. Go to **Settings** (gear icon) → **Pipelines**
2. Click **+ Add pipeline**
3. Name: "OnHyper Sales Pipeline"
4. Add stages in order listed above
5. Set deal probabilities for each stage

---

## 3. Custom Fields for ICP Scoring

### Required Custom Fields (Person/Deal level)

Create these custom fields at **Settings → Custom fields**:

#### ICP Scoring Fields

| Field Name | Type | Location | Description |
|------------|------|----------|-------------|
| `icp_score_auto` | Number | Deal | Auto-calculated score (0-10) |
| `icp_score_manual` | Number | Deal | Manual review score (0-10) |
| `icp_score_final` | Number | Deal | Combined final score |
| `icp_status` | Dropdown | Deal | pending / approved / rejected / waitlist |

#### Project Qualification Fields

| Field Name | Type | Location | Options/Notes |
|------------|------|----------|---------------|
| `project_description` | Text (Large) | Deal | "What are you building?" response |
| `project_link` | Text | Deal | GitHub/URL provided |
| `link_validation` | Dropdown | Deal | verified / pending / broken / none |
| `github_recent_commits` | Checkbox | Deal | True if commits in last 90 days |

#### API Usage Fields

| Field Name | Type | Location | Options/Notes |
|------------|------|----------|---------------|
| `apis_used` | Multi-select | Deal | OpenAI, Anthropic, OpenRouter, Google, Replicate, Ollama, Other |
| `primary_api` | Single-select | Deal | OpenAI / Anthropic / OpenRouter / Other |

#### Email/Tier Fields

| Field Name | Type | Location | Options/Notes |
|------------|------|----------|---------------|
| `email_type` | Dropdown | Person | custom_domain / gmail / edu / disposable |
| `access_tier` | Single-select | Deal | founding_builder / early_access / waitlist / public |
| `badge_type` | Single-select | Deal | founding_builder / early_adopter / none |

#### Referral Fields

| Field Name | Type | Location | Options/Notes |
|------------|------|----------|---------------|
| `referral_source` | Dropdown | Person | Twitter / GitHub / Referral / Product Hunt / Search / Other |
| `referral_code` | Text | Person | User's unique referral code |
| `referred_by` | Text (Person link) | Deal | Who referred this person |
| `referral_count` | Number | Person | Number of people they've referred |
| `invite_codes_remaining` | Number | Person | Unused invite codes (starts at 3-5) |

#### Engagement Metrics (Auto-updated via API)

| Field Name | Type | Location | Notes |
|------------|------|----------|-------|
| `apps_created` | Number | Deal | Count of published apps |
| `proxy_requests_total` | Number | Deal | Total API proxy calls |
| `proxy_requests_monthly` | Number | Deal | Current month requests |
| `last_active` | Date | Deal | Last activity timestamp |
| `days_since_signup` | Number | Deal | Calculated from signup_date |
| `plan_type` | Single-select | Deal | FREE / HOBBY / PRO / BUSINESS |

### ICP Scoring Formula

Calculate `icp_score_auto` on application:

```
icp_score_auto = Q1_score + Q2_score + Q3_score + Email_score
```

**Question 1: "What are you building?" (0-3 points)**
- 3 pts: Specific AI project, mentions API, shows progress
- 2 pts: Has project but vague on AI usage
- 1 pt: Idea stage, planning to build
- 0 pts: No project, just curious

**Question 2: "Link to your work" (0-3 points)**
- 3 pts: GitHub with recent commits OR live demo
- 2 pts: GitHub with older commits OR Twitter with builder content
- 1 pt: Any valid link
- 0 pts: No link or broken

**Question 3: "Which AI APIs?" (0-2 points)**
- 2 pts: 2+ APIs selected
- 1 pt: 1 API selected
- 0 pts: "Not yet"

**Email Score (0-2 points)**
- 2 pts: Custom domain
- 1 pt: Gmail with strong Q1-3 responses
- 0 pts: Student/disposable email

**Auto-Qualification Rules:**
- Score 8-10 → Auto-approve to Early Access
- Score 5-7 → Manual review, add to Waitlist
- Score 0-4 → Reject with polite message

---

## 4. Lead Source Tracking

### Source Options Configuration

In **Settings → Leads → Lead Sources**, add:

| Source | Description | Tracking Method |
|--------|-------------|-----------------|
| Twitter/X | Social media | URL param `?source=twitter` |
| GitHub | Developer community | URL param `?source=github` |
| Referral | User invite | Referral code tracking |
| Product Hunt | Launch day | URL param `?source=producthunt` |
| Search | Organic/Direct | Default attribution |
| Blog | Content marketing | URL param `?source=blog` |
| Newsletter | Email campaigns | Email link tracking |
| Demo | Interactive demo | URL param `?source=demo` |

### UTM Parameter Mapping

Track these UTM parameters via URL:

```
https://onhyper.io/access?utm_source=twitter&utm_medium=organic&utm_campaign=launch
```

Map to Pipedrive:
- `utm_source` → `referral_source` field
- `utm_medium` → Custom field `marketing_medium`
- `utm_campaign` → Custom field `campaign_name`

### Referral Link Format

User's unique referral link:
```
https://onhyper.io/access?ref=USER_REFERRAL_CODE
```

When someone signs up via referral:
1. Create Person with `referral_source = "Referral"`
2. Set `referred_by` to referrer's Person ID
3. Increment referrer's `referral_count`
4. Give both parties position boost (+10 referrer, +5 referred)

---

## 5. Webhook Integrations

### Webhook Endpoints to Create

Set up these webhooks in **Settings → Tools → Webhooks**:

#### 1. New Signup Webhook
**Trigger:** Person created  
**Purpose:** Create initial deal in Lead stage

```json
POST https://onhyper.io/api/webhooks/pipedrive/signup

{
  "event": "person.created",
  "person_id": 12345,
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response actions:**
- Create new Deal in "Lead" stage
- Link to Person
- Set initial custom field values
- Queue welcome email via Resend

#### 2. Deal Stage Change Webhook
**Trigger:** Deal updated (stage_id changed)  
**Purpose:** Trigger stage-specific automations

```json
POST https://onhyper.io/api/webhooks/pipedrive/stage-change

{
  "event": "deal.updated",
  "deal_id": 67890,
  "previous_stage": 1,
  "new_stage": 3,
  "person_id": 12345
}
```

**Actions by stage:**
- Lead → Qualified: Mark MQL, trigger nurture sequence
- Qualified → Trial: Send activation email, create user account
- Trial → Hot Trial: Proactive upgrade outreach
- Trial → Paid: Celebrate, assign customer success
- Paid → Churned: Trigger win-back sequence
- Any → Retained: Request testimonial

#### 3. ICP Score Update Webhook
**Trigger:** Custom field updated  
**Purpose:** Recalculate qualification status

```json
POST https://onhyper.io/api/webhooks/pipedrive/icp-score

{
  "event": "deal.updated",
  "deal_id": 67890,
  "field_key": "icp_score_auto",
  "new_value": 8
}
```

**Actions:**
- Score >= 8 → Auto-approve, move to Qualified + notify
- Score 5-7 → Flag for manual review
- Score < 5 → Auto-reject with polite email

### Webhook Setup Instructions

1. Go to **Settings → Tools → Webhooks**
2. Click **+ Add webhook**
3. Enter your endpoint URL
4. Select events to subscribe to:
   - `person.created`
   - `person.updated`
   - `deal.created`
   - `deal.updated`
   - `deal.deleted`
5. Test with sample payload
6. Save and activate

---

## 6. Automation Workflows

### Essential Plan Automations (Built-in)

Create these in **Settings → Automation**:

#### Automation 1: Welcome Email on Signup
```
Trigger: Person created
Condition: Email contains "@" (always true)
Action: Send email via integration
  - Template: Welcome email
  - Delay: Immediately
```

#### Automation 2: Trial to Hot Trial Promotion
```
Trigger: Deal updated
Condition: 
  - Stage = "Trial" AND
  - proxy_requests_monthly >= 80 (via update from app)
Action: 
  - Move deal to "Hot Trial"
  - Create activity: "Reach out - upgrade opportunity"
  - Send email: "Upgrade perks" template
```

#### Automation 3: Inactivity Follow-up
```
Trigger: Deal updated (last_active field)
Condition: 
  - Stage IN ["Trial", "Hot Trial"] AND
  - last_active > 14 days ago
Action:
  - Create activity: "Re-engagement call"
  - Send email: "We miss you" template
```

#### Automation 4: Referral Reward
```
Trigger: Person updated
Condition: referral_count increased
Action:
  - Update deal: position_boost = referral_count * 10
  - Send email: "You jumped X spots!" template
```

#### Automation 5: Churn Win-back
```
Trigger: Deal moved to "Churned"
Action:
  - Create activity: "Win-back outreach 30 days"
  - Schedule activity: "Win-back outreach 60 days"
  - Add tag: "churned_need_winback"
```

### Advanced Automations (Via Zapier - External)

For more complex workflows, use Zapier integration:

| Trigger | Action |
|---------|--------|
| New waitlist signup | Create Person in Pipedrive |
| User reaches 80% tier limit | Update proxy_requests field |
| Payment received in Stripe | Move deal to Paid, update plan_type |
| Subscription cancelled in Stripe | Move deal to Churned |
| NPS survey submitted | Update satisfaction field, create activity |

---

## 7. API Integration Code

### Sync New Signup to Pipedrive

```typescript
// src/lib/pipedrive.ts
import axios from 'axios';

const PIPEDRIVE_API_KEY = process.env.PIPEDRIVE_API_TOKEN;
const PIPEDRIVE_DOMAIN = process.env.PIPEDRIVE_COMPANY_DOMAIN || 'onhyper';

const api = axios.create({
  baseURL: `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1`,
  params: { api_token: PIPEDRIVE_API_KEY }
});

interface WaitlistApplication {
  email: string;
  name?: string;
  projectDescription: string;
  projectLink?: string;
  apisUsed: string[];
  referralSource: string;
}

export async function createPipedrivePerson(application: WaitlistApplication) {
  // Calculate ICP score
  const icpScore = calculateICPScore(application);
  
  // Create Person
  const person = await api.post('/persons', {
    name: application.name || application.email.split('@')[0],
    email: [{ value: application.email, primary: true }],
    'referral_source': application.referralSource,
    'email_type': getEmailType(application.email),
    'icp_status': icpScore >= 8 ? 'approved' : icpScore >= 5 ? 'pending' : 'rejected'
  });
  
  // Create Deal
  const deal = await api.post('/deals', {
    title: `OnHyper Access - ${application.email}`,
    person_id: person.data.data.id,
    stage_id: icpScore >= 8 ? 2 : 1, // Qualified vs Lead
    'icp_score_auto': icpScore,
    'project_description': application.projectDescription,
    'project_link': application.projectLink || '',
    'apis_used': application.apisUsed.join(','),
    'access_tier': icpScore >= 8 ? 'early_access' : 'waitlist'
  });
  
  return { person: person.data, deal: deal.data };
}

function calculateICPScore(app: WaitlistApplication): number {
  let score = 0;
  
  // Q1: Project description (0-3)
  if (app.projectDescription.length > 50 && 
      /openai|claude|anthropic|gpt|ai|api/i.test(app.projectDescription)) {
    score += 3;
  } else if (app.projectDescription.length > 20) {
    score += 2;
  } else if (app.projectDescription.length > 0) {
    score += 1;
  }
  
  // Q2: Project link (0-3)
  if (app.projectLink) {
    if (app.projectLink.includes('github.com')) {
      score += 3; // Assume recent commits for now
    } else {
      score += 1;
    }
  }
  
  // Q3: APIs used (0-2)
  score += Math.min(app.apisUsed.length, 2);
  
  // Email type (0-2)
  if (getEmailType(app.email) === 'custom_domain') {
    score += 2;
  } else if (getEmailType(app.email) === 'gmail') {
    score += 1;
  }
  
  return score;
}

function getEmailType(email: string): string {
  const domain = email.split('@')[1];
  if (domain?.endsWith('.edu')) return 'edu';
  if (['gmail.com', 'outlook.com', 'yahoo.com'].includes(domain)) return 'gmail';
  if (['tempmail', 'guerrilla', '10minutemail'].some(d => domain?.includes(d))) return 'disposable';
  return 'custom_domain';
}

export async function updateDealUsage(
  dealId: string, 
  proxyRequests: number, 
  appsCreated: number
) {
  await api.put(`/deals/${dealId}`, {
    'proxy_requests_total': proxyRequests,
    'apps_created': appsCreated,
    'last_active': new Date().toISOString()
  });
}

export async function moveDealToStage(dealId: string, stageName: string) {
  const stages = await api.get('/stages');
  const stage = stages.data.data.find(s => s.name === stageName);
  
  if (stage) {
    await api.put(`/deals/${dealId}`, {
      stage_id: stage.id
    });
  }
}
```

### Environment Variables

Add to `.env`:
```bash
PIPEDRIVE_API_TOKEN=your_api_token_here
PIPEDRIVE_COMPANY_DOMAIN=onhyper
```

### Get API Token

1. Log into Pipedrive
2. Go to **Settings → Personal → API**
3. Copy the API token
4. Store securely in environment variables

---

## 8. Essential Plan Limitations & Workarounds

### What's Included in Essential ($14/mo)
✅ Unlimited deals  
✅ Unlimited contacts (persons)  
✅ Custom fields  
✅ Basic automation  
✅ API access  
✅ Email integration (basic)  
✅ Mobile app  
✅ 1,000 activities/month  
✅ Standard support  

### What's NOT Included (Higher Tiers)
❌ Advanced automation workflows (Advanced plan)  
❌ Team goals and forecasting (Advanced plan)  
❌ User permissions/granular access (Professional plan)  
❌ Custom roles (Professional plan)  

### Workarounds for Essential Plan

#### 1. Advanced Automation → Zapier Integration
Use Zapier's free tier to create complex workflows:
- New Stripe payment → Update Pipedrive deal
- New user action → Update custom field
- Scheduled reports → Email digest

#### 2. Team Collaboration → Single User with Shared Credentials
For pre-launch/early stage, one user account is sufficient:
- All team members use the CRM
- Add internal notes for context sharing
- Use tags for ownership: "rakis-follow-up", "team-review"

#### 3. Permissions → Pipeline + Tag System
Instead of formal roles, use tags:
- `assigned:rakis` - Who's working this deal
- `review:manual` - Needs human review
- `priority:high` - Hot prospect

#### 4. Forecasting → Export to Spreadsheet
Weekly export deals to Google Sheets for:
- Cohort analysis
- Conversion tracking
- Revenue forecasting

---

## Implementation Checklist

### Week 1: Core Setup
- [ ] Create Pipedrive account (14-day trial)
- [ ] Configure pipeline stages
- [ ] Add all custom fields (Section 3)
- [ ] Configure lead sources
- [ ] Generate API token

### Week 2: Integration
- [ ] Create webhook endpoints in OnHyper API
- [ ] Connect Pipedrive webhooks
- [ ] Test person creation flow
- [ ] Test deal creation flow
- [ ] Set up Zapier for Stripe sync (optional)

### Week 3: Automation
- [ ] Create welcome email automation
- [ ] Create stage-change automations
- [ ] Set up inactivity alerts
- [ ] Configure referral tracking flow

### Week 4: Refine & Document
- [ ] Train team on CRM usage
- [ ] Create deal entry SOP
- [ ] Test full pipeline flow
- [ ] Switch to paid Essential plan

---

## Quick Reference: Field IDs

After creating custom fields, note their field keys here:

| Field Name | Field Key | Type |
|------------|-----------|------|
| ICP Score Auto | `icp_score_auto` | Number |
| ICP Score Manual | `icp_score_manual` | Number |
| Project Description | `project_description` | Text |
| APIs Used | `apis_used` | Multi-select |
| Referral Source | `referral_source` | Dropdown |
| Access Tier | `access_tier` | Single-select |
| Apps Created | `apps_created` | Number |
| Proxy Requests Total | `proxy_requests_total` | Number |
| Last Active | `last_active` | Date |

---

## Support & Resources

- Pipedrive Knowledge Base: [support.pipedrive.com](https://support.pipedrive.com)
- API Documentation: [developers.pipedrive.com](https://developers.pipedrive.com)
- Automation Guide: [pipedrive.com/en/blog/crm-automation](https://pipedrive.com/en/blog/crm-automation)
- Zapier Integration: [zapier.com/apps/pipedrive](https://zapier.com/apps/pipedrive)

---

*Document version 1.0 - February 15, 2026*  
*Created for OnHyper.io pilot user tracking and waitlist integration*