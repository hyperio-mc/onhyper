# OnHyper AI Copilot Chat Widget - Design Document

## Executive Summary

**Recommendation: Build a custom AI copilot using OnHyper's own proxy infrastructure.**

OnHyper is uniquely positioned to self-host its chat widget because:
1. We ARE a proxy service for AI APIs
2. We already have PostHog for tracking
3. We have authentication infrastructure
4. Third-party solutions are expensive for what we need

**MVP Timeline: 2-3 days** | **Cost: ~$5-15/month (our own API usage)**

---

## 1. Chat Widget Options Survey

### Comparison Matrix

| Feature | Intercom | Crisp | Tidio | Chatbase | Dante AI | Custom Build |
|---------|----------|-------|-------|----------|----------|--------------|
| **Free Tier** | No (Early Stage: $39/mo) | Yes (2 agents, limited) | Yes (50 conversations) | Yes (100 credits) | Yes (100 credits) | N/A (we build) |
| **Cost at Scale** | $85+/seat + $0.99/resolution | $95-295/mo | $50-200+/mo (usage-based) | $40-500/mo | $29-299/mo | Our API costs only |
| **AI-Ready** | Yes (Fin AI Agent) | Yes (AI Agent included) | Yes (Lyro AI - add-on) | Yes (core feature) | Yes (core feature) | Yes (we control) |
| **Knowledge Training** | Help center integration | Knowledge training | FAQ/Website scraper | Website/PDFs | Website/PDFs | We build RAG |
| **Human Handoff** | Yes | Yes | Yes | Via integrations | Yes | We build |
| **Lead Capture** | Built-in | Built-in | Built-in | Basic | AI Lead Gen | We build |
| **CRM Integration** | Native + 350+ | Pipedrive, HubSpot, etc. | Pipedrive, HubSpot | Via Zapier | Via Zapier | Direct API |
| **PostHog Integration** | No native | Webhooks possible | No native | No | No | Native |
| **Custom Branding** | Limited on lower tiers | $95/mo+ | $16.67/mo add-on | $199/mo+ | $99/mo+ | Full control |
| **Data Privacy** | US-hosted | EU-hosted option | US-hosted | US-hosted | Unknown | Full control |
| **Setup Ease** | Medium (complex) | Easy | Easy | Very easy | Very easy | Medium (dev work) |
| **Monthly Cost (Est.)** | $39-100+ | $45-95 | $25-50 | $40-150 | $29-99 | $5-15 |

### Detailed Analysis

#### Intercom
- **Pros:** Industry standard, robust features, Fin AI Agent is powerful
- **Cons:** Expensive, pricing is seat-based + resolution-based, overkill for pre-launch
- **AI:** Fin AI Agent ($0.99/resolution) - good but costly at scale
- **Verdict:** Overkill for OnHyper's current stage. Too expensive.

#### Crisp
- **Pros:** Good free tier (2 agents), flat pricing, AI included, EU-hosted
- **Cons:** AI features limited on lower tiers, higher tiers get expensive
- **AI:** AI Agent + knowledge training included in paid plans
- **Verdict:** Strong contender if we want third-party. Best value for money.

#### Tidio
- **Pros:** Generous free tier, easy setup, Shopify-friendly
- **Cons:** Usage-based pricing gets expensive, AI (Lyro) is an add-on
- **AI:** Lyro AI Agent solves up to 67% of questions (separate pricing)
- **Verdict:** Good for sales-heavy use, but add-on model adds up quickly.

#### Chatbase
- **Pros:** AI-first, easy to train on docs/website, quick setup
- **Cons:** Credit-based pricing is unpredictable, big jumps between plans
- **AI:** Core strength - trains on your content quickly
- **Verdict:** Good if we want pure AI chat without human handoff complexity.

#### Dante AI
- **Pros:** Free forever tier, supports multiple LLMs, WhatsApp integration
- **Cons:** Less mature than Chatbase, credit-based can be unpredictable
- **AI:** Strong AI focus, can use own OpenAI key on higher tiers
- **Verdict:** Similar to Chatbase, good for pure AI chat scenario.

#### Custom Build
- **Pros:** Zero marginal cost, full control, uses our own infrastructure, dogfooding
- **Cons:** Dev time required, no pre-built UI, maintenance burden
- **AI:** We ARE an AI proxy - perfect synergy
- **Verdict:** Best option for OnHyper given our unique product fit.

---

## 2. Self-Hosting Option Analysis

### Why Custom Build Makes Sense for OnHyper

#### Unique Advantages

1. **We ARE an AI Proxy Service**
   - OnHyper literally provides proxy access to OpenAI, Anthropic, OpenRouter
   - Using our own service for chat is perfect product validation
   - "Eat your own dogfood" - demonstrates product value

2. **Existing Infrastructure**
   - ✅ Authentication system (JWT-based)
   - ✅ Secret management (encrypted)
   - ✅ Rate limiting (per-user, per-plan)
   - ✅ PostHog analytics (client + server)
   - ✅ Hono backend (fast, minimal)
   - ✅ SvelteKit frontend

3. **Cost Advantage**
   - We pay only for our own API usage
   - OpenRouter/Anthropic/OpenAI calls at our cost (passed through)
   - No SaaS subscription markup

#### Technical Feasibility

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                     Landing Page                             │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Chat Widget (Svelte component)          │   │
│   │                                                      │   │
│   │   • Floating bubble (bottom-right)                   │   │
│   │   • Expandable chat interface                        │   │
│   │   • Lead capture form                                │   │
│   │   • "Talk to human" escalation                       │   │
│   │                                                      │   │
│   └────────────────────────┬────────────────────────────┘   │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             │ POST /api/chat
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   OnHyper Backend                            │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 Chat API Route                        │   │
│   │                                                      │   │
│   │   1. Parse user message                              │   │
│   │   2. Search knowledge base (RAG)                      │   │
│   │   3. Build context + prompt                          │   │
│   │   4. Call /proxy/openrouter or /proxy/anthropic     │   │
│   │   5. Stream response back                            │   │
│   │   6. Track in PostHog                                │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Knowledge Base (SQLite + Vector)       │   │
│   │                                                      │   │
│   │   • Product documentation embeddings                 │   │
│   │   • FAQ entries                                      │   │
│   │   • Pricing information                              │   │
│   │   • Technical details                                │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Custom Build vs Third-Party: Decision Matrix

| Factor | Custom Build | Third-Party (Crisp/Chatbase) |
|--------|--------------|------------------------------|
| **Initial Cost** | Dev time (2-3 days) | $0-50/mo subscription |
| **Ongoing Cost** | ~$5-15/mo (our API usage) | $40-200+/mo |
| **Year 1 Cost** | $180-200 | $480-2400+ |
| **Control** | Full | Limited |
| **Branding** | Perfect match | Custom with limits |
| **Integration** | Native with our stack | Via webhooks/Zapier |
| **Maintenance** | We maintain | They maintain |
| **Dogfooding** | Yes - validates product | No |
| **Data Ownership** | 100% ours | Stored on their servers |
| **AI Model Choice** | Any via our proxy | Their choice |
| **Scalability** | We handle | They handle |

**Decision: CUSTOM BUILD** - The combination of cost savings, product validation, and full control makes this the clear choice for OnHyper.

---

## 3. Chat Functionality & Conversation Flows

### Core Capabilities

The AI copilot should handle:

1. **Product Questions**
   - "What is OnHyper?"
   - "How does it work?"
   - "What APIs do you support?"

2. **Pricing Questions**
   - "How much does it cost?"
   - "What's included in Hobby plan?"
   - "Do you have a free tier?"

3. **Technical Questions**
   - "How do I call the OpenAI proxy?"
   - "How do I store my API keys?"
   - "Is my data encrypted?"

4. **Lead Qualification**
   - Understand visitor's use case
   - Suggest appropriate plan
   - Capture contact info

5. **Demo Booking**
   - Offer to schedule a demo
   - Collect email for follow-up

6. **Human Escalation**
   - "Can I talk to a human?"
   - Business hours awareness

### Conversation Flows

#### Flow 1: New Visitor Discovery

```
Visitor: 👋 [Clicks chat bubble]

Bot: Hey! 👋 I'm the OnHyper AI assistant. I can help you with:
    • Understanding how OnHyper works
    • Pricing and plan questions
    • Technical integration help
    • Booking a demo
    
    What brings you here today?

Visitor: What is OnHyper?

Bot: OnHyper is a secure proxy platform for frontend developers. 
    
    📌 The Problem: If you put API keys in browser code, anyone can steal them.
    
    📌 The Solution: Store your keys on our server, call APIs through our proxy, and we inject your secrets securely.
    
    For example, your app can call GPT-4 without ever exposing your OpenAI key:
    
    ```js
    fetch('/proxy/openai/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: 'gpt-4', messages: [...] })
    })
    ```
    
    No backend required! 🚀
    
    Does that make sense? Want to know more about how it works?

Visitor: How much does it cost?

Bot: We have simple, transparent pricing:
    
    🆓 **Free** - $0/mo
    • 100 requests/day
    • 3 apps
    • Perfect for testing
    
    💡 **Hobby** - $5/mo (most popular)
    • 1,000 requests/day
    • 10 apps
    • Password protection
    
    🚀 **Pro** - $15/mo
    • 10,000 requests/day
    • 50 apps
    • Custom domains
    
    🏢 **Business** - $49/mo
    • 100,000 requests/day
    • Unlimited apps
    • Team collaboration
    
    Which sounds like it fits your needs?

Visitor: I'm building an AI chat app for my portfolio.

Bot: Nice! A portfolio AI chat app sounds like a perfect use case for OnHyper. 🎯
    
    For a portfolio project, I'd recommend starting with our **Free tier** - you get 100 API requests per day, which is plenty for demos.
    
    Once you're ready to show it to employers, you could upgrade to **Hobby ($5/mo)** for more requests and password protection.
    
    Want me to walk you through how to set up an OpenAI proxy call? Or do you have other questions?

Visitor: Yes, show me!

Bot: Here's the quick setup:
    
    **Step 1:** Sign up at onhyper.io/signup
    **Step 2:** Add your OpenAI API key in the dashboard
    **Step 3:** Create your app with this code:
    
    ```js
    // In your app's JavaScript:
    const response = await fetch('/proxy/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello!' }]
      })
    });
    const data = await response.json();
    ```
    
    That's it! No API key in your code. 🔐
    
    Want to:
    1️⃣ Sign up and try it now?
    2️⃣ Ask more questions?
    3️⃣ Get help from a human?
```

#### Flow 2: Lead Capture

```
Bot: [After answering a question]
    
    By the way, would you like me to send you a getting-started guide? 
    Just drop your email and I'll send over setup instructions + example code.

[Visitor types email]

Bot: Perfect! I'll send that guide to you@email.com shortly.
    
    In the meantime, any other questions I can help with?
```

#### Flow 3: Technical Deep-Dive

```
Visitor: How does the encryption work?

Bot: Great question! Here's our security model:
    
    🔐 **AES-256-GCM Encryption**
    All your API keys are encrypted at rest using AES-256-GCM - military-grade encryption.
    
    🧂 **Per-User Salts**
    Each user has a unique salt for encryption. Even if someone got database access, they couldn't decrypt your keys without the master key.
    
    🔑 **Master Key**
    The master encryption key is stored as an environment variable, never in the database.
    
    🚫 **Never Logged**
    Your keys are never logged, never shown in API responses, never exposed.
    
    Basically: your keys are safer with us than in your own `.env` files! 😄
    
    Want to know more about our security practices?

Visitor: What about rate limiting?

Bot: We have multiple layers of rate limiting:
    
    👤 **Per-User Limits**
    Your plan determines your daily request cap:
    • Free: 100/day
    • Hobby: 1,000/day
    • Pro: 10,000/day
    
    🚨 **Overage Protection**
    If you hit your limit, we return a clear 429 error with a message explaining the limit. No surprise charges!
    
    🔧 **Provider Limits**
    We also respect the rate limits of upstream APIs (OpenAI, Anthropic, etc.) and pass through their headers.
    
    Is there a specific rate limit scenario you're worried about?
```

#### Flow 4: Human Escalation

```
Visitor: Can I talk to a real person?

Bot: Absolutely! 🤝
    
    I can connect you with our team. Just leave your email and question, and someone will get back to you within a few hours (usually faster during business hours, 9am-6pm ET).
    
    What's your email?

[Visitor types email]

Bot: Thanks! And what's your question or what would you like help with?

[Visitor types question]

Bot: Got it! I've sent this to our team. You'll hear back at you@email.com soon.
    
    In the meantime, is there anything else I can help with?
```

### Conversation State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                         Chat States                              │
│                                                                  │
│   ┌──────────┐    user message    ┌──────────┐                  │
│   │  IDLE    │ ─────────────────▶ │RESPONDING│                  │
│   └──────────┘                    └──────────┘                  │
│        ▲                               │                         │
│        │                               │ complete                 │
│        │                               ▼                         │
│        │                         ┌──────────┐                    │
│        │                         │FOLLOW UP │                    │
│        │                         └──────────┘                    │
│        │                               │                         │
│        │         ┌─────────────────────┼─────────────────────┐  │
│        │         │                     │                     │  │
│        │         ▼                     ▼                     ▼  │
│        │   ┌───────────┐        ┌───────────┐        ┌───────────┐
│        │   │LEAD       │        │ESCALATE   │        │CONTINUE   │
│        │   │CAPTURE    │        │TO HUMAN   │        │CHAT       │
│        │   └───────────┘        └───────────┘        └───────────┘
│        │         │                     │                     │  │
│        │         │ email captured       │ message sent        │  │
│        └─────────┴─────────────────────┴─────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Knowledge Base Structure

### Content Sources

The AI needs to understand:

#### 1. Product Documentation
- **Source:** README.md, PRD.md, existing docs
- **Content:** Core concept, proxy endpoints, security model

#### 2. FAQ (To Create)
- Common questions with pre-written answers
- Technical troubleshooting
- Getting started guide

#### 3. Pricing
- Plan details, limits, features
- Comparison table
- Upgrade path

#### 4. API Reference
- Available endpoints
- Request/response formats
- Code examples

### Knowledge Base Schema

```sql
-- Knowledge entries for RAG
CREATE TABLE chat_knowledge (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,        -- 'product', 'pricing', 'technical', 'faq'
  question TEXT,                 -- Sample question this answers
  content TEXT NOT NULL,         -- The actual content
  keywords TEXT,                 -- Comma-separated keywords
  priority INTEGER DEFAULT 0,    -- Higher = match first
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vector embeddings (stored as JSON for simplicity)
CREATE TABLE chat_embeddings (
  id TEXT PRIMARY KEY,
  knowledge_id TEXT NOT NULL,
  embedding TEXT NOT NULL,       -- JSON array of floats
  model TEXT DEFAULT 'text-embedding-3-small',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledge_id) REFERENCES chat_knowledge(id) ON DELETE CASCADE
);

-- Chat sessions for context
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT,              -- Anonymous visitor ID
  email TEXT,                   -- If captured
  messages TEXT NOT NULL,       -- JSON array of messages
  lead_captured BOOLEAN DEFAULT FALSE,
  escalated BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lead capture
CREATE TABLE chat_leads (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  email TEXT NOT NULL,
  use_case TEXT,                -- What they're building
  plan_interest TEXT,           -- Which plan they asked about
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);
```

### Initial Knowledge Base Content

#### Product Category

```markdown
# OnHyper Overview

**What is OnHyper?**
OnHyper is a secure proxy platform for frontend developers. We let you build 
web apps that call external APIs (OpenAI, Anthropic, etc.) without exposing 
your API keys in browser code.

**How It Works:**
1. Store your API keys securely on our server (encrypted)
2. Build your app with HTML/CSS/JS
3. Call APIs through our proxy: `/proxy/openai/...`
4. We inject your key server-side and forward the request

**Why This Matters:**
API keys in browser code can be stolen by anyone who views source. OnHyper 
keeps your keys safe while letting you build real, functional web apps 
without a backend.

**Target Users:**
- Frontend developers building API-backed apps
- AI app creators who need to call LLM APIs
- Anyone who wants to publish interactive web apps without a server
```

#### Pricing Category

```markdown
# Pricing Plans

**Free - $0/month**
- 100 API requests per day
- 3 apps maximum
- Public pages only
- Community support
- Perfect for: Testing, prototypes, learning

**Hobby - $5/month** ⭐ MOST POPULAR
- 1,000 API requests per day
- 10 apps maximum
- Password protection available
- All proxy endpoints included
- Perfect for: Side projects, portfolio apps

**Pro - $15/month**
- 10,000 API requests per day
- 50 apps maximum
- Custom domains
- Priority support
- Perfect for: Growing products, serious projects

**Business - $49/month**
- 100,000 API requests per day
- Unlimited apps
- Custom domains
- Team collaboration
- Perfect for: Teams, agencies, high-volume apps

**All plans include:**
- AES-256-GCM encryption for all secrets
- Pre-configured proxy endpoints (OpenAI, Anthropic, OpenRouter, Ollama)
- Real-time usage tracking
- PostHog analytics integration
```

#### Technical Category

```markdown
# Proxy Endpoints

**Available Endpoints:**

1. `/proxy/openai/*` → OpenAI API
   - Requires: OPENAI_API_KEY in your secrets
   - Example: `/proxy/openai/v1/chat/completions`

2. `/proxy/anthropic/*` → Anthropic API
   - Requires: ANTHROPIC_API_KEY
   - Example: `/proxy/anthropic/v1/messages`

3. `/proxy/openrouter/*` → OpenRouter API
   - Requires: OPENROUTER_API_KEY
   - Access to 100+ models through one API

4. `/proxy/ollama/*` → Ollama API
   - Requires: OLLAMA_API_KEY
   - Local model support

5. `/proxy/scout-atoms/*` → Scout OS Atoms
   - Requires: SCOUT_API_KEY
   - Scout Atoms API

**Security Model:**
- All secrets encrypted with AES-256-GCM
- Per-user encryption salts
- Master key stored in environment
- Secrets never logged or returned in APIs
- Keys shown once on creation, then masked

**Rate Limiting:**
- Per-user daily limits based on plan
- 429 response when limit exceeded
- Clear error messages
- Provider rate limits passed through
```

#### FAQ Category

```markdown
# Frequently Asked Questions

**Q: Can I use this for production apps?**
A: Yes! Many users run production apps on OnHyper. Start with Hobby or Pro 
for better limits and features like password protection.

**Q: What happens if I exceed my rate limit?**
A: You'll get a 429 response. No surprise charges. Upgrade your plan or 
wait for the daily reset.

**Q: Can I add custom API endpoints?**
A: Not yet - we support the 5 pre-configured endpoints. Custom endpoints 
are on our roadmap.

**Q: How do I protect my app with a password?**
A: Hobby plan and above include password protection. Enable it in your 
app's settings.

**Q: Can I use a custom domain?**
A: Yes! Pro and Business plans include custom domains with automatic 
SSL via Let's Encrypt.

**Q: What's the difference between OnHyper and serverless functions?**
A: OnHyper is simpler - just HTML/CSS/JS, no function deployment, no 
cold starts. We handle the secret injection, you just call the proxy.

**Q: Do you have an API for programmatic publishing?**
A: Coming soon! We're building an API for AI agents to publish apps 
autonomously.
```

### RAG Implementation Approach

**Option A: Simplified RAG (Recommended for MVP)**
- Use keyword matching + semantic search via OpenAI embeddings
- Store embeddings in SQLite as JSON (simple, works for small KB)
- Retrieve top 3-5 relevant chunks, inject into prompt

**Option B: Vector Database (Future)**
- Use pgvector or a dedicated vector DB (Pinecone, Weaviate)
- Better for larger knowledge bases
- Add when knowledge base grows beyond ~100 entries

**Recommended MVP Implementation:**
```javascript
// Simplified RAG in Hono
async function getRelevantContext(query) {
  // 1. Generate embedding for query
  const embedding = await generateEmbedding(query);
  
  // 2. Find similar knowledge entries
  const results = await db.all(`
    SELECT k.* FROM chat_knowledge k
    JOIN chat_embeddings e ON k.id = e.knowledge_id
    ORDER BY json_array_similarity(e.embedding, ?) DESC
    LIMIT 3
  `, [JSON.stringify(embedding)]);
  
  // 3. Format as context
  return results.map(r => 
    `[${r.category.toUpperCase()}]\n${r.content}`
  ).join('\n\n---\n\n');
}
```

---

## 5. Lead Capture Integration

### Lead Capture Strategy

#### When to Capture
- **Option A: Pre-emptive** - Ask for email before answering
  - ❌ Too aggressive, hurts engagement
  
- **Option B: Value-first** - Answer first, then offer follow-up
  - ✅ Better experience
  - "Want me to send you a getting-started guide?"

- **Option C: Interest-triggered** - Capture when showing intent
  - ✅ Natural escalation
  - "Which plan fits your needs?" → "I can send you details..."

**Recommendation: Options B + C combined**

#### Lead Capture Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Lead Capture Triggers                     │
│                                                              │
│  1. Pricing question → "Which plan fits?" → Email capture   │
│  2. After 3+ messages → "Want a getting started guide?"     │
│  3. Demo request → Always capture email                     │
│  4. Escalation → Always capture email                       │
│  5. Exit intent → "Before you go..." popup                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### CRM Integration: Pipedrive

**Setup:**
1. Create webhook endpoint on OnHyper backend
2. When lead captured → POST to Pipedrive API
3. Create person + deal in Pipedrive

```javascript
// Lead capture → Pipedrive
async function pushLeadToPipedrive(lead) {
  const response = await fetch('https://api.pipedrive.com/v1/persons', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PIPEDRIVE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: lead.email.split('@')[0], // Use email username as name
      email: [{ value: lead.email, primary: true }],
      // Custom fields
      '7a8b9c_use_case': lead.use_case,
      '2d3e4f_plan_interest': lead.plan_interest,
      '5g6h7i_source': 'onhyper-chat'
    })
  });
  
  const person = await response.json();
  
  // Create deal
  await fetch('https://api.pipedrive.com/v1/deals', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PIPEDRIVE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `Chat lead: ${lead.email}`,
      person_id: person.data.id,
      pipeline_id: CHAT_LEADS_PIPELINE_ID,
      stage_id: NEW_LEAD_STAGE_ID
    })
  });
}
```

### PostHog Tracking

We already have PostHog integrated. Track:

```javascript
// Chat events to track
const CHAT_EVENTS = {
  // Engagement
  'chat_opened': { widget_version: 'v1', page: currentPath },
  'chat_closed': { duration_seconds: duration, message_count: count },
  'chat_message_sent': { message_length: length, is_first: boolean },
  
  // AI Response
  'chat_response_generated': { 
    response_time_ms: duration,
    tokens_used: count,
    sources_used: knowledge_ids
  },
  
  // Lead Capture
  'chat_email_requested': { trigger: triggerType },
  'chat_email_submitted': { email_domain: domain },
  'chat_lead_created': { use_case: useCase, plan: plan },
  
  // Escalation
  'chat_escalation_requested': { reason: reasonText },
  'chat_escalation_completed': { response_time_hours: hours },
  
  // Conversion
  'chat_cta_clicked': { cta_type: 'signup' | 'docs' | 'pricing' }
};
```

---

## 6. Implementation Recommendation

### Decision: BUILD (Not Buy)

Given OnHyper's unique position as an AI proxy service, building our own chat widget is the clear choice.

### MVP Implementation Steps

#### Phase 1: Core Chat (1-2 days)

**Day 1: Backend**
1. Create chat API routes in Hono
   - `POST /api/chat/message` - Send message, get response
   - `POST /api/chat/lead` - Capture lead
   - `GET /api/chat/history/:sessionId` - Get conversation history

2. Create knowledge base tables
   - `chat_knowledge`
   - `chat_embeddings`
   - `chat_sessions`
   - `chat_leads`

3. Seed knowledge base with initial content
   - Product overview
   - Pricing details
   - Technical docs
   - FAQ

4. Implement simple RAG
   - OpenAI embeddings via `/proxy/openai`
   - Cosine similarity search in SQLite
   - Context building for prompts

**Day 2: Frontend**
1. Create Svelte chat widget component
   - Floating bubble (bottom-right)
   - Expandable chat window
   - Message bubbles (user/bot)
   - Typing indicator
   - Lead capture form
   - "Talk to human" option

2. Integrate with landing page
   - Add to `+page.svelte`
   - Position and style

3. Wire up PostHog tracking

#### Phase 2: Polish (1 day)

1. **Streaming responses**
   - Stream AI responses for better UX
   - Show text as it arrives

2. **Context awareness**
   - Track conversation history
   - Remember visitor across pages (localStorage)

3. **Smart triggers**
   - "Before you go..." exit intent
   - Proactive greeting after 30 seconds

4. **Mobile optimization**
   - Responsive chat window
   - Touch-friendly

#### Phase 3: Integration (Optional, Day 4)

1. **Pipedrive webhook**
   - Push leads to CRM
   - Create deals automatically

2. **Email follow-up**
   - Send getting-started guide
   - Set up transactional email (Resend?)

3. **Human handoff**
   - Email notification to team
   - Slack integration for escalations

### Files to Create

```
onhyper/
├── src/
│   ├── routes/
│   │   └── chat.ts              # Chat API routes
│   └── lib/
│       ├── chat/
│       │   ├── rag.ts           # RAG implementation
│       │   ├── prompts.ts       # System prompts
│       │   └── knowledge.ts     # Knowledge management
│       └── embeddings.ts        # Embedding generation
│
├── frontend/
│   └── src/
│       ├── lib/
│       │   └── components/
│       │       └── ChatWidget.svelte  # Main widget component
│       └── routes/
│           └── +page.svelte     # Add widget to landing
│
└── knowledge/                   # Knowledge base content
    ├── product.md
    ├── pricing.md
    ├── technical.md
    └── faq.md
```

### Cost Estimate

| Item | Monthly Cost |
|------|--------------|
| OpenAI API (embeddings) | ~$1-2 |
| OpenAI/Anthropic API (chat) | ~$5-10 |
| Hosting (Railway existing) | $0 (already paying) |
| PostHog (existing) | $0 |
| **Total** | **~$6-12/month** |

Compare to:
- Chatbase: $40-150/month
- Crisp: $45-95/month
- Intercom: $39-100+/month

**Savings: $30-150/month** | **Year 1: $360-1800 saved**

---

## 7. Placement & UX

### Widget Position

**Recommendation: Bottom-right corner, standard**

```
┌─────────────────────────────────────────────────────────────┐
│                         Landing Page                         │
│                                                              │
│                                                              │
│                    [Main content area]                       │
│                                                              │
│                                                              │
│                                                              │
│                                       ┌───────────────────┐ │
│                                       │  💬 Chat with AI  │ │ ← Floating button
│                                       └───────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Why bottom-right:**
- Industry standard (users expect it)
- Doesn't interfere with hero content
- Mobile-friendly
- Consistent with major sites

**Alternative options (rejected):**
- ❌ Hero section embedded - Too prominent, aggressive
- ❌ Sticky header - Too intrusive, wastes space
- ✅ Bottom-right floating - Best balance

### Widget States

```
┌──────────────────────────────────────────────────────────────────┐
│                        Widget States                              │
│                                                                   │
│   ┌─────────┐     hover/expand     ┌───────────────────────┐    │
│   │   💬    │  ─────────────────▶  │  OnHyper AI Copilot    │    │
│   │         │                      │  ─────────────────────│    │
│   └─────────┘                      │  [Messages area]       │    │
│       Minimized                    │                        │    │
│       (initial)                    │  ─────────────────────│    │
│                                    │  [Type a message...]  │    │
│                                    └───────────────────────┘    │
│                                         Expanded                 │
│                                                                   │
│   Triggers:                                                       │
│   • Click on bubble → expand                                       │
│   • Click outside or X → collapse                                  │
│   • ESC key → collapse                                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Appearance Timing

**Recommendation: Immediate + Proactive greeting**

```
Timeline:
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  T=0s    Page loads, widget appears (minimized)                   │
│          │                                                        │
│  T=30s   Widget expands with greeting                             │
│          │   "Hey! 👋 Can I help you learn about OnHyper?"        │
│          │   [User can close and it stays minimized]              │
│          │                                                        │
│  T=60s   If user scrolling pricing section:                      │
│          │   "Questions about pricing? I can help!"              │
│          │                                                        │
│  Exit    Mouse leaves top of page (exit intent):                 │
│          │   "Before you go... want a quick getting-started      │
│          │    guide? Just drop your email."                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Configuration options:**
```javascript
const CHAT_CONFIG = {
  // Initial state
  showImmediately: true,
  startMinimized: true,
  
  // Proactive triggers
  proactiveGreeting: {
    delay: 30000,        // 30 seconds
    showOnce: true,      // Don't show again after user closes
    message: "Hey! 👋 Can I help you learn about OnHyper?"
  },
  
  // Context-aware triggers
  contextTriggers: [
    {
      selector: '#pricing',
      message: "Questions about pricing? I can help compare plans!"
    },
    {
      selector: '.how-it-works',
      message: "Want me to walk you through how the proxy works?"
    }
  ],
  
  // Exit intent
  exitIntent: {
    enabled: true,
    threshold: 50,       // Pixels from top
    message: "Before you go... want a quick getting-started guide?",
    showOncePerSession: true
  }
};
```

### Mobile Considerations

```
Desktop (~400px width):
┌─────────────────────────┐
│ OnHyper AI        [X]   │
├─────────────────────────┤
│                         │
│ [Messages area - 280px] │
│                         │
├─────────────────────────┤
│ [Type a message...] [➤] │
└─────────────────────────┘

Mobile (Full-width bottom drawer):
┌─────────────────────────────────┐
│ ────── Handle ──────             │ ← Draggable to close
├─────────────────────────────────┤
│ OnHyper AI               [X]   │
├─────────────────────────────────┤
│                                 │
│      [Messages - fill space]    │
│                                 │
├─────────────────────────────────┤
│ [Type a message...      ] [➤] │
└─────────────────────────────────┘
```

### Styling

Match OnHyper's existing design:
```css
/* Widget colors (from existing Tailwind config) */
--chat-primary: var(--accent);        /* Brand accent */
--chat-bg: var(--surface);            /* Background */
--chat-user-bubble: var(--accent);    /* User message */
--chat-bot-bubble: var(--surface-alt); /* Bot message */
--chat-border: var(--border);         /* Borders */
--chat-text: var(--text);             /* Text */
--chat-text-muted: var(--text-muted); /* Placeholder */
```

---

## Summary & Next Steps

### Recommendation Summary

| Aspect | Recommendation |
|--------|----------------|
| **Build vs Buy** | BUILD |
| **Why** | We ARE an AI proxy - perfect product fit |
| **Timeline** | 2-3 days for MVP |
| **Cost** | ~$6-12/month (API usage only) |
| **Position** | Bottom-right floating, standard |
| **Timing** | Show immediately, proactive greeting at 30s |

### Immediate Next Steps

1. **Create knowledge base content**
   - Write product, pricing, technical, and FAQ sections
   - Seed into database

2. **Build backend chat API**
   - Create routes and RAG logic
   - Connect to our own proxy

3. **Build frontend widget**
   - Svelte component
   - Add to landing page

4. **Deploy and iterate**
   - Launch with basic version
   - Add features based on real usage

### Success Metrics

Track from day one:
- **Engagement:** Chat open rate, message count per session
- **Quality:** AI response satisfaction (thumbs up/down)
- **Conversion:** Lead capture rate, signup attribution from chat
- **Efficiency:** % of questions resolved without human

---

## Appendix: Code Starter Template

### Backend (Hono route)

```typescript
// src/routes/chat.ts
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getRelevantContext } from '../lib/chat/rag.js';
import { SYSTEM_PROMPT } from '../lib/chat/prompts.js';
import { trackChatEvent } from '../lib/analytics.js';

const app = new Hono();

// Chat message endpoint (streaming)
app.post('/message', async (c) => {
  const { message, sessionId } = await c.req.json();
  
  // Get relevant knowledge
  const context = await getRelevantContext(message);
  
  // Build messages
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT(context) },
    ...getSessionHistory(sessionId),
    { role: 'user', content: message }
  ];
  
  // Track event
  trackChatEvent('chat_message_sent', { session_id: sessionId });
  
  // Stream response via our own proxy
  return streamSSE(c, async (stream) => {
    const response = await fetch(`${INTERNAL_URL}/proxy/openrouter/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages,
        stream: true
      })
    });
    
    // Pipe SSE back to client
    for await (const chunk of response.body) {
      await stream.write(chunk);
    }
  });
});

// Lead capture endpoint
app.post('/lead', async (c) => {
  const { email, sessionId, useCase, planInterest } = await c.req.json();
  
  // Save lead
  await db.run(`
    INSERT INTO chat_leads (id, session_id, email, use_case, plan_interest)
    VALUES (?, ?, ?, ?, ?)
  `, [generateId(), sessionId, email, useCase, planInterest]);
  
  // Track
  trackChatEvent('chat_lead_created', { email_domain: email.split('@')[1] });
  
  // Push to Pipedrive (optional)
  if (PIPEDRIVE_ENABLED) {
    await pushLeadToPipedrive({ email, useCase, planInterest });
  }
  
  return c.json({ success: true });
});

export default app;
```

### Frontend (Svelte component)

```svelte
<!-- frontend/src/lib/components/ChatWidget.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  
  let isOpen = false;
  let messages: { role: 'user' | 'assistant'; content: string }[] = [];
  let inputText = '';
  let isLoading = false;
  let showLeadCapture = false;
  let emailInput = '';
  
  const PROACTIVE_DELAY = 30000; // 30 seconds
  
  onMount(() => {
    // Proactive greeting after delay
    const timer = setTimeout(() => {
      if (!localStorage.getItem('chat_greeted')) {
        openChat();
        localStorage.setItem('chat_greeted', 'true');
      }
    }, PROACTIVE_DELAY);
    
    return () => clearTimeout(timer);
  });
  
  function openChat() {
    isOpen = true;
    if (messages.length === 0) {
      messages.push({
        role: 'assistant',
        content: "Hey! 👋 I'm the OnHyper AI assistant. How can I help you today?"
      });
    }
  }
  
  async function sendMessage() {
    if (!inputText.trim() || isLoading) return;
    
    const userMessage = inputText.trim();
    inputText = '';
    messages.push({ role: 'user', content: userMessage });
    isLoading = true;
    
    // Call chat API
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        sessionId: getSessionId()
      })
    });
    
    // Handle streaming response
    const reader = response.body.getReader();
    let assistantMessage = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      // Parse SSE and append to message
      assistantMessage += parseSSE(chunk);
      messages = messages; // Trigger reactivity
    }
    
    messages.push({ role: 'assistant', content: assistantMessage });
    isLoading = false;
    
    // Check for lead capture trigger
    if (shouldCaptureLead(messages)) {
      showLeadCapture = true;
    }
  }
</script>

<!-- Widget bubble -->
{#if !isOpen}
  <button
    on:click={openChat}
    class="fixed bottom-6 right-6 w-14 h-14 bg-accent rounded-full shadow-lg
           flex items-center justify-center hover:scale-105 transition-transform z-50"
  >
    <span class="text-2xl">💬</span>
  </button>
{/if}

<!-- Chat window -->
{#if isOpen}
  <div class="fixed bottom-6 right-6 w-96 h-[32rem] bg-surface rounded-2xl 
              shadow-2xl flex flex-col border border-border z-50">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 
                   border-b border-border bg-surface-alt rounded-t-2xl">
      <div class="flex items-center gap-2">
        <span class="text-xl">🤖</span>
        <span class="font-semibold">OnHyper AI</span>
      </div>
      <button on:click={() => isOpen = false} class="text-text-muted hover:text-text">
        ✕
      </button>
    </header>
    
    <!-- Messages -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      {#each messages as message}
        <div class="{message.role === 'user' ? 'ml-auto bg-accent text-white' : 
                     'mr-auto bg-surface-alt'} rounded-2xl px-4 py-2 max-w-[80%]">
          {message.content}
        </div>
      {/each}
      {#if isLoading}
        <div class="mr-auto bg-surface-alt rounded-2xl px-4 py-2">
          <span class="animate-pulse">...</span>
        </div>
      {/if}
    </div>
    
    <!-- Input -->
    <footer class="p-4 border-t border-border">
      {#if showLeadCapture}
        <div class="space-y-2">
          <input
            type="email"
            bind:value={emailInput}
            placeholder="Your email..."
            class="w-full px-4 py-2 rounded-lg bg-surface-alt border border-border
                   focus:ring-2 focus:ring-accent focus:outline-none"
          />
          <button
            class="w-full py-2 bg-accent text-white rounded-lg hover:opacity-90"
          >
            Send me the guide
          </button>
        </div>
      {:else}
        <form on:submit|preventDefault={sendMessage} class="flex gap-2">
          <input
            bind:value={inputText}
            placeholder="Ask about OnHyper..."
            class="flex-1 px-4 py-2 rounded-lg bg-surface-alt border border-border
                   focus:ring-2 focus:ring-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            class="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90
                   disabled:opacity-50"
          >
            ➤
          </button>
        </form>
      {/if}
    </footer>
  </div>
{/if}
```

---

*Document created: February 15, 2026*
*Version: 1.0*
*Status: Ready for implementation*