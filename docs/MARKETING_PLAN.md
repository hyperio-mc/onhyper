# OnHyper.io Marketing Plan

## Executive Summary

OnHyper.io is a platform for publishing full-stack web apps that securely call external APIs. The core problem: developers building frontend apps that use AI APIs (OpenAI, Anthropic, etc.) expose their API keys in browser code. OnHyper provides a secure proxy service that holds API keys server-side and injects them at request time.

**Core Differentiator:** Turnkey solution—no backend setup, no serverless function configuration, no code to maintain. Just add your API keys, write your frontend, and publish.

---

## 1. Target Personas

### Primary Persona: The Solo AI Builder
- **Profile:** Individual developer building AI-powered tools, demos, and side projects
- **Pain Points:**
  - Doesn't want to maintain backend infrastructure
  - Knows API keys in frontend code is bad practice but has no simple alternative
  - Wants to ship fast, not configure serverless functions
- **Platforms:** Active on X/Twitter, Hacker News, Reddit
- **Keywords:** "vibe coding," "build in public," "AI apps," "side projects"
- **Value to OnHyper:** High volume, viral potential, early adopters

### Secondary Persona: The Frontend-First Agency
- **Profile:** Small agency (2-10 people) building client sites with AI integrations
- **Pain Points:**
  - Clients want AI features but don't want to pay for backend development
  - Need to manage multiple API keys across projects
  - Security is a selling point to clients
- **Channels:** LinkedIn, agency communities, direct outreach
- **Value to OnHyper:** Higher willingness to pay, multiple projects per account

### Tertiary Persona: The AI Agent / Auto-Generated App
- **Profile:** AI coding agents that need to publish interactive apps
- **Pain Points:**
  - Agents can generate frontend code but can't deploy backends
  - Need a way to let users bring their own API keys
- **Channels:** Agent platforms, developer tools ecosystem
- **Value to OnHyper:** Novel use case, differentiation story

### Future Persona: Enterprise Development Teams
- **Profile:** Larger teams with compliance requirements
- **Pain Points:**
  - Need audit logs, team management, dedicated support
- **Timing:** Phase 2/3 after core features mature

---

## 2. Value Proposition

### The Core Pitch
**"Ship AI-powered apps without exposing your API keys or building a backend."**

### Problem → Solution Mapping

| Problem | OnHyper Solution |
|---------|------------------|
| "I have to build a backend just to hide my OpenAI key" | Zero backend required. Add key in dashboard, proxy handles injection. |
| "Serverless functions are confusing to set up" | No functions to write. Pre-configured proxy endpoints for all major AI APIs. |
| "My demo app leaked my API key on GitHub" | Keys stored encrypted server-side, never appear in code. |
| "I want to share my app but not my API costs" | Users can bring their own keys for your published app. |
| "Netlify/Vercel free tier has request limits" | 100 requests/day free, transparent paid tiers. |

### differentiated Messaging

**Speed of implementation:**
- "From zero to production in 10 minutes"
- "The fastest path from 'I have an API key' to 'I have a live app'"

**No-code backend:**
- "The backend you didn't have to build"
- "Your frontend is now full-stack"

**Security-first:**
- "Your API keys never touch the browser"
- "AES-256-GCM encrypted at rest. Injected server-side. Never logged. Never leaked."

---

## 3. Competitive Analysis

### Direct Competitors

| Competitor | What They Do | OnHyper Advantage |
|------------|--------------|-------------------|
| **Netlify Functions** | Serverless functions for API proxying | Simpler: no function code to write/maintain. Pre-built proxy endpoints. |
| **Vercel Serverless Functions** | Similar to Netlify | Same as above. OnHyper is purpose-built for this one use case. |
| **Supabase Edge Functions** | Edge functions + full backend | Less overhead. No database setup required. Focused on proxy use case. |
| **Cloudflare Workers** | Edge compute platform | Lower complexity. No Worker code to write. Turnkey for AI APIs. |
| **Val Town** | Serverless Val platform | Public by default (code visible). OnHyper is private-first. Purpose-built for proxying. |
| **Deno Deploy** | Edge JavaScript runtime | Requires writing proxy code. OnHyper provides the proxy, you provide the app. |

### Indirect Solutions

| Solution | Drawback | OnHyper Advantage |
|----------|----------|-------------------|
| **Custom backend (Express/Fastify)** | Requires DevOps, hosting, maintenance | Zero infrastructure. Push-button deploy. |
| **Google API Key Restrictions** | Still exposed in code, just domain-limited | True security. Keys never in browser. |
| **Environment Variables in CI/CD** | Still end up in built frontend code | Server-side injection. Keys stay server-side. |
| **Backend-as-a-Service (Firebase)** | Overkill for simple proxy needs | Focused scope. No database complexity. |

### Competitive Positioning

**Where OnHyper wins:**
- Developers who want the simplest possible solution
- Speed-to-deployment is the priority
- AI API use cases (OpenAI, Anthropic, OpenRouter focus)
- Side projects, demos, prototypes

**Where competitors are better:**
- Complex backend requirements beyond proxying
- Teams already invested in Netlify/Vercel ecosystem
- Need for edge computing beyond API proxying

**Messaging angle:** "For everyone else building AI frontends."

---

## 4. Marketing Channels

### 4.1 SEO Strategy

**Primary Keywords (High Intent)**
| Keyword | Search Intent | Content Type |
|---------|---------------|--------------|
| "hide API key frontend" | Developers seeking solutions | Tutorial/blog |
| "secure API key react" | Framework-specific search | React tutorial |
| "API proxy service frontend" | Evaluating solutions | Comparison page |
| "API key leak prevention" | Security-conscious | Security explainer |

**Secondary Keywords (Discovery)**
| Keyword | Search Intent | Content Type |
|---------|---------------|--------------|
| "openai api frontend proxy" | Use-case specific | OpenAI tutorial |
| "claude api without backend" | Anthropic users | Anthropic tutorial |
| "openrouter proxy setup" | OpenRouter users | Integration guide |
| "ai app without backend" | Problem-aware | Landing page |

**Long-tail Keywords**
- "how to call openai from static website"
- "protect api key in client side javascript"
- "front-end only app with secure api calls"
- "simplest way to proxy api requests"

**Content Structure for SEO:**
1. `/blog/hide-api-keys-frontend-apps` - Core pillar content
2. `/blog/openai-api-frontend-security` - Use-case specific
3. `/blog/anthropic-claude-api-proxy` - Use-case specific
4. `/blog/serverless-vs-onhyper` - Comparison content

### 4.2 Social Media Strategy

**X/Twitter (@hyperio_mc)**

*Content pillars:*
- **Build in public:** Development updates, feature releases
- **Educational:** Tips on API security, "did you know" threads
- **Success stories:** User apps built with OnHyper
- **Engagement:** Polls, questions, hot takes on API security

*Posting cadence:*
- 3-5 tweets/week minimum during launch
- 1 thread/week (educational deep-dive)

*Hashtag strategy:*
- #buildinpublic, #indiedev, #AIdev, #OpenAI, #webdev

*Launch tactics:*
- Teaser campaign (1 week before launch)
- Launch day thread with demo video
- Reply to relevant tweets with helpful info + soft mention

**Reddit**

*Target subreddits:*
- r/webdev (1.2M members)
- r/frontend (50K members)
- r/sideproject (90K members)
- r/OpenAI (200K members)
- r/indiehackers (100K members)

*Approach:*
- Genuine participation first (answer questions about API security)
- Share OnHyper only when genuinely relevant
- Case study posts: "I built an app that calls OpenAI securely without a backend"

*Key insight from research:* Reddit regularly has posts asking how to hide API keys. High-intent audience.

**Hacker News**

*Approach:*
- Submit to Show HN on launch day
- Technical blog posts that provide value (not just marketing)
- Comment on API security discussions with genuine insight

*Content that works on HN:*
- Technical deep-dives on architecture
- Security analysis/tutorials
- "Ask HN" monitoring for relevant questions

### 4.3 Developer Communities

**Dev.to / Hashnode**
- Cross-post tutorials and technical content
- Series: "Secure API Integration for Frontend Developers"

**Indie Hackers**
- Product page listing
- Milestone posts sharing journey
- Engagement in discussions about API security

**Discord/Slack Communities**
- OpenAI community Discord
- Anthropic community
- React/Vue/Svelte communities (where relevant to API usage)

### 4.4 Content Marketing Ideas

**Core Content Pillars:**

1. **Security Education** (builds trust)
   - "Why API keys in frontend code will always leak"
   - "The anatomy of an API key theft"
   - "Serverless vs. purpose-built proxy services"

2. **How-To Tutorials** (drives signups)
   - "Build an AI chat app in 30 minutes with OnHyper"
   - "Secure OpenAI integration for static sites"
   - "From Vercel Functions to OnHyper: Simplifying your stack"

3. **Comparisons** (captures evaluators)
   - "OnHyper vs. Netlify Functions for API proxying"
   - "When to use OnHyper vs. build your own backend"
   - "API security solutions compared"

4. **Use Case Spotlights** (shows possibilities)
   - "5 AI apps you can build this weekend"
   - "Building a Claude-powered code reviewer"
   - "Creating an AI art gallery with secure API calls"

---

## 5. Launch Strategy: 0 to 100 Users

### Phase 1: Pre-Launch (Weeks 1-2)

**Goals:**
- Build waitlist of 50+ interested developers
- Establish social presence
- Create launch content

**Actions:**

| Day | Action |
|-----|--------|
| 1-3 | Create @onhyper handle on X, Reddit. Set up landing page with waitlist. |
| 4-7 | Publish "Why Your API Keys Will Leak" blog post. Share on HN, Reddit. |
| 8-10 | Create demo video (60 seconds): "API key exposure → OnHyper fix" |
| 11-14 | Thread on X: "Every way developers try to hide API keys (and why they fail)" |

**Waitlist incentive:** Free Pro tier for 3 months for first 100 signups

### Phase 2: Soft Launch (Weeks 3-4)

**Goals:**
- 25 active users
- Identify friction points
- Collect testimonials

**Actions:**
- Reach out personally to 50 developers from research/intent signals
- DM developers who posted about API key security issues on Reddit/Twitter
- Post in r/beta for product feedback
- Share in small Discord communities (ask permission first)

**Outreach template:**
```
Hi [Name], noticed you posted about hiding API keys in frontend code. 
I just launched OnHyper.io—a purpose-built proxy service for AI APIs. 
No backend, no functions to write, just secure proxying.

Would love your feedback if you have 5 minutes. Happy to give you 
free Pro access in exchange for trying it out.
```

### Phase 3: Public Launch (Weeks 5-6)

**Goals:**
- 100+ users
- Product Hunt feature
- Viral content moment

**Launch Day Checklist:**
- [ ] Product Hunt submission (schedule for Tuesday 12:01am PT)
- [ ] Show HN post
- [ ] Launch thread on X
- [ ] Email waitlist
- [ ] Post in r/SideProject, r/indiehackers, r/webdev
- [ ] Direct outreach to tech Twitter accounts (indie dev influencers)

**Launch Content:**
- Demo video: "30 seconds to an AI app with OnHyper"
- Blog: "Launching OnHyper: The Backend You Didn't Have to Build"
- Tweetorial: "The complete guide to choosing an API proxy solution"

### Phase 4: Sustain & Iterate (Weeks 7-12)

**Goals:**
- 200+ users
- 10+ paid conversions
- Content engine running

**Actions:**
- Weekly educational content (blog + social)
- User interview program (offer $25 gift cards for 15-minute calls)
- Implement feedback from early users
- A/B test pricing messaging
- Build referral program

### Pricing Strategy

**Recommended: Freemium with generous free tier**

| Plan | Price | Limits | Target User |
|------|-------|--------|-------------|
| Free | $0 | 100 requests/day, 3 apps | Hobbyists, evaluators |
| Hobby | $5/mo | 1,000 requests/day, 10 apps | Regular builders |
| Pro | $15/mo | 10,000 requests/day, 50 apps | Serious indies, agencies |
| Business | $49/mo | 100,000 requests/day, unlimited apps | Teams, high-volume |

**Why this works:**
- Free tier removes barrier to entry
- 100 requests/day is enough for demos/experiments
- Clear upgrade path as usage grows
- Business tier for future team features

**Free tier optimization:**
- Include OnHyper branding on free apps (viral growth)
- Show usage meter prominently (upgrade trigger)

---

## 6. Content Calendar (First 12 Weeks)

### Month 1: Foundation

| Week | Blog Post | Social Content | Other |
|------|-----------|----------------|-------|
| 1 | "Why API Keys in Frontend Code Always Leak" | Launch announcement thread | Product Hunt |
| 2 | "Getting Started with OnHyper in 10 Minutes" | Demo video | Newsletter #1 |
| 3 | "OnHyper vs. Netlify Functions: When Simplicity Wins" | Twitter poll: preferred method | |
| 4 | "5 AI Apps You Can Build This Weekend" | User showcase thread | |

### Month 2: Education

| Week | Blog Post | Social Content | Other |
|------|-----------|----------------|-------|
| 5 | "Securing OpenAI API Calls: A Complete Guide" | Security tips thread | |
| 6 | "Building a Claude-Powered Chat App" | User story highlight | Newsletter #2 |
| 7 | "The Hidden Cost of 'Free' Serverless Functions" | Comparison infographic | |
| 8 | "API Key Rotation: Why and How with OnHyper" | Live demo on X Spaces | |

### Month 3: Ecosystem

| Week | Blog Post | Social Content | Other |
|------|-----------|----------------|-------|
| 9 | "OpenRouter Integration Guide" | Tutorial video | Guest post pitch |
| 10 | "Agency Guide: Managing Multiple Client API Keys" | Case study thread | |
| 11 | "From Prototype to Production with OnHyper" | Scaling tips thread | Newsletter #3 |
| 12 | "What's Next for OnHyper: Roadmap Q&A" | AMA thread | Referral program launch |

---

## 7. Success Metrics & KPIs

### Acquisition Metrics

| Metric | Week 4 Target | Week 12 Target | How to Track |
|--------|---------------|----------------|--------------|
| Total Signups | 50 | 300 | Database |
| Active Users (weekly) | 25 | 150 | Usage logs |
| Apps Created | 30 | 400 | Database |
| Proxy Requests | 500 | 10,000 | Usage logs |

### Engagement Metrics

| Metric | Target | How to Track |
|--------|--------|--------------|
| Time to First App | < 15 minutes | Onboarding analytics |
| Apps per User | > 1.5 | Database |
| Weekly Active % | > 20% | Usage logs |
| Feature Adoption (keys added) | > 70% of users | Database |

### Conversion Metrics

| Metric | Week 12 Target | How to Track |
|--------|----------------|--------------|
| Free → Paid Conversion Rate | 5-10% | Stripe + database |
| MRR | $200+ | Stripe |
| Churn Rate | < 5%/mo | Stripe |

### Marketing Metrics

| Metric | Target | How to Track |
|--------|--------|--------------|
| Blog Traffic | 5K visits/month | Analytics |
| Social Followers | 500 across platforms | Native |
| Waitlist → Signup | 40% conversion | Database |
| Referral Signups | 10%/mo after referral launch | Database + referral codes |

### Leading Indicators (Daily Dashboard)

1. **Signups yesterday**
2. **Apps created yesterday**
3. **Proxy requests yesterday**
4. **Error rate** (technical health)
5. **Social mentions**

---

## 8. Budget Considerations

### Minimal Viable Launch (First 3 Months)

| Item | Cost |
|------|------|
| Domain (onhyper.io) | ~$12/year |
| Railway hosting | Free tier → ~$5/mo |
| Stripe integration | Free (pay per transaction) |
| Video editing tools | $0-20 (use free tools) |
| Social scheduling | $0 (manual) |
| **Total** | ~$50-100 |

### Growth Investment (Months 4-12)

| Item | Monthly Cost |
|------|--------------|
| Email marketing (ConvertKit/Resend) | $29/mo |
| Analytics dashboard | $0-20/mo |
| Content creation support | varies |
| Paid social experiments | $100-500/mo |
| SEO tools (Ahrefs/Semrush) | $99-200/mo |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Market ignores purpose-built solution | Medium | High | Strong positioning around simplicity; content proving the pain point |
| Competitors add similar features | High | Medium | First-mover advantage; focus on UX simplicity |
| Serverless platforms reduce friction | Medium | Medium | Stay ahead on developer experience; expand beyond basic proxying |
| Security incident | Low | High | Invest in security practices; incident response plan |
| Can't reach 100 users | Low | High | Pivot based on feedback; explore agency/B2B angle |

---

## 10. Next Actions (Immediate)

### This Week
1. [ ] Finalize landing page copy with value proposition
2. [ ] Set up X/Twitter (@onhyper or use @hyperio_mc)
3. [ ] Write first blog post: "The API Key Security Problem"
4. [ ] Create 60-second demo video
5. [ ] Set up analytics (Plausible or simple server-side)

### Week 2
1. [ ] Build waitlist mechanism (or use existing auth)
2. [ ] Create 10 developer outreach targets
3. [ ] Write OnHyper documentation
4. [ ] Set up Product Hunt profile

### Week 3
1. [ ] Soft launch to 25 hand-picked developers
2. [ ] Iterate based on feedback
3. [ ] Prepare Product Hunt assets

### Week 4
1. [ ] Public launch (Product Hunt, HN, Reddit)
2. [ ] Email any existing contacts
3. [ ] Begin content calendar execution

---

## Appendix: Content Templates

### Twitter Thread Template

```
1/ 🧵 Every frontend dev knows this problem:

You need to call an API, but the key can't be exposed.

Here's what developers try (and why each fails)...

2/ ❌ Attempt 1: Environment variables
Result: Still end up in the built bundle. Anyone can find them.

3/ ❌ Attempt 2: Domain-restricted API keys
Result: The key is still visible. Attackers can spoof referrers.

4/ ❌ Attempt 3: "I'll just keep it on localhost"
Result: Now you can't share your app. And it's still in your git repo.

5/ ✅ The real solution: Server-side proxy
Your key never touches the browser.

But setting up a backend or serverless functions is a pain.

6/ That's why I built OnHyper.io:
• Add your keys server-side
• Write your frontend
• Proxy handles the rest

No backend. No functions. No leaked keys.

7/ Link in bio. Takes 10 minutes from signup to live app.

[Demo video or screenshot]
```

### Reddit Post Template (r/webdev)

```
Title: I built a turnkey API proxy for frontend devs tired of leaking their keys

Hey r/webdev,

Like many of you, I've had API keys leak from client-side code. Not because I didn't know it was bad practice, but because the alternatives were too much overhead for a side project.

I tried:
- Netlify Functions (too much boilerplate)
- Vercel serverless (same issue)
- Val Town (code is public by default)
- Building a custom backend (didn't want to maintain it)

So I built [OnHyper.io](https://onhyper.io) — a purpose-built proxy service for AI APIs.

You:
1. Add your API keys in the dashboard (OpenAI, Anthropic, OpenRouter, Ollama, Scout)
2. Create an app with HTML/CSS/JS
3. Call /proxy/:endpoint from your code

OnHyper injects your key server-side. Your key never touches the browser.

Free tier: 100 requests/day, 3 apps.

Currently in soft launch — would love feedback from folks who've dealt with this problem.

Happy to answer questions about the architecture, pricing, or use cases.
```

---

*Marketing Plan v1.0 — February 2026*
*Created for OnHyper.io launch*