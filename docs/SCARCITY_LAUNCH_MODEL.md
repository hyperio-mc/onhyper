# OnHyper.io Scarcity-Based Launch Model

> **Platform:** OnHyper - Publish web apps that securely call AI APIs  
> **Launch Strategy:** Exclusivity-driven growth with ICP-qualified access  
> **Document Version:** 1.0  
> **Created:** February 2026

---

## Overview

This document outlines a launch model that leverages scarcity and exclusivity to:
1. **Attract the right users** (ICP matches only)
2. **Create viral demand** through FOMO and social proof
3. **Build a high-quality founding community**
4. **Drive referrals and organic growth**

The core principle: **Access is earned, not bought.** This creates perceived value, attracts serious builders, and generates word-of-mouth.

---

## 1. Access Tiers

### Tier 1: Founding Builders (First 50-100)

*"The originals. The ones who believed before anyone else."*

**Selection Method:**
- **Invitation-only** from founding team + strategic partners
- Hand-picked from waitlist based on:
  - GitHub activity (commits in last 30 days)
  - Twitter/X presence in AI/dev community
  - Existing AI-powered projects
  - Quality of application responses

**Perks (Forever):**
| Perk | Description |
|------|-------------|
| **Founding Badge** | Permanent "Founding Builder" badge on profile and all published apps |
| **Lifetime Free Tier** | Hobby plan free forever (or 50% off any paid plan) |
| **Priority Support** | Direct Discord channel with founders |
| **Feature Voting** | 10x voting power on roadmap decisions |
| **Early Access** | First to see and test all new features |
| **Invite Codes** | 5 personal invite codes to share |
| **Founder Wall** | Name/link on "Founding Builders" page (SEO backlink) |
| **Monthly AMA** | Exclusive monthly sessions with founding team |

**Messaging:**
> "You're not just an early user. You're a founding builder. Your name goes on the wall. Your feedback shapes the product. You'll tell your grandkids you were here at the beginning."

---

### Tier 2: Early Access (Next 500)

*"The pioneers. Building the future before the crowd arrives."*

**Selection Method:**
- Automatically qualified from waitlist after Founding Builders fill
- Must complete ICP verification (see Section 2)
- **Priority boost** via referrals (1 referral = jump 10 positions)

**Perks:**
| Perk | Description |
|------|-------------|
| **Early Adopter Badge** | Permanent badge on profile |
| **Extended Free Trial** | 90-day free trial of Pro plan (vs. standard 14-day) |
| **Discount Lock-in** | 30% off pricing for first year (early bird pricing) |
| **Invite Codes** | 3 personal invite codes to share |
| **Early Feature Access** | 2-week early access to new features |
| **Community Access** | Private Discord channel for early access members |

**Messaging:**
> "You're early. Most people haven't heard of OnHyper yet. In a year, you'll be the one showing others how it's done. Your badge proves you were here first."

---

### Tier 3: Waitlist (Unlimited)

*"The patient ones. Building in the shadows, waiting for the signal."*

**How It Works:**
- Anyone can join waitlist via "Request Access" form
- Must complete basic ICP verification
- Position tracked, visible, and movable via referrals
- Regular engagement: weekly content, community updates, builder tips

**Perks:**
| Perk | Description |
|------|-------------|
| **Position Tracking** | Real-time queue position displayed |
| **Referral Boost** | Jump 10 positions per successful referral |
| **Content Drip** | Weekly "Building with AI" tips while waiting |
| **Priority Notification** | First to know when Early Access opens again |

---

### Tier 4: Public Access (Post-Launch)

**Unlock Conditions:**
- Founding + Early Access tiers filled (600 users activated)
- Product stable (99.9% uptime for 30 consecutive days)
- Core features complete per roadmap
- Support infrastructure scaled

**Estimated Timeline:** 3-6 months after first cohort

**Transition:**
- Free tier available (Hobby plan)
- 14-day trial of paid plans
- No badge, standard pricing
- Onboarding becomes self-serve

---

## 2. ICP Qualification Mechanism

### Goal
Qualify users in < 60 seconds while filtering out non-ICP (enterprise tire-kickers, students with no projects, spammers).

### The Application Form

**Keep it short. 5 questions max.**

---

#### Question 1: "What are you building?"
*Type: Open text, 1-3 sentences*

**Qualifying Signals:**
- ✅ Mentions specific AI API (OpenAI, Claude, OpenRouter, etc.)
- ✅ Describes real project (not "I want to learn")
- ✅ Shows builder mindset ("I'm building...", "I created...")
- ❌ "Just exploring" / "I want to see if this works"
- ❌ Vague ideas without specifics

**Auto-reject:** Empty, < 10 words, pure buzzwords with no substance

---

#### Question 2: "Link to your work (GitHub, live app, demo video)"
*Type: URL input with validation*

**Qualifying Signals:**
- ✅ Valid GitHub URL with recent commits
- ✅ Live demo URL that loads
- ✅ Twitter/X link showing builder activity
- ✅ Product Hunt / indie hacker profile
- ❌ Empty or broken links
- ❌ LinkedIn profile only
- ❌ Links with no code/product evidence

**Technical Validation:**
```javascript
// Pseudo-code for validation
if (url.includes('github.com')) {
  // Fetch via GitHub API
  // Check: public repos > 0, recent activity < 90 days
}
if (url.includes('twitter.com') || url.includes('x.com')) {
  // Cannot validate easily, accept as secondary signal
}
```

---

#### Question 3: "Which AI APIs are you using?" 
*Type: Multi-select checkboxes*

**Options:**
- [ ] OpenAI (GPT-4, etc.)
- [ ] Anthropic (Claude)
- [ ] OpenRouter
- [ ] Google (Gemini)
- [ ] Replicate / Hugging Face
- [ ] Custom / self-hosted
- [ ] Not yet, but planning to

**Qualifying Signals:**
- ✅ Any 1+ checked = ICP match
- ❌ "Not yet" but also no project link = reject

---

#### Question 4: "How did you hear about OnHyper?"
*Type: Single select + optional text*

**Options:**
- [ ] Twitter/X
- [ ] GitHub
- [ ] Referral (who referred you?)
- [ ] Product Hunt
- [ ] Search
- [ ] Other: ___

**Purpose:** Track channel attribution, identify referral sources

---

#### Question 5: "Email for access"
*Type: Email input*

**Validation Logic:**

| Email Type | Action |
|------------|--------|
| Custom domain | ✅ Auto-approve (stronger signal) |
| Gmail/Outlook | ⚠️ Requires stronger signals from Q1-3 |
| edu/student | ❌ Auto-reject with message: "OnHyper is for active builders with live projects. Join us when you're ready to ship!" |
| Disposable email | ❌ Auto-reject |

---

### Qualification Score System

**Application Score = Q1 (0-3) + Q2 (0-3) + Q3 (0-2) + Email (0-2)**

| Score | Decision |
|-------|----------|
| 8-10 | **Auto-approve** → Early Access |
| 5-7 | **Manual review** → Waitlist position |
| 0-4 | **Reject** → Politely redirect |

**Scoring Details:**

**Q1 - "What are you building?" (0-3 points)**
- 3 pts: Specific AI project, mentions API, shows progress
- 2 pts: Has project but vague on AI usage
- 1 pt: Idea stage, planning to build
- 0 pts: No project, just curious

**Q2 - "Link to your work" (0-3 points)**
- 3 pts: GitHub with recent commits OR live demo
- 2 pts: GitHub with older commits OR Twitter with builder content
- 1 pt: Any valid link
- 0 pts: No link or broken

**Q3 - "Which AI APIs?" (0-2 points)**
- 2 pts: 2+ APIs selected
- 1 pt: 1 API selected
- 0 pts: "Not yet"

**Email (0-2 points)**
- 2 pts: Custom domain
- 1 pt: Gmail with strong Q1-3
- 0 pts: Student/disposable email

---

### Verification Workflow

```
┌─────────────────┐
│  User applies   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auto-score form │
│ (instant)       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Score 8+   Score 5-7
    │         │
    ▼         ▼
┌───────┐ ┌───────────┐
│ AUTO  │ │ MANUAL    │
│ACCEPT │ │ REVIEW    │
└───────┘ └─────┬─────┘
              │
         ┌────┴────┐
         │         │
         ▼         ▼
      Approve   Reject
         │      (polite)
         ▼
   ┌──────────┐
   │ Position │
   │ in queue │
   └──────────┘
```

---

### Referral-Based Fast Track

**Rule:** Existing member invites bypass scoring entirely.

- Each Founding Builder gets 5 invite codes
- Each Early Access member gets 3 invite codes
- Invitee skips waitlist → immediate Early Access
- Inviter gets recognition (badge progress, community status)

**Invite Code Format:**
```
ONHYPER-XXXX-XXXX-XXXX
```
(16 chars, cryptographically random, one-time use)

---

## 3. Waitlist Mechanics

### The Waiting Experience

**Dashboard View:**
```
┌─────────────────────────────────────────┐
│  🔮 Your Position: #247                 │
│                                         │
│  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  247 ahead → Early Access               │
│                                         │
│  ⚡ Speed up: Refer friends!            │
│  [Copy Your Link] [Share on Twitter]    │
│                                         │
│  📊 Your stats:                         │
│  • Referrals: 0 (each = -10 positions)  │
│  • Days waiting: 4                      │
│  • Estimated wait: 2-3 weeks            │
│                                         │
│  [View Full Queue] [Edit Application]   │
└─────────────────────────────────────────┘
```

---

### Position Communication

**Email Notifications:**
| Event | Email |
|-------|-------|
| New signup | "You're #247 in line. Here's what happens next." |
| Weekly update | "Weekly Update: You're now #$position. $n ahead of last week." |
| Referral earned | "⚡ Someone joined from your link! Jumped 10 spots." |
| Position < 50 | "Heads up! You're in the top 50. Get ready." |
| Approved | "🎉 You're in! Welcome to Early Access." |

**In-App Real-Time Updates:**
- WebSocket-based position updates
- Confetti animation when position improves
- "Jumped X positions" toast notifications

---

### Engagement During Wait

**Goal:** Keep them warm, not annoyed. One touch per week max.

**Content Drip Schedule:**

| Day | Content |
|-----|---------|
| 1 | Welcome email + "Building AI Apps Securely" PDF |
| 7 | Weekly digest: "What Early Access members are building" |
| 14 | Tutorial: "Prep your first app for OnHyper" |
| 21 | Case study: "How [founder] shipped in 48 hours" |
| 28 | Community highlight + exclusive Discord preview |
| Weekly | Repeat cycle with fresh content |

**Discord Preview:**
- Read-only access to #showcase channel
- See what others are building
- Builds FOMO and community connection

---

### Referral Mechanics

**Your Unique Link:**
```
https://onhyper.io/access?ref=UNIQUECODE
```

**Behavior:**
- Friend applies through link
- Both parties get notification
- Referrer jumps 10 positions immediately
- Friend gets "+5 position boost" as referred

**Referral Tracking:**
```
┌─────────────────────────────────────────┐
│  🎁 Your Referral Dashboard             │
│                                         │
│  Your link: onhyper.io/access?ref=abc123│
│  [Copy] [Tweet] [Share]                 │
│                                         │
│  Stats:                                 │
│  • Total clicks: 14                     │
│  • Signups: 3                           │
│  • Position boost earned: -30           │
│                                         │
│  Recent activity:                       │
│  • @builder_x joined (2h ago)           │
│  • Someone clicked (5h ago)             │
└─────────────────────────────────────────┘
```

---

## 4. Viral Loops

### Loop 1: The Exclusivity Badge

**Psychology:** People want to show they're special.

**Mechanism:**
- Every app published by Early Access shows "Built by [Name] ✓ Early Adopter"
- Founding Builders get gold badge: "Founding Builder"
- Users naturally share their apps on Twitter/LinkedIn
- Badge becomes status symbol → drives signups

**Badge Display:**
```
┌────────────────────────────────┐
│  My AI App                     │
│  by @username ⭐ Founding Builder │
│                                │
│  [App content]                 │
└────────────────────────────────┘
```

---

### Loop 2: The Invite Cult

**Psychology:** Access feels more valuable when extended to others.

**Mechanism:**
- Each user gets limited invite codes
- Codes are "precious" - only 3-5 total
- Invitee gets instant access (or major queue skip)
- Referral leaderboard (top inviters recognized)

**Gamification:**
- 1 invite = Bronze status
- 3 invites = Silver status  
- 5 invites = Gold status + bonus invite codes
- Top 10 inviters = "Evangelist" badge forever

---

### Loop 3: FOMO Triggers

**Tactics:**

| Trigger | Implementation |
|---------|----------------|
| **Spots remaining** | "Only 47 Early Access spots left" |
| **Time pressure** | "Founding Builder applications close in 72 hours" |
| **Social proof** | "1,247 builders on the waitlist" |
| **Success stories** | "How @dev built a $5K/mo app in 2 weeks" |
| **Name dropping** | "@popular_dev from [known company] is a Founding Builder" |

**Display on Landing:**
```
┌─────────────────────────────────────┐
│  ⚡ Early Access: 47 spots left     │
│  👥 1,247 on waitlist               │
│  🔥 Last accepted: 3 minutes ago    │
│                                     │
│  [Request Access] →                 │
└─────────────────────────────────────┘
```

---

### Loop 4: The "Secret Club" Effect

**Psychology:** People want what they can't have.

**Tactics:**
- Landing page shows blurred screenshots of the dashboard
- "Only Early Access members can see this"
- Publish "Founding Builders" wall with photos/bios
- Share snippets of Discord conversations (with permission)
- "Early Access members got X feature this week"

---

### Loop 5: Built-In Sharing

**Every App Has:**
- "Published on OnHyper" footer with link
- One-click "Share on Twitter" button
- Auto-generated OG image with app screenshot
- "Powered by OnHyper" branding (removable on paid plans)

**Viral Coefficient Target:** K > 1.0  
(each user drives at least 1 new signup)

---

## 5. Conversion Path

### Waitlist → Early Access → Paid

```
┌─────────────────────────────────────────────────────────┐
│                    CONVERSION FUNNEL                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  WAITLIST                                               │
│  └─→ Free content drip                                  │
│  └─→ Referral incentives                                │
│  └─→ Weekly engagement                                  │
│           │                                             │
│           ▼                                             │
│  EARLY ACCESS (90-day free trial of Pro)                │
│  └─→ Full feature access                                │
│  └─→ Onboarding support                                 │
│  └─→ Community integration                              │
│  └─→ Usage patterns tracked                             │
│           │                                             │
│           ▼                                             │
│  PAID CONVERSION                                        │
│  └─→ Trial ending notification (Day 75, 85, 89)         │
│  └─→ Early bird pricing lock (if purchased during trial)│
│  └─→ Usage-based migration recommendation              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Pricing Transition for Early Access

**Philosophy:** They helped you build. Reward them.

| Tier | Pricing After Trial |
|------|---------------------|
| **Founding Builders** | Hobby plan FREE forever. All paid plans 50% off for life. |
| **Early Access** | First year: 30% off. Standard pricing after. |
| **Post-Launch Public** | Standard pricing (no discount) |

---

### Trial-to-Paid Tactics

**Email Sequence (During Trial):**

| Day | Email Focus |
|-----|-------------|
| 1 | Welcome + Quick Start Guide + "What others are building" |
| 7 | "Your first week: You've made 47 API calls, published 1 app" |
| 14 | Pro tip: "How to [advanced feature]" |
| 30 | Check-in + Usage report + "You're getting value" |
| 60 | "Your apps have received X visitors. Here's how to grow..." |
| 75 | "15 days left on your trial" + Upgrade CTA |
| 85 | "5 days left. Lock in your early bird pricing!" |
| 89 | Last call email |

**In-App Triggers:**
- "Upgrade" button in dashboard
- Usage tracker: "You've used 80% of Hobby limits"
- Feature tease: "Want this? Upgrade to Pro"

---

### Special: Founding Builder Retention

**They're your evangelists. Treat them well.**

**Ongoing Perks:**
- Annual "Founding Builders" gift (swag package)
- First-access to any new product/feature
- Invite to annual virtual meetup with founders
- Recognition: Featured in blog posts, case studies
- Never lose Founding badge, even if they downgrade

---

## 6. Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       WAITLIST SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌───────────┐     ┌──────────────┐            │
│  │ Frontend │────▶│ API Layer │────▶│ Database     │            │
│  │ (Next.js)│     │ (Node.js) │     │ (PostgreSQL) │            │
│  └──────────┘     └───────────┘     └──────────────┘            │
│                          │                                       │
│                    ┌─────┴─────┐                                 │
│                    │           │                                 │
│                    ▼           ▼                                 │
│              ┌─────────┐ ┌─────────────┐                       │
│              │ Queue   │ │ Email       │                       │
│              │ System  │ │ Service     │                       │
│              │ (Redis) │ │ (Resend)    │                       │
│              └─────────┘ └─────────────┘                       │
│                                                                  │
│  INTEGRATIONS                                                    │
│  └─ GitHub API (profile validation)                             │
│  └─ Twitter API (optional verification)                         │
│  └─ Analytics (Segment/Mixpanel)                                │
│  └─ Notifications (Discord webhook, Email)                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Database Schema

```sql
-- Core tables

CREATE TABLE waitlist_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  question_what_building TEXT NOT NULL,
  question_project_link VARCHAR(500),
  question_apis_used TEXT[], -- Array of strings
  question_referral_source VARCHAR(50),
  custom_email VARCHAR(255),
  slug VARCHAR(16) UNIQUE NOT NULL, -- Public identifier
  email_slug VARCHAR(64) UNIQUE NOT NULL, -- For links
  
  -- Scoring
  auto_score INTEGER DEFAULT 0,
  manual_score INTEGER,
  final_score INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, waitlist
  
  -- Position tracking
  position INTEGER,
  referral_count INTEGER DEFAULT 0,
  position_boost INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  
  -- Referral tracking
  referred_by UUID REFERENCES waitlist_applications(id),
  referral_code VARCHAR(16) UNIQUE NOT NULL
);

CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- ONHYPER-XXXX-XXXX-XXXX
  created_by UUID REFERENCES waitlist_applications(id),
  used_by UUID REFERENCES waitlist_applications(id),
  tier VARCHAR(20) NOT NULL, -- founding, early_access
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  is_used BOOLEAN DEFAULT FALSE
);

CREATE TABLE waitlist_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES waitlist_applications(id),
  event_type VARCHAR(50) NOT NULL, -- signup, referral, approved, rejected
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE access_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL, -- founding_builder, early_access, public
  max_capacity INTEGER,
  current_count INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_waitlist_position ON waitlist_applications(position);
CREATE INDEX idx_waitlist_status ON waitlist_applications(status);
CREATE INDEX idx_referral_code ON waitlist_applications(referral_code);
CREATE INDEX idx_invite_code ON invite_codes(code);
```

---

### API Endpoints

```yaml
# Public API

POST /api/waitlist/apply
  - Submit application
  - Auto-score
  - Return: position, estimated wait

GET /api/waitlist/status/:slug
  - View position and stats
  - Authenticated via email link

GET /api/waitlist/referral/:code
  - Track referral click
  - Redirect to application form

POST /api/waitlist/referral
  - Process referral signup
  - Update position for referrer

GET /api/waitlist/validate-invite/:code
  - Check if invite code is valid
  - Return: valid, tier, remaining uses

# Admin API (authenticated)

GET /api/admin/waitlist/pending
  - List applications for manual review
  - Pagination, filtering

POST /api/admin/waitlist/:id/approve
POST /api/admin/waitlist/:id/reject
POST /api/admin/waitlist/:id/waitlist

GET /api/admin/stats
  - Queue length, conversion rates, referral rates

POST /api/admin/invite-codes/generate
  - Generate batch of invite codes
  - Assign to user
```

---

### Position Tracking System

```javascript
// Redis-based position tracking

const updatePosition = async (applicationId, boost = 0) => {
  // Add to sorted set with score = timestamp + boost
  await redis.zadd('waitlist:queue', Date.now() - (boost * 1000), applicationId);
  
  // Get new position
  const position = await redis.zrank('waitlist:queue', applicationId);
  
  // Update in database
  await db.query('UPDATE waitlist_applications SET position = $1 WHERE id = $2', [position, applicationId]);
  
  // Emit WebSocket event
  io.to(applicationId).emit('position_update', { position, boost });
  
  return position;
};

// Referral processing
const processReferral = async (referrerCode, newApplicationId) => {
  // Find referrer
  const referrer = await db.query('SELECT * FROM waitlist_applications WHERE referral_code = $1', [referrerCode]);
  
  // Update referral count
  await db.query('UPDATE waitlist_applications SET referral_count = referral_count + 1 WHERE id = $1', [referrer.id]);
  
  // Boost position by 10
  await updatePosition(referrer.id, 10);
  
  // Give new applicant +5 boost
  await updatePosition(newApplicationId, 5);
  
  // Send notifications
  await sendEmail(referrer.email, 'referral_earned', { 
    newPosition: referrer.position - 10 
  });
};
```

---

### Notification System

```javascript
// Email triggers

const emailTriggers = {
  // Application submitted
  'application.submitted': {
    template: 'waitlist-confirmation',
    delay: 0
  },
  
  // Weekly digest
  'weekly.digest': {
    template: 'weekly-update',
    schedule: '0 9 * * 1' // Monday 9am
  },
  
  // Referral earned
  'referral.earned': {
    template: 'referral-boost',
    delay: 0
  },
  
  // Approved
  'application.approved': {
    template: 'welcome-early-access',
    delay: 0
  },
  
  // Position < 50
  'position.low': {
    template: 'almost-there',
    condition: (position) => position < 50
  }
};
```

---

### Application Review Dashboard (Admin)

**Features:**
- Queue of pending applications with scores
- One-click approve/reject/waitlist
- Batch actions
- Application details with GitHub preview
- Stats overview

**View:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Admin Dashboard                              [Stats] [Logout]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Pending Review (47) │ Approved (234) │ Rejected (89)            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Score: 7 │ @builder_dev │ john@customdomain.com            │ │
│  │                                                              │ │
│  │ Building: "AI-powered resume builder using GPT-4 and Claude"│ │
│  │ Link: github.com/builder_dev/resume-ai ✅ Recent commits    │ │
│  │ APIs: OpenAI, Anthropic ✅                                   │ │
│  │                                                              │ │
│  │ [Approve] [Waitlist] [Reject]                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Score: 4 │ @curious_user │ curious@gmail.com               │ │
│  │                                                              │ │
│  │ Building: "I want to learn about AI"                        │ │
│  │ Link: (empty) ⚠️                                             │ │
│  │ APIs: Not yet ⚠️                                             │ │
│  │                                                              │ │
│  │ [Approve] [Waitlist] [Reject] ← likely reject               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [Load More]                                                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Messaging & Copy

### Landing Page: "Request Access" Framing

---

**Hero Section:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│     🚀 Publish AI Apps Without the Security Nightmare          │
│                                                                  │
│     Your API keys stay safe. Your users stay happy.            │
│     Your app ships in minutes.                                  │
│                                                                  │
│     ┌───────────────────────────────────────────────────────┐  │
│     │                                                        │  │
│     │  ⚡ Early Access: 47 spots left                       │  │
│     │  👥 1,247 builders on the waitlist                    │  │
│     │                                                        │  │
│     │            [ Request Access ]                          │  │
│     │                                                        │  │
│     └───────────────────────────────────────────────────────┘  │
│                                                                  │
│     ✓ Free to start  ✓ No credit card  ✓ Active builders only │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Social Proof Section:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│     Trusted by builders from                                     │
│                                                                  │
│     [@builder1] [@builder2] [@builder3] [@builder4] [@builder5] │
│                                                                  │
│     "OnHyper let me ship my AI app in a weekend.                │
│      No backend, no API key management, just building."         │
│      — @indie_dev, Founding Builder                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Exclusivity Section:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│     🔮 Not Open to Everyone                                      │
│                                                                  │
│     OnHyper is built for builders — people actively creating    │
│     AI-powered apps.                                             │
│                                                                  │
│     If you're building, we want you in.                         │
│     If you're just exploring, the waitlist is there when        │
│     you're ready to ship.                                       │
│                                                                  │
│     [ See Who's Already Building → ]                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Email 1: Waitlist Confirmation

**Subject:** You're #247 in line. Here's what happens next.

---

```
Hey {name},

Thanks for your interest in OnHyper.

You're currently #247 on the waitlist for Early Access.

Here's the deal:
• We're letting builders in gradually (keeping quality high)
• Your position: #247
• Estimated wait: 2-3 weeks

⚡ Want to jump the line?

Share your referral link and skip 10 spots for every friend who joins:
onhyper.io/access?ref={your_code}

In the meantime, I'll send you weekly updates on what Early Access members are building. You'll get tips on securing AI APIs, optimizing costs, and shipping faster.

Talk soon,

{founder_name}
Founder, OnHyper

P.S. Link your GitHub for a +5 position boost → [Connect GitHub]
```

---

### Email 2: "You're In!" Acceptance

**Subject:** 🎉 You're in! Welcome to Early Access.

---

```
{name} —

You made it.

Your application stood out (your work on {project reference} is exactly what we love to see).

Welcome to Early Access.

Here's what happens next:

1. Create your account → [Accept Your Spot]
2. Join our Discord community → [Discord Invite]
3. Publish your first app (takes < 10 min)

Your perks:
✓ 90-day free trial of Pro plan
✓ Early Adopter badge (forever)
✓ 3 invite codes to share with friends
✓ Private Discord channel access

Your invite codes (share wisely):
• ONHYPER-XXXX-XXXX-0001
• ONHYPER-XXXX-XXXX-0002
• ONHYPER-XXXX-XXXX-0003

These codes let your friends skip the waitlist entirely. Don't share them publicly — once used, they're gone.

[Accept Your Spot Now] →

See you inside,

{founder_name}

P.S. This spot is yours for 48 hours. After that, it goes to the next person in line. Don't wait.
```

---

### Email 3: Referral Earned

**Subject:** ⚡ Someone joined from your link! You jumped 10 spots.

---

```
{name} —

Great news. Someone just joined the waitlist from your referral link.

Your new position: #{new_position}
(You jumped 10 spots!)

Keep sharing to move faster:
[Copy Your Link] [Share on Twitter]

You're now #{spots_until_access} spots away from Early Access.

— {founder_name}
```

---

### Invite-a-Friend Copy (Social)

**Twitter/X Template:**

```
Got my OnHyper Early Access invite. 🔓

If you're building AI apps and want a secure way to publish them without managing API keys yourself, DM me — I have 2 invite codes left.

Built for indie devs, by indie devs.
```

**Alt Template (More Casual):**

```
Finally got into OnHyper early access 😤

If you ship AI apps, lmk — I've got invite codes. No more leaking API keys lol
```

**LinkedIn:**

```
Excited to share I've been accepted to OnHyper's Early Access program.

They're building something indie devs have needed for a while: a secure way to publish AI-powered web apps without the backend complexity.

I have a few invite codes for active builders. DM if interested.
```

---

## 8. Success Metrics

### Primary KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Waitlist Conversion Rate** | > 60% | Accepted users who activate (create account) |
| **Referral Rate** | > 0.5 | Referrals per accepted user |
| **Time to First App** | < 7 days | Days from acceptance to first published app |
| **Trial-to-Paid Conversion** | > 25% | Early Access users who convert to paid |
| **Net Promoter Score** | > 50 | Survey at 30-day mark |

---

### Secondary Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Application completion rate | > 80% | Form fills that complete |
| Auto-approval rate | 30-40% | Applications auto-approved |
| Manual review approval rate | > 60% | Reviewed apps approved |
| Position engagement rate | > 50% | Users checking position weekly |
| Email open rate | > 40% | Weekly updates opened |
| Referral link click rate | > 10% | Shared links clicked |

---

### Tracking Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│                    WAITLIST ANALYTICS                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  TOTAL APPLICATIONS     │  CURRENT QUEUE     │  APPROVED          │
│  1,547                  │  847               │  453               │
│  ↑ 12% this week        │ ↓ 23 this week    │ ↑ 34 this week     │
│                                                                   │
│  ──────────────────────────────────────────────────────────────  │
│                                                                   │
│  CONVERSION FUNNEL                                               │
│  ────────────────                                                │
│  Applications → Approved → Activated → Published → Paid          │
│      100%           29%        63%        41%        18%          │
│                                                                   │
│  ──────────────────────────────────────────────────────────────  │
│                                                                   │
│  TOP REFERRERS                                                   │
│  1. @builder_name — 12 referrals                                │
│  2. @dev_two — 8 referrals                                      │
│  3. @indie_hacker — 6 referrals                                 │
│                                                                   │
│  ──────────────────────────────────────────────────────────────  │
│                                                                   │
│  SOURCES                                                         │
│  Twitter/X     ████████░░  42%                                   │
│  Referral      ██████░░░░  28%                                   │
│  Search        ████░░░░░░  18%                                   │
│  Product Hunt  ██░░░░░░░░  8%                                    │
│  Other         ██░░░░░░░░  4%                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

### Weekly Review Checklist

**Every Monday:**
- [ ] Review waitlist length and velocity
- [ ] Check referral rate (should be increasing)
- [ ] Review trial conversions
- [ ] Identify top inviters for recognition
- [ ] Check email deliverability rates
- [ ] Review application rejection reasons (trends?)

---

### Launch Phases & Targets

| Phase | Duration | Target Users | Metrics Focus |
|-------|----------|--------------|---------------|
| **Founder Invite** | Weeks 1-2 | 50-100 | Quality, engagement |
| **Early Access 1** | Weeks 3-6 | 200 | Referral rate, activation |
| **Early Access 2** | Weeks 7-12 | 500 | Trial conversion, retention |
| **Public Launch** | Week 13+ | Unlimited | Growth rate, revenue |

---

## Implementation Checklist

### Pre-Launch (Week -2)

- [ ] Build waitlist application form
- [ ] Set up database schema
- [ ] Implement position tracking (Redis)
- [ ] Create admin review dashboard
- [ ] Set up email templates (Resend/SendGrid)
- [ ] Generate founding member invite codes
- [ ] Create referral tracking system
- [ ] Build "Your Position" dashboard
- [ ] Set up analytics (Segment/Mixpanel)
- [ ] Test full user flow

### Launch (Week 0)

- [ ] Publish landing page with form
- [ ] Seed founding members with invites
- [ ] Announce on Twitter/X
- [ ] Post to relevant communities (indie hackers, etc.)
- [ ] Monitor queue and metrics
- [ ] Daily review of applications

### Post-Launch

- [ ] Weekly position updates (automated)
- [ ] Weekly content drip (emails)
- [ ] Daily approval processing
- [ ] Track referral patterns
- [ ] Recognize top inviters
- [ ] Monitor conversion rates
- [ ] Adjust scoring thresholds as needed

---

## Summary

This scarcity model creates demand through:

1. **Exclusivity** — Not everyone gets in
2. **Status** — Badges and recognition for early adopters
3. **Social Proof** — Visible community of builders
4. **FOMO** — Limited spots, countdowns, success stories
5. **Referrals** — Incentivized sharing with queue-skipping

The key insight: **People value what they earn more than what they're given freely.** By making access feel earned (application, referrals, waitlist), we increase perceived value and attract serious, committed builders.

---

*Document created for OnHyper.io launch strategy. Implementation-ready.*