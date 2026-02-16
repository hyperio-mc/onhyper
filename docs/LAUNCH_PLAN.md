# OnHyper.io Launch Plan

**Version 1.0 | February 15, 2026**

---

## Executive Summary

OnHyper is a platform for publishing web apps that securely call AI APIs. The MVP is complete and deployed, but significant gaps exist in marketing infrastructure, operational readiness, and legal compliance before a successful public launch.

**Recommendation:** **Pilot First** — Run a 3-week controlled pilot with 20-40 targeted users before public launch. This strategy maximizes learning, generates testimonials, and reduces launch-day risk while preserving enough momentum for a strong Product Hunt debut.

**Target Launch Date:** March 10, 2026 (Product Hunt Tuesday)

---

## 1. Gap Analysis

### What's Built ✅

| Category | Component | Status | Notes |
|----------|-----------|--------|-------|
| **Core Tech** | User authentication | ✅ Complete | Email/password, JWT |
| **Core Tech** | Secrets management | ✅ Complete | AES-256-GCM encryption |
| **Core Tech** | Apps CRUD | ✅ Complete | Create, edit, delete apps |
| **Core Tech** | Proxy endpoints | ✅ Complete | 5 AI APIs supported |
| **Core Tech** | Usage tracking | ✅ Complete | Per-app, per-endpoint |
| **Infra** | Production deployment | ✅ Complete | Railway (onhyper-production.up.railway.app) |
| **Frontend** | Landing page | ✅ Complete | Redesigned with CTAs |
| **Frontend** | Dashboard | ✅ Complete | Apps, keys management |
| **Frontend** | App editor | ✅ Complete | HTML/CSS/JS editing |
| **Analytics** | PostHog integration | ⚠️ Partial | Needs real API keys |
| **Marketing** | Brand guidelines | ✅ Complete | BRANDING.md |
| **Marketing** | Marketing plan | ✅ Complete | MARKETING_PLAN.md |
| **Marketing** | Sales funnel design | ✅ Complete | SALES_FUNNEL.md |
| **Marketing** | Video outreach system | ✅ Designed | VIDEO_OUTREACH_SYSTEM.md |
| **Content** | Remotion video templates | ✅ Created | onhyper-videos/ |

### What's Missing ❌

#### 1.1 Technical Gaps

| Gap | Severity | Priority | Effort | Description |
|-----|----------|----------|--------|-------------|
| **PostHog real keys** | 🔴 High | P0 | 1 hour | Analytics using placeholder keys — need real PostHog project |
| **Email service (Resend)** | 🔴 High | P0 | 2-3 hours | No transactional email configured — welcome sequence blocked |
| **Stripe production keys** | 🔴 High | P0 | 2 hours | May have test keys — need production payment integration |
| **Custom domain (onhyper.io)** | 🟡 Medium | P1 | 1 hour | Currently on Railway subdomain — professional appearance |
| **SSL/HTTPS on custom domain** | 🟡 Medium | P1 | 30 min | Required for custom domain |
| **Error tracking (Sentry)** | 🟡 Medium | P2 | 1 hour | No production error monitoring |
| **Uptime monitoring** | 🟡 Medium | P2 | 30 min | No alerting if service goes down |
| **Database backups** | 🔴 High | P1 | 1 hour | SQLite data at risk without backups |
| **Rate limiting enforcement** | 🟡 Medium | P2 | 2 hours | Limits defined but may not be enforced |
| **CORS configuration** | 🟢 Low | P3 | 30 min | May need tuning for published apps |

#### 1.2 Marketing Gaps

| Gap | Severity | Priority | Effort | Description |
|-----|----------|----------|--------|-------------|
| **Email welcome sequence** | 🔴 High | P0 | 4 hours | No automated onboarding for new users |
| **Newsletter capture** | 🔴 High | P0 | 2 hours | No way to capture leads before signup |
| **Lead magnet tool** | 🟡 Medium | P1 | 8-16 hours | API Key Security Scanner not built |
| **Social media accounts** | 🔴 High | P0 | 2 hours | Need X/Twitter, LinkedIn, Indie Hackers profiles |
| **Product Hunt profile** | 🔴 High | P0 | 1 hour | Maker profile and hunter preparation |
| **Press kit** | 🟡 Medium | P2 | 2 hours | Downloadable logos, screenshots, boilerplate |
| **Demo video (1-min)** | 🔴 High | P0 | 4-8 hours | No product demo video for launch |
| **Blog content** | 🟡 Medium | P1 | 4-8 hours | Only planning docs — need published articles |
| **SEO meta tags** | 🟡 Medium | P1 | 2 hours | May be incomplete on landing pages |
| **Testimonials** | 🔴 High | P1 | N/A | **Cannot create** — need real users first |

#### 1.3 Operational Gaps

| Gap | Severity | Priority | Effort | Description |
|-----|----------|----------|--------|-------------|
| **Support documentation** | 🔴 High | P0 | 8 hours | No help docs, FAQ, or troubleshooting guides |
| **API documentation** | 🟡 Medium | P1 | 4 hours | Endpoints documented in README but not polished |
| **Runbook / incident response** | 🟡 Medium | P1 | 2 hours | No documented procedures for outages |
| **On-call process** | 🟢 Low | P3 | 1 hour | Who gets paged when things break? |
| **Status page** | 🟡 Medium | P2 | 1 hour | No public status page (can use third-party) |
| **Customer support channel** | 🟡 Medium | P2 | 2 hours | No helpdesk (email ok for pilot, need proper for scale) |
| **User feedback collection** | 🟡 Medium | P1 | 2 hours | No structured feedback mechanism |

#### 1.4 Legal / Compliance Gaps

| Gap | Severity | Priority | Effort | Description |
|-----|----------|----------|--------|-------------|
| **Terms of Service** | 🔴 Critical | P0 | 4-8 hours | No ToS — legal risk for any user |
| **Privacy Policy** | 🔴 Critical | P0 | 4-8 hours | Required by law (GDPR, CCPA, etc.) |
| **Cookie policy** | 🟡 Medium | P1 | 1 hour | Required for analytics cookies |
| **Security disclosure policy** | 🟡 Medium | P2 | 2 hours | How researchers report vulnerabilities |
| **Data retention policy** | 🟡 Medium | P2 | 1 hour | How long user data is kept |
| **Business entity** | 🟡 Medium | P1 | Varies | Sole prop / LLC for liability protection |
| **Domain ownership verification** | 🟢 Low | P3 | 30 min | Ensure onhyper.io is properly owned |

### Gap Checklist Summary

```
🔴 HIGH PRIORITY (P0) - 15 items
┌─────────────────────────────────────────────────────────────────────┐
│ MUST COMPLETE BEFORE PILOT                                          │
├─────────────────────────────────────────────────────────────────────┤
□ PostHog real API keys                                              │
□ Resend account + domain verification                               │
□ Stripe production keys                                             │
□ Email welcome sequence (3 emails)                                  │
□ Newsletter lead capture                                            │
□ Social media accounts (X, LinkedIn)                                │
□ Product Hunt maker profile                                         │
□ 1-minute demo video                                                │
□ Terms of Service                                                   │
□ Privacy Policy                                                      │
□ Database backup automation                                         │
□ Support documentation (basics)                                     │
□ API documentation (polished)                                       │
□ User feedback form                                                 │
□ Custom domain + SSL (optional for pilot, required for launch)      │
└─────────────────────────────────────────────────────────────────────┘

🟡 MEDIUM PRIORITY (P1) - 12 items
┌─────────────────────────────────────────────────────────────────────┐
│ COMPLETE DURING PILOT OR BEFORE PUBLIC LAUNCH                       │
├─────────────────────────────────────────────────────────────────────┤
□ Lead magnet tool (API Security Scanner)                            │
□ Blog content (3+ articles)                                         │
□ SEO meta tags audit                                                │
□ Runbook / incident response                                        │
□ Status page                                                        │
□ Customer support email setup                                       │
□ Error tracking (Sentry)                                            │
□ Uptime monitoring                                                  │
□ Cookie policy                                                       │
□ Security disclosure policy                                          │
□ Data retention policy                                               │
□ Business entity formation                                          │
└─────────────────────────────────────────────────────────────────────┘

🟢 LOW PRIORITY (P2-P3) - 6 items
┌─────────────────────────────────────────────────────────────────────┐
│ NICE TO HAVE — POST-LAUNCH                                          │
├─────────────────────────────────────────────────────────────────────┤
□ Press kit                                                          │
□ On-call process                                                    │
□ Helpdesk/ticketing system                                          │
□ CORS fine-tuning                                                   │
□ Domain ownership verification                                       │
□ Rate limiting enforcement hardening                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Launch Venue Strategy

### Venue Evaluation Matrix

| Venue | Reach Quality | Target Match | Competition | Prep Effort | Risk | Recommendation |
|-------|---------------|--------------|-------------|-------------|------|----------------|
| **Product Hunt** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | High | Medium | Medium | **Primary** |
| **Hacker News** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Very High | Low | High | **Primary** |
| **Reddit** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | Low | Low | **Primary** |
| **Indie Hackers** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Low | Low | Very Low | **Primary** |
| **Twitter/X** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Medium | Ongoing | Low | **Supporting** |
| **Dev.to** | ⭐⭐⭐ | ⭐⭐⭐⭐ | Low | Medium | Very Low | **Secondary** |
| **LinkedIn** | ⭐⭐ | ⭐⭐⭐ | Low | Medium | Very Low | **Tertiary** |

### 2.1 Product Hunt Strategy

**Why Product Hunt as Primary:**
- Highest visibility for developer tools
- Built-in audience of early adopters
- Strong SEO benefit from PH listing
- Credibility signal for future customers
- Timing: Tuesday is optimal (highest traffic, less competition than Wednesday)

**Pros:**
- 50,000+ daily active users
- Featured products get significant traffic
- Good for B2B developer tools historically
- Easy to share PH link with investors/press

**Cons:**
- High competition on launch day
- Requires significant prep (hunter, maker, assets)
- Success heavily depends on community engagement
- One shot — can't easily "relaunch"

**Timing:**
- **Target: Tuesday, March 10, 2026** (12:01 AM PST)
- Submit evening before to be live at midnight PST
- Avoid holidays (none near March 10)

**Prep Required:**
- [ ] Maker profile complete with bio and avatar
- [ ] Hunter identified (can self-hunt, but better with known hunter)
- [ ] Tagline: 60 characters max
- [ ] Thumbnail: 240x240px (logo or product screenshot)
- [ ] Gallery images: 3-5 screenshots or videos
- [ ] Launch video: Optional but highly recommended (< 2 min)
- [ ] First comment: Your maker story, discount for PH community
- [ ] Support team: 5-10 people committed to upvote/comment at launch

**Product Hunt Tagline Options:**
1. "Ship AI apps without exposing your API keys" (52 chars) ✅
2. "Secure proxy for frontend AI integrations" (42 chars) ✅
3. "Your API keys, protected. Your apps, shipped." (45 chars) ✅

**Recommended: Option 1** — Clear value proposition, mentions both problem and solution.

### 2.2 Hacker News Strategy

**Why HN as Primary:**
- Ideal target audience: technical, security-conscious developers
- High-intent users actively looking for solutions
- Strong SEO benefit from HN discussion
- Potential for viral effect if gains traction

**Pros:**
- Direct access to technical audience
- No preparation required — can post anytime
- Excellent for feedback and discussion
- Posts with 100+ points drive significant traffic

**Cons:**
- Extremely competitive — most posts sink
- Community hostile to pure marketing
- Requires genuine technical merit
- One shot per product typically

**Strategy:**

**Option A: Show HN** (Recommended)
- Title: `Show HN: OnHyper.io – Secure proxy for AI API calls`
- Post on **Monday, March 9** (day before PH) or **Wednesday, March 11** (day after PH)
- Include technical details about architecture
- Be present in comments for 2-3 hours
- Be prepared for critical feedback

**Option B: Technical Article First**
- Write deep-dive article on API key security architecture
- Submit article to HN (not product)
- Mention OnHyper in comments if relevant
- Less obvious marketing, better reception

**Timing:**
- Post between 9 AM - 12 PM EST on weekday
- Avoid posting same day as Product Hunt (divide attention)

### 2.3 Reddit Strategy

**Why Reddit as Primary:**
- Multiple relevant communities
- Lower barrier to entry than PH/HN
- Can engage authentically over time
- Long-tail SEO benefit

**Target Subreddits:**

| Subreddit | Members | Strategy | Timing |
|-----------|---------|----------|--------|
| **r/webdev** | 1.2M | Tutorial-style post | Week of launch |
| **r/frontend** | 50K | Problem/solution post | Week of launch |
| **r/sideproject** | 90K | Direct launch post | Launch day |
| **r/indiehackers** | 100K | Journey post | Week of launch |
| **r/OpenAI** | 200K | Use-case specific | Post-launch |
| **r/programming** | 8M | Technical discussion | If organic opportunity |
| **r/beta** | 15K | Beta release post | During pilot |

**Posting Strategy:**
- **DO NOT** post to all subreddits same day
- **DO NOT** use same exact post — tailor to each community
- Engage genuinely in comments
- Accept critical feedback gracefully

**Template for r/sideproject (most launch-friendly):**
```
Title: I built a platform to call AI APIs securely from static sites

Hey r/sideproject,

Like many of you, I've had API keys leak from browser code. Not because I didn't know better, but because setting up a backend proxy felt like overkill for a side project.

So I built OnHyper.io — a zero-backend solution for secure AI API calls.

How it works:
1. Add your OpenAI/Anthropic/etc keys in the dashboard (encrypted)
2. Create an HTML/CSS/JS app
3. Call /proxy/:endpoint from your code — OnHyper injects the key server-side

Your keys never touch the browser.

Free tier: 100 requests/day, 3 apps.

Just launched today and would love feedback from other builders.

Link: onhyper.io
```

### 2.4 Indie Hackers Strategy

**Why Indie Hackers:**
- Perfect target persona (solo devs, side projects)
- Supportive community
- Low competition for attention
- Long-term relationship building

**Pros:**
- High-quality, engaged audience
- Product page has permanent presence
- Story-driven content performs well
- Easy entry — no launch-day scramble

**Cons:**
- Smaller reach than PH/HN
- Less viral potential
- Requires ongoing engagement

**Strategy:**
1. Create product page on Indie Hackers
2. Post milestone story on launch day
3. Engage in community discussions before and after
4. Share genuine lessons learned (not just marketing)

### 2.5 Twitter/X Strategy

**Role: Supporting + Ongoing**

**Two Phases:**

**Phase 1: Build in Public (Pre-Launch)**
- Start posting development updates now
- Build small following before launch
- Tease upcoming launch
- Engage with dev community

**Phase 2: Launch Announcement**
- Launch day thread explaining product
- Quote tweet Product Hunt post
- Mention in replies to relevant discussions

**Posting Schedule (Sample):**

| Day | Content Type |
|-----|--------------|
| Daily | Quick progress updates, tips |
| Weekly | Thread: API security education |
| Launch -3 | Teaser: "3 days until..." |
| Launch -1 | Product Hunt countdown |
| Launch day | Full announcement thread |
| Launch +1 | Thank you + stats share |

### 2.6 Dev Communities (Dev.to, Hashnode)

**Role: Secondary**

**Strategy:**
- Cross-post educational content
- Build reputation through helpful articles
- Not primary launch venue
- Long-tail traffic driver

**Recommended Content:**
1. "Why Your API Keys Will Always Leak in Frontend Code"
2. "Building an AI Chat App Without a Backend"
3. "Serverless vs. Purpose-Built Proxy Services"

### Venue Priority Ranking

```
┌────────────────────────────────────────────────────────────────────┐
│ LAUNCH VENUE PRIORITY                                             │
├────────────────────────────────────────────────────────────────────┤
                                                                    │
│  PRIMARY VENUES (Launch Day)                                       │
│  ═════════════════════════════                                     │
│  1. Product Hunt     → Tuesday 12:01 AM PST                        │
│  2. Hacker News      → Show HN on Monday or Wednesday              │
│  3. Reddit r/sideproject → Same day as PH or next day             │
│  4. Indie Hackers    → Product page + milestone on launch day     │
│                                                                    │
│  SUPPORTING CHANNELS (Ongoing)                                     │
│  ═══════════════════════════                                       │
│  • Twitter/X        → Build in public + announcement thread        │
│  • Reddit r/webdev  → Educational post during launch week          │
│                                                                    │
│  SECONDARY CHANNELS (Post-Launch)                                  │
│  ═════════════════════════════                                     │
│  • Dev.to           → Educational articles (ongoing)               │
│  • Reddit r/OpenAI  → Use-case specific (week after)               │
│  • LinkedIn         → Professional network announcement             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Pilot vs Direct Launch

### Analysis

| Factor | Pilot First | Direct Launch |
|--------|-------------|---------------|
| **Feedback quality** | High — engaged beta users | Low — mass users less vocal |
| **Bug discovery** | Controlled damage | Public bugs hurt reputation |
| **Testimonials** | Generated during pilot | None at launch |
| **Product Hunt momentum** | Slightly reduced | Maximum impact |
| **Time to market** | +3 weeks | Immediate |
| **First impressions** | Can iterate before mass exposure | One chance |
| **Social proof** | "Used by 50+ developers" | No social proof |
| **Risk profile** | Low | High |

### Recommendation: PILOT FIRST

**Rationale:**

1. **Technical Risk Mitigation**
   - No error monitoring or alerting in place
   - Database has no backup automation
   - Unknown edge cases in proxy service
   - Pilot reveals bugs before viral exposure

2. **Testimonial Generation**
   - "Used by 50+ developers" is powerful launch credibility
   - Real quotes for Product Hunt first comment
   - Case studies for marketing content

3. **Feature Validation**
   - Does the 100 req/day free tier resonate?
   - Is the onboarding flow smooth enough?
   - What features are actually missed?

4. **Soft Landing on Legal**
   - Terms and privacy policy can be refined based on real questions
   - Avoid legal surprises with real users

5. **Timing Works**
   - February 15 → Pilot Feb 18 → Mar 10 (PH Tuesday)
   - 3 weeks pilot is sweet spot: enough time for feedback, not so long momentum is lost

**Pilot Duration: 3 weeks (February 18 - March 9)**

**Pilot Cohort Size: 25-50 users**

**Pilot Criteria:**
- Developers actively building AI-powered apps
- Mix of solo builders and agency developers
- At least 10 high-intent users (building apps now)

### Risk of Pilot Approach

| Risk | Mitigation |
|------|------------|
| Leaks to competitors | NDA not practical; rely on speed and engagement |
| Loses PH "newness" | PH allows products that had limited beta; emphasize "public launch" |
| Slow feedback loop | Structured feedback requests + incentivized surveys |
| Pilot users don't convert | Free Pro for pilot users; clear value proposition |

---

## 4. Pre-Launch Checklist

### 4.1 Before Pilot (February 18)

#### Technical Setup

```
□ PostHog
  ├── □ Create PostHog account
  ├── □ Create new project "OnHyper Production"
  ├── □ Copy API key to backend .env (POSTHOG_KEY)
  ├── □ Copy API key to frontend .env (VITE_PUBLIC_POSTHOG_KEY)
  └── □ Test event firing in PostHog dashboard

□ Resend (Email Service)
  ├── □ Create Resend account
  ├── □ Add and verify onhyper.io domain
  ├── □ Create API key
  ├── □ Add RESEND_API_KEY to backend .env
  └── □ Test sending email via API

□ Database Backups
  ├── □ Set up automated SQLite backup (cron or Railway cron)
  ├── □ Test backup restoration process
  └── □ Store backups in separate location (S3/R2)

□ Error Tracking (Optional but Recommended)
  ├── □ Create Sentry account
  ├── □ Add Sentry SDK to backend
  └── □ Configure alert thresholds

□ Custom Domain (Recommended)
  ├── □ Purchase/verify onhyper.io ownership
  ├── □ Configure DNS for Railway deployment
  ├── □ Set up SSL (automatic on Railway with custom domain)
  └── □ Test https://onhyper.io
```

#### Marketing Infrastructure

```
□ Email Welcome Sequence
  ├── □ Write Email 1: Welcome (immediate)
  ├── □ Write Email 2: Quick start tutorial (day 2)
  ├── □ Write Email 3: Feedback request (day 7)
  ├── □ Create email templates in Resend
  └── □ Wire signup trigger to send Email 1

□ Newsletter Capture
  ├── □ Add email capture form below pricing section
  ├── □ Create /api/subscribe endpoint
  └── □ Integrate with Buttondown or store locally

□ Social Media Accounts
  ├── □ X/Twitter: @onhyper or use @hyperio_mc
  ├── □ LinkedIn: OnHyper company page
  ├── □ Indie Hackers: Product page
  └── □ Product Hunt: Maker profile (personal account)

□ Product Hunt Prep
  ├── □ Complete maker profile with bio
  ├── □ Add profile photo
  ├── □ Write draft tagline
  ├── □ Prepare thumbnail (240x240)
  └── □ Identify hunter (self-hunt ok)
```

#### Legal & Compliance

```
□ Terms of Service
  ├── □ Draft ToS using generator or template
  ├── □ Review for API key handling specifics
  └── □ Publish at /terms

□ Privacy Policy
  ├── □ Draft privacy policy (GDPR/CCPA compliant)
  ├── □ Include PostHog analytics disclosure
  └── □ Publish at /privacy
```

#### Documentation

```
□ Support Docs (Basics)
  ├── □ Getting Started guide
  ├── □ How to add an API key
  ├── □ How to create an app
  ├── □ FAQ (10 common questions)
  └── □ Publish at /docs or /help

□ API Documentation
  ├── □ Polish README API section
  ├── □ Add code examples
  └── □ Consider Swagger/OpenAPI if time permits
```

#### Pilot Logistics

```
□ Pilot User Outreach
  ├── □ Identify 50 target developers
  ├── □ Create outreach message template
  ├── □ Prepare pilot signup form or code
  └── □ Set up feedback collection (form or email)

□ Feedback Mechanism
  ├── □ Create feedback form (Typeform, Tally, or custom)
  ├── □ Include pilot-specific questions
  └── □ Set up feedback tracking (spreadsheet or Pipedrive)
```

### 4.2 Before Public Launch (March 10)

#### Content & Assets

```
□ Demo Video
  ├── □ Script 60-90 second video
  ├── □ Record screen capture
  ├── □ Edit with voiceover
  └── □ Upload to YouTube (unlisted for PH embed)

□ Blog Post
  ├── □ Write "Why I Built OnHyper" launch post
  └── □ Publish on launch day morning

□ Press Kit
  ├── □ High-res logo files (PNG, SVG)
  ├── □ Product screenshots (light/dark mode)
  ├── □ Founder bio and headshot
  └── □ Boilerplate text for press
```

#### Product Hunt Final Prep

```
□ Final Assets
  ├── □ Gallery images (3-5 product screenshots)
  ├── □ First comment drafted (maker story)
  ├── □ Hunter confirmed
  ├── □ Support team confirmed (5-10 people)
  └── □ Update social media bio links

□ Launch Day Schedule
  ├── □ 12:01 AM PST: Submit to PH
  ├── □ Immediately: Send welcome email to pilot users
  ├── □ Morning: Post to HN Show HN
  ├── □ Morning: Post to r/sideproject
  ├── □ Morning: Indie Hackers milestone
  └── □ Throughout: Engage on all platforms
```

#### Pilot Wrap-Up

```
□ Pilot Analysis
  ├── □ Review user feedback
  ├── □ Implement critical fixes
  ├── □ Request testimonials from satisfied users
  └── □ Document lessons learned
```

---

## 5. Launch Timeline

### Visual Timeline

```
WEEK 0 (Feb 15-17)       WEEK 1 (Feb 18-24)       WEEK 2 (Feb 25-Mar 3)
PRE-PILOT SETUP          PILOT PHASE 1            PILOT PHASE 2
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Technical setup │     │ Pilot launch    │     │ Iterate & fix   │
│ Legal docs      │     │ Outreach starts │     │ Gather feedback │
│ Accounts        │     │ First 15 users  │     │ Next 15 users   │
│ Welcome emails  │     │ Initial support │     │ Feature requests│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                    ↓
WEEK 3 (Mar 4-9)         WEEK 4 (Mar 10-11)       WEEK 5+ (Mar 12+)
PRE-LAUNCH PREP          PUBLIC LAUNCH            POST-LAUNCH
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Demo video      │     │ Product Hunt    │     │ Content engine  │
│ Blog post       │     │ Hacker News     │     │ User interviews │
│ Testimonials    │     │ Reddit posts    │     │ Feature dev     │
│ Final fixes     │     │ Social push     │     │ Scale systems   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Detailed Phase Breakdown

#### Phase 1: Pre-Pilot Setup (Feb 15-17)

**Goal:** All P0 gaps closed, ready to onboard pilot users

| Day | Category | Tasks | Owner |
|-----|----------|-------|-------|
| **Sat 15** | Technical | PostHog setup, Resend account | Dev |
| **Sat 15** | Marketing | Twitter/X profile, LinkedIn page | Marketing |
| **Sun 16** | Technical | Database backups, domain setup | Dev |
| **Sun 16** | Legal | Draft ToS, Privacy Policy | Legal/Dev |
| **Mon 17** | Marketing | Welcome emails drafted, uploaded to Resend | Marketing |
| **Mon 17** | Documentation | Basic help docs, getting started guide | Dev |
| **Mon 17** | Operations | Pilot user outreach list (50 contacts) | Marketing |

**Deliverables:**
- Working PostHog analytics
- Email service ready
- Terms and Privacy published
- Basic documentation
- 50 pilot prospects identified

---

#### Phase 2: Pilot Phase 1 (Feb 18-24)

**Goal:** 15-20 active pilot users, initial feedback collected

| Day | Category | Tasks | Owner |
|-----|----------|-------|-------|
| **Tue 18** | Launch | Pilot outreach begins (DM, email, post in communities) | Marketing |
| **Tue 18** | Onboarding | First users onboarded, monitor for friction | Dev |
| **Wed 19** | Support | Daily check-in with new users, answer questions | Dev |
| **Thu 20** | Feedback | Send feedback survey to first cohort | Marketing |
| **Fri 21** | Engineering | Address top 3 friction points | Dev |
| **Sat-Sun 22-23** | Iterate | Refine onboarding based on feedback | Dev |
| **Mon 24** | Marketing | Reach out to second batch of prospects | Marketing |

**Deliverables:**
- 15+ pilot users signed up
- 5+ users created their first app
- 10+ users added at least one API key
- Feedback collected and documented

---

#### Phase 3: Pilot Phase 2 (Feb 25 - Mar 3)

**Goal:** 25-40 total pilot users, testimonials secured, major issues resolved

| Day | Category | Tasks | Owner |
|-----|----------|-------|-------|
| **Tue 25** | Onboarding | Continue onboarding new pilot users | Dev |
| **Wed 26** | Product | Implement top feature requests | Dev |
| **Thu 27** | Feedback | Mid-pilot survey, in-depth interviews with power users | Marketing |
| **Fri 28** | Marketing | Request testimonials from satisfied users | Marketing |
| **Sat 1** | Content | Draft blog post for launch | Marketing |
| **Sun 2** | Content | Script and record demo video | Marketing |
| **Mon 3** | Review | Pilot debrief, prioritize launch blockers | All |

**Deliverables:**
- 25+ pilot users total
- 3+ testimonials collected
- Demo video draft
- Blog post draft
- List of post-launch priorities

---

#### Phase 4: Pre-Launch Prep (Mar 4-9)

**Goal:** All launch assets ready, systems tested, team aligned

| Day | Category | Tasks | Owner |
|-----|----------|-------|-------|
| **Tue 4** | Assets | Finalize Product Hunt gallery, thumbnail | Marketing |
| **Tue 4** | Technical | Load test, error handling audit | Dev |
| **Wed 5** | Content | Complete demo video, upload to YouTube | Marketing |
| **Wed 5** | Content | Publish blog post to staging | Marketing |
| **Thu 6** | Support | Prepare canned responses for FAQ | Dev |
| **Thu 6** | Team | Brief support team on launch day roles | All |
| **Fri 7** | Social | Schedule teaser posts for X/Twitter | Marketing |
| **Sat 8** | Final | Final review of all assets, practice PH submission | All |
| **Sun 9** | Pre-launch | Early Product Hunt submission (for 12:01 AM Mon) | Marketing |

**Deliverables:**
- All Product Hunt assets ready
- Demo video complete
- Support team briefed
- Systems load-tested
- Teaser content posted

---

#### Phase 5: Launch Day (Mar 10)

**Goal:** Successful Product Hunt launch, maximum engagement across all venues

| Time (EST) | Platform | Action |
|------------|----------|--------|
| 3:01 AM | Product Hunt | Submit (12:01 AM PST) |
| 3:15 AM | Product Hunt | Post maker first comment |
| 5:00 AM | Product Hunt | Alert support team to engage |
| 8:00 AM | Hacker News | Post Show HN |
| 8:30 AM | Reddit | Post to r/sideproject |
| 9:00 AM | Indie Hackers | Post milestone + update product page |
| 9:30 AM | Twitter/X | Launch announcement thread |
| 10:00 AM | Email | Send to waitlist/newsletter |
| Throughout | All | Engage in comments, answer questions, thank supporters |
| 6:00 PM | Review | Check ranking, plan follow-up |
| 9:00 PM | Wrap-up | Thank supporters, review metrics |

---

#### Phase 6: Post-Launch (Mar 11+)

**Goal:** Sustain momentum, convert users, plan next phase

| Day | Category | Tasks | Owner |
|-----|----------|-------|-------|
| **Tue 11** | Metrics | Analyze launch data, report results | Marketing |
| **Tue 11** | Followup | Personal thanks to top supporters | Marketing |
| **Wed 12** | Content | Post retrospective or lessons learned | Marketing |
| **Wed 12** | Reddit | Post to r/webdev (if not done launch day) | Marketing |
| **Thu 13** | Engineering | Address issues discovered at scale | Dev |
| **Fri 14** | Planning | Plan sprint based on feedback | All |
| **Week 3-4** | Growth | Begin content marketing cadence | Marketing |

**Post-Launch Cadence:**
- **Daily:** Monitor signups, errors, user questions
- **Weekly:** Review metrics, plan content
- **Bi-weekly:** User interviews, feature planning

---

## 6. Success Metrics

### Pilot Success Metrics (Before Public Launch)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Pilot signups** | 25-50 users | Database count |
| **Activation rate** | >60% create an app | PostHog funnel |
| **API key adoption** | >70% add at least 1 key | Database query |
| **Proxy requests** | 500+ total | Usage logs |
| **NPS or satisfaction** | >7/10 average | Survey |
| **Testimonials** | 3+ usable quotes | Feedback form |

### Launch Day Success Metrics

| Metric | Conservative | Good | Great | How to Measure |
|--------|--------------|------|-------|----------------|
| **Product Hunt rank** | Top 10 daily | Top 5 daily | #1 product | PH dashboard |
| **PH upvotes** | 100+ | 300+ | 500+ | PH dashboard |
| **Signups** | 50 | 150 | 300+ | Database |
| **Apps created** | 25 | 75 | 150+ | Database |
| **Proxy requests** | 500 | 2,000 | 5,000+ | Usage logs |
| **Traffic** | 1,000 visits | 5,000 visits | 10,000+ | PostHog/Analytics |

### First Month Post-Launch Metrics

| Metric | Week 1 | Week 2-4 | How to Measure |
|--------|--------|----------|----------------|
| **Total signups** | 200+ | 500+ | Database |
| **Weekly active users** | 50+ | 150+ | Usage logs |
| **Apps created total** | 100+ | 300+ | Database |
| **Proxy requests/day** | 200 | 500 | Usage logs |
| **Paid conversions** | 2+ | 10+ | Stripe |
| **MRR** | $50+ | $200+ | Stripe |

### Long-Term Success Metrics (3-6 months)

| Metric | Month 3 | Month 6 | Notes |
|--------|---------|---------|-------|
| **Total users** | 1,000+ | 5,000+ | Cumulative signups |
| **MRR** | $500 | $2,000+ | Sustainable revenue |
| **Paid conversion rate** | 3-5% | 5-7% | Free to paid |
| **Monthly proxy requests** | 50K+ | 200K+ | Usage growth |
| **Churn rate (paid)** | <5%/mo | <3%/mo | Retention health |
| **NPS** | >30 | >50 | User satisfaction |

### Leading Indicators Dashboard

**Track daily during launch period:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                 DAILY LAUNCH DASHBOARD                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Signups Yesterday:     _______   Target: 25/day (launch week)     │
│  Apps Created:          _______   Target: 10/day                   │
│  Proxy Requests:        _______   Target: 100/day                  │
│  Error Rate:           ______%   Target: <1%                       │
│  Support Tickets:       _______   Watch for spike                   │
│                                                                     │
│  Product Hunt Rank:     _______   (launch day only)                │
│  PH Upvotes:            _______   (launch day only)                │
│                                                                     │
│  Twitter Impressions:   _______   Track engagement                  │
│  HN Points (if posted): _______   Track if relevant                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Risk Mitigation

### Risk Register

| Risk | Probability | Impact | Description |
|------|-------------|--------|-------------|
| **Technical outage on launch day** | Low | Critical | Service goes down during PH peak |
| **Negative feedback goes viral** | Low | High | User complains publicly, gains traction |
| **No traction on Product Hunt** | Medium | Medium | Product gets few upvotes, sinks |
| **Security incident** | Very Low | Critical | API key exposure discovered |
| **Competitor launches same day** | Low | Medium | Larger company announces similar product |
| **Payment processing failure** | Low | High | Stripe misconfiguration blocks paid signups |
| **Email deliverability issues** | Medium | Medium | Welcome emails go to spam |
| **Pilot users don't convert** | Medium | Medium | Free users won't upgrade |
| **Can't get testimonials** | Medium | Low | Pilot users don't provide quotes |
| **Legal issue (ToS, privacy)** | Low | High | User sues or regulator contacts |

### Mitigation Strategies

#### Technical Outage on Launch Day

**Symptoms:** Service unresponsive, 500 errors, Railway outage

**Mitigation:**
1. **Before launch:**
   - Load test with 5x expected traffic (k6, Artillery)
   - Set up uptime monitoring (Pingdom, UptimeRobot)
   - Configure Railway auto-scaling
   - Have rollback plan ready
   
2. **During launch:**
   - Team member dedicated to monitoring
   - Pre-drafted incident response post
   - Ability to put up maintenance page quickly
   
3. **After incident:**
   - Transparent communication
   - Post-mortem published
   - Comp offer for affected users

**Incident Response Template:**
```
Subject: OnHyper experienced an outage - here's what happened

Hey everyone,

On [date], OnHyper experienced [duration] outage during our launch.

**What happened:** [technical explanation]

**What we did:** [response taken]

**What we're doing to prevent this:** [improvements]

If you were affected, reply to this email and we'll [offer].

We're sorry for the disruption.

— The OnHyper Team
```

#### Negative Feedback Goes Viral

**Symptoms:** Critical post on HN/Reddit gets 100+ upvotes, Twitter thread complaining

**Mitigation:**
1. **Monitor:** Set up alerts for brand mentions
2. **Respond quickly:** Engage within 1 hour
3. **Be humble:** Acknowledge issues, don't be defensive
4. **Take offline:** Offer to continue in DMs/email
5. **Fix publicly:** If valid criticism, commit to fixing and update publicly

**Response Template:**
```
@critic You're right to call this out. [Acknowledge specific issue].

Here's what we're doing about it: [action].

DM me if you're open to discussing further — I want to understand
your use case better and make this right.

[Link to issue/GitHub if relevant]
```

#### No Traction on Product Hunt

**Symptoms:** Rank >20 after 6 hours, <50 upvotes, few comments

**Mitigation:**
1. **Don't panic:** PH is just one channel
2. **Double down elsewhere:** Push harder on HN, Reddit
3. **Learn:** Analyze what didn't resonate
4. **Long game:** Focus on content marketing for organic traffic
5. **Relaunch angle:** Consider new feature launch as "2.0" opportunity

**Redemption Strategy:**
- 30 days later: Launch major update as "OnHyper 2.0"
- Use learnings from first attempt
- Different angle or audience

#### Security Incident

**Symptoms:** API key exposure reported, unauthorized usage detected

**Mitigation:**
1. **Before:**
   - Audit encryption implementation
   - Security disclosure policy published
   - Bug bounty (even small/unofficial)
   
2. **During:**
   - Immediate incident response team
   - Affected users notified immediately
   - Rotate all exposed keys
   - Patch vulnerability
   
3. **After:**
   - Full transparency in post-mortem
   - Offer identity protection if appropriate
   - Security audit by third party

**Pre-incident Checklist:**
```
□ Encryption verified by second engineer
□ Secrets never logged
□ Security headers configured (CSP, etc.)
□ Input sanitization in proxy
□ Rate limiting enabled
□ Unusual activity alerting configured
```

#### Payment Processing Failure

**Symptoms:** Users can't upgrade, cards declined, Stripe errors

**Mitigation:**
1. **Test payments before launch** with real cards (own cards, small amounts)
2. **Monitor Stripe dashboard** actively on launch day
3. **Have fallback:** Manual invoice for high-value customers
4. **Support ready:** Canned response for payment issues

#### Competitor Launches Same Day

**Symptoms:** Major company announces competitor on same day

**Mitigation:**
1. **Don't compete on news:** Continue your narrative
2. **Differentiate:** Emphasize what's unique to OnHyper
3. **Ride the wave:** "We're excited to see space growing" (gracious)
4. **Double down on community:** Your personal engagement matters more

---

## 8. Launch Day Runbook

### Team Roles

| Role | Responsibilities | Person |
|------|------------------|--------|
| **Launch Commander** | Overall coordination, makes decisions | |
| **Technical Lead** | Monitors systems, handles outages | |
| **Community Manager** | Engages on PH, HN, Reddit, Twitter | |
| **Support** | Answers user questions, handles issues | |

### Hour-by-Hour Schedule (Launch Day - March 10)

**All times EST**

| Time | Activity | Owner |
|------|----------|-------|
| **02:45** | Wake up, coffee, final prep | Launch Commander |
| **03:00** | Submit to Product Hunt | Launch Commander |
| **03:01** | Maker comment posted | Launch Commander |
| **03:15** | Alert support team | Launch Commander |
| **03:30** | Monitor PH ranking, engagement | Community Manager |
| **05:00** | Check system health | Technical Lead |
| **06:00** | Morning briefing | All |
| **08:00** | Post Show HN | Launch Commander |
| **08:30** | Post to r/sideproject | Community Manager |
| **09:00** | Post to Indie Hackers | Community Manager |
| **09:30** | Twitter thread | Community Manager |
| **10:00** | Email to list | Launch Commander |
| **10:00-18:00** | Engage across all platforms | All |
| **12:00** | Lunch check-in | All |
| **15:00** | Midday metrics review | Launch Commander |
| **18:00** | Evening metrics review | Launch Commander |
| **21:00** | Final check, wrap-up briefing | All |

### Emergency Contacts

| Service | Contact | Backup |
|---------|---------|--------|
| Railway | [railway support渠道] | Status page |
| Stripe | support@stripe.com | Dashboard |
| Resend | support@resend.com | Status page |
| PostHog | support@posthog.com | Status page |

### Pre-Launch Systems Check

**Run 2 hours before launch:**

```bash
# 1. Check service is up
curl -I https://onhyper.io

# 2. Test signup flow
# (Create test account manually)

# 3. Test proxy endpoint
curl https://onhyper.io/proxy

# 4. Check database connection
# (Query from app or dashboard)

# 5. Test email sending
# (Send test email to yourself)

# 6. Verify analytics
# (Check PostHog for recent events)

# 7. Check payment flow
# (Process $1 test payment)
```

---

## 9. Post-Launch Playbook

### Week 1 After Launch

**Daily Tasks:**
- Review signups and engagement
- Answer support questions (< 24 hour response)
- Monitor error rates
- Thank supporters individually
- Engage on social media

**Metrics Review:**
- Compare to targets in Section 6
- Identify any critical issues
- Plan fixes for top 3 bugs

### Week 2-4 After Launch

**Content:**
- Publish follow-up blog post
- Continue social engagement
- Consider guest posts on external blogs

**User Development:**
- Schedule user interviews (5+)
- Analyze churn (why users leave)
- Identify power users for case studies

**Engineering:**
- Address top user requests
- Fix remaining launch bugs
- Begin next feature cycle

### Month 2-3 Strategy

**Assess:**
- Are we hitting metrics?
- What features are actually used?
- What's the conversion funnel?

**Pivot possibilities:**
- If low B2C traction, consider B2B focus
- If agency interest, double down on agency marketing
- If AI agents are key users, optimize for that persona

---

## 10. Quick Reference

### Critical Links (Fill in before launch)

| Resource | URL |
|----------|-----|
| Production site | https://onhyper.io |
| Product Hunt submission | https://producthunt.com/posts/onhyper |
| Hacker News post | https://news.ycombinator.com/item?id=... |
| Indie Hackers page | https://indiehackers.com/product/onhyper |
| Status page | [TBD] |
| Support email | hello@onhyper.io |

### Key Dates

| Milestone | Date |
|-----------|------|
| Pilot start | February 18, 2026 |
| Pilot end | March 9, 2026 |
| Launch day | March 10, 2026 |
| First metrics review | March 17, 2026 |
| Month 1 review | April 10, 2026 |

### Success Criteria Summary

**Pilot:**
- ✅ 25+ active users
- ✅ 60%+ activation rate
- ✅ 3+ testimonials

**Launch:**
- ✅ Top 10 on Product Hunt
- ✅ 150+ signups
- ✅ <1% error rate

**Month 1:**
- ✅ 500+ total users
- ✅ $200+ MRR
- ✅ 10+ paid customers

---

## Appendix A: Pilot Outreach Template

**Email/DM for pilot recruitment:**

```
Subject: Pilot invite: Secure AI API calls without a backend

Hey [Name],

Quick context: I noticed you're [building with AI / dealing with
API key issues / relevant signal].

I just shipped OnHyper — a zero-config proxy service that holds
your API keys server-side. You write frontend code, we handle the
secure backend.

Would you be interested in trying it during our pilot phase? 
No payment needed, just honest feedback.

What you'd get:
• Free Pro tier ($15/mo value) for 3 months
• Direct line to founder for support/feature requests
• Input on roadmap

No pressure — just reply if interested and I'll set you up.

— [Your name]
onhyper.io
```

---

## Appendix B: User Feedback Questions

**For pilot users (send via survey):**

1. How likely are you to recommend OnHyper? (1-10 NPS)
2. What's your primary use case for OnHyper?
3. What was the most confusing part of getting started?
4. What feature do you wish OnHyper had?
5. Would you pay for OnHyper? At what price point?
6. What would make you stop using OnHyper?
7. Any bugs or issues you encountered?
8. Would you be willing to provide a testimonial? (yes/no + contact)

---

## Appendix C: Press Kit Contents

```
press-kit/
├── logos/
│   ├── onhyper-logo-dark.svg       # Light backgrounds
│   ├── onhyper-logo-light.svg      # Dark backgrounds
│   ├── onhyper-icon-512.png        # App icon
│   └── onhorizontal-lockup.svg      # Full logo
├── screenshots/
│   ├── dashboard-light.png
│   ├── dashboard-dark.png
│   ├── app-editor.png
│   └── landing-page.png
├── bios/
│   └── founder-bio.md              # Founder background
└── boilerplate.md                   # Company description
```

**Boilerplate (Draft):**

> OnHyper is a platform for publishing web apps that securely call AI APIs. Founded in 2026, OnHyper's mission is to make API security accessible to every developer — no backend required. The platform provides encrypted key storage, a zero-config proxy service, and instant app publishing for frontend developers building AI-powered applications.

---

*Document Version: 1.0*
*Last Updated: February 15, 2026*
*Author: OpenClaw*