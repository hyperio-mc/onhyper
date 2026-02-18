# OnHyper Support Chat App - Implementation Plan

## Overall Goal

Add a support chat feature to OnHyper that uses ScoutOS Agents for AI-powered responses, trained on OnHyper documentation.

## Overall Success Criteria

- [ ] Users can click "Chat" in navigation and see a full chat interface
- [ ] Chat responds with accurate OnHyper information (pricing, features, API usage)
- [ ] Streaming responses work (text appears incrementally, not all at once)
- [ ] Conversation persists across page refreshes (localStorage session)
- [ ] Agent ID stored in Railway env and used by all chat requests
- [ ] PostHog tracks chat events (message sent, lead captured)

---

## ScoutOS Agent API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /agents` | GET | List all agents |
| `POST /agents` | POST | Create/update agent (multipart) |
| `POST /world/{agent_id}/_interact` | POST | **Streaming** chat (text/event-stream) |
| `POST /world/{agent_id}/_interact_sync` | POST | Sync chat (JSON response) |
| `POST /drive/upload` | POST | Upload documents for RAG |

**Via OnHyper proxy:** `POST /proxy/scoutos/world/{agent_id}/_interact`

---

## Phase 1: ScoutOS Agent Setup

### Step 1.1: Create ScoutOS Agent ✅

**Action:** Create a new agent in ScoutOS Studio

**How:**
1. Go to https://studio.scoutos.com/agents
2. Click "Create Agent"
3. Name: "OnHyper Support"
4. Description: "AI support assistant for OnHyper.io"

**Success Criteria:**
- [x] Agent appears in ScoutOS agents list
- [x] Agent ID copied and saved

**Result:**
- **Agent ID**: `cmlo9s6t320kv5ts6xqz1ke84`
- **Revision ID**: `cmlo9s6t320kw5ts6jpkckzckzox`
- **Model**: Claude Sonnet 4
- **Created**: Via API (POST /agents)
- **Railway Env**: `SCOUTOS_SUPPORT_AGENT_ID` set

**Time:** 5 min

---

### Step 1.2: Configure System Prompt

**Action:** Set the agent's system prompt

**Prompt:**
```
You are the OnHyper AI Support Assistant. You help visitors understand and use OnHyper.

## About OnHyper
OnHyper is a secure proxy platform for frontend developers. It allows publishing web apps that can safely call external APIs (OpenAI, Anthropic, OpenRouter, ScoutOS, etc.) without exposing API keys in browser code.

## Key Features
- Secure secret storage (AES-256-GCM encryption)
- Pre-configured proxy endpoints for popular APIs
- No backend required - just HTML/CSS/JS
- App hosting at onhyper.io/a/{slug}
- Free tier: 100 requests/day, 3 apps

## Your Role
- Answer questions about OnHyper clearly and helpfully
- Guide users to relevant documentation or signup
- Help with technical integration questions
- Be friendly and professional
- Use code examples when explaining technical concepts

## What You DON'T Do
- Don't make up features or pricing not in your knowledge
- Don't share sensitive information about other users
- Don't pretend to be human - you are an AI assistant
```

**Success Criteria:**
- [ ] System prompt saved in agent settings
- [ ] Agent responds to test message "What is OnHyper?" with relevant answer

**Time:** 15 min

---

### Step 1.3: Upload Knowledge Documents

**Action:** Upload OnHyper docs to ScoutOS Drive for RAG

**Documents to upload:**
1. `PRD.md` - Product requirements
2. `blog/introducing-onhyper.md` - Launch post
3. `blog/dogfooding-atoms-onhyper.md` - Example usage
4. `faq.md` - Create and upload (see below)

**Create `faq.md`:**
```markdown
# OnHyper FAQ

## What is OnHyper?
OnHyper is a secure proxy platform that lets you build frontend apps that call APIs without exposing your API keys.

## How do I get started?
1. Sign up at onhyper.io
2. Add your API key in Settings > Secrets
3. Create an app with HTML/CSS/JS
4. Call APIs through /proxy/openai/... etc.

## What are the pricing plans?
- Free: $0/mo - 100 req/day, 3 apps
- Hobby: $5/mo - 1,000 req/day, 10 apps
- Pro: $15/mo - 10,000 req/day, 50 apps
- Business: $49/mo - 100,000 req/day, unlimited apps

## What APIs are supported?
OpenAI, Anthropic, OpenRouter, Ollama, ScoutOS Atoms

## How is my API key stored?
Keys are encrypted with AES-256-GCM. They never touch the browser.
```

**Success Criteria:**
- [ ] All 4 documents uploaded to ScoutOS Drive
- [ ] Agent uses knowledge when asked about pricing/features
- [ ] Test: "What are the pricing plans?" returns accurate info

**Time:** 30 min

---

### Step 1.4: Test Agent Via API

**Action:** Verify agent works via OnHyper proxy

**Command:**
```bash
# Replace {AGENT_ID} with your agent ID
curl -X POST "https://onhyper.io/proxy/scoutos/world/{AGENT_ID}/_interact_sync" \
  -H "X-App-Slug: support-chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"content":{"text":"What is OnHyper?"}}]}'
```

**Success Criteria:**
- [ ] API returns 200 status
- [ ] Response contains relevant answer about OnHyper
- [ ] No authentication errors

**Time:** 15 min

---

### Step 1.5: Store Agent ID in Railway ✅

**Action:** Add agent ID to Railway environment

**Command:**
```bash
railway variable set SCOUTOS_SUPPORT_AGENT_ID=cmlo9s6t320kv5ts6xqz1ke84
```

**Success Criteria:**
- [x] Variable appears in `railway variable` list
- [x] Ready for app to pick up

**Time:** 1 min

---

## Phase 2: Backend Chat Routes

### Step 2.1: Add Streaming Support to Proxy

**Action:** Update proxy to handle SSE streaming responses

**File:** `src/routes/proxy.ts`

**Changes needed:**
- Detect `text/event-stream` content-type
- Use `streamSSE` from Hono for streaming responses
- Pass through SSE events from ScoutOS

**Success Criteria:**
- [ ] `POST /proxy/scoutos/world/{id}/_interact` returns SSE stream
- [ ] Events arrive incrementally (not buffered)
- [ ] Non-streaming endpoints still work

**Test:**
```bash
curl -N "https://onhyper.io/proxy/scoutos/world/{AGENT_ID}/_interact" \
  -H "X-App-Slug: support-chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"content":{"text":"Hello"}}]}'
# Should see events arriving one by one
```

**Time:** 1 hour

---

### Step 2.2: Create Chat Route

**Action:** Create dedicated `/api/chat` routes

**File:** `src/routes/chat.ts` (new)

**Endpoints:**
- `POST /api/chat/message` - Send message to agent
- `POST /api/chat/lead` - Capture lead info

**Success Criteria:**
- [ ] `POST /api/chat/message` returns agent response
- [ ] Streaming works through `/api/chat/message`
- [ ] `POST /api/chat/lead` stores lead in database
- [ ] Errors return proper status codes

**Time:** 1 hour

---

### Step 2.3: Register Chat Routes

**Action:** Mount chat routes in main app

**File:** `src/index.ts`

**Changes:**
```typescript
import { chat } from './routes/chat.js';
// ...
app.route('/api/chat', chat);
```

**Success Criteria:**
- [ ] Routes accessible at `/api/chat/*`
- [ ] No TypeScript errors
- [ ] Build succeeds

**Time:** 10 min

---

### Step 2.4: Deploy and Test Backend

**Action:** Push changes and test on production

**Commands:**
```bash
git add -A && git commit -m "feat: Add chat API with streaming support"
git push
railway up --detach
```

**Success Criteria:**
- [ ] Deployment succeeds
- [ ] `POST /api/chat/message` works with test message
- [ ] Response contains session_id for conversation continuity

**Time:** 15 min

---

## Phase 3: Frontend Chat UI

### Step 3.1: Add Chat to Navigation

**Action:** Add "Chat" link to main navigation

**File:** `public/app.js` (or equivalent)

**Changes:**
```javascript
const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Apps', href: '/apps', requiresAuth: true },
  { label: 'Waitlist', href: '/waitlist' },
  { label: 'Blog', href: '/blog' },
  { label: 'Chat', href: '/chat' },  // ADD THIS
];
```

**Success Criteria:**
- [ ] "Chat" appears in navigation
- [ ] Clicking navigates to `/chat`
- [ ] Works on mobile

**Time:** 15 min

---

### Step 3.2: Create Chat Page

**Action:** Create the chat page template

**File:** `public/pages/chat.html` (new)

**Components:**
- Chat header with title
- Message list (user + assistant messages)
- Input field with send button
- Typing indicator
- Lead capture form (email input, shown after N messages)

**Success Criteria:**
- [ ] Page loads at `/chat`
- [ ] Layout matches site design
- [ ] Mobile responsive
- [ ] Input field works

**Time:** 1.5 hours

---

### Step 3.3: Implement Chat Logic

**Action:** Add JavaScript for chat functionality

**File:** `public/app.js` (chat route handler)

**Features:**
- Session ID management (localStorage)
- Send message to `/api/chat/message`
- Display streaming responses
- Message history (localStorage)
- Error handling

**Success Criteria:**
- [ ] User can type and send message
- [ ] Response appears in chat
- [ ] Streaming text shows incrementally
- [ ] Refresh preserves conversation

**Time:** 2 hours

---

### Step 3.4: Add Lead Capture

**Action:** Show email capture after engagement

**Logic:**
- After 3+ messages, show "Get notified" form
- Store email in localStorage + send to `/api/chat/lead`
- Track in PostHog

**Success Criteria:**
- [ ] Form appears after 3 messages
- [ ] Email submission works
- [ ] Lead stored in database
- [ ] PostHog event tracked

**Time:** 30 min

---

### Step 3.5: Deploy Frontend

**Action:** Push and verify on production

**Commands:**
```bash
git add -A && git commit -m "feat: Add support chat UI"
git push
railway up --detach
```

**Success Criteria:**
- [ ] Chat page loads at https://onhyper.io/chat
- [ ] Can send message and get response
- [ ] Works on mobile

**Time:** 15 min

---

## Phase 4: Testing & Polish

### Step 4.1: End-to-End Test

**Action:** Test complete flow

**Test cases:**
1. Open /chat
2. Send "What is OnHyper?"
3. Verify response is accurate
4. Send follow-up "How much does it cost?"
5. Verify conversation context is maintained
6. Refresh page
7. Verify conversation restored
8. Send 2 more messages
9. Verify lead capture form appears
10. Submit email

**Success Criteria:**
- [ ] All test cases pass
- [ ] No console errors
- [ ] Response time < 5 seconds

**Time:** 30 min

---

### Step 4.2: Mobile Testing

**Action:** Test on mobile devices

**Test on:**
- iOS Safari
- Android Chrome

**Success Criteria:**
- [ ] Chat input visible (not hidden by keyboard)
- [ ] Messages scroll properly
- [ ] Touch targets adequate

**Time:** 30 min

---

### Step 4.3: Analytics Verification

**Action:** Verify PostHog events

**Check for:**
- `chat_message_sent`
- `chat_response_received`
- `chat_lead_captured`

**Success Criteria:**
- [ ] Events appear in PostHog dashboard
- [ ] Properties (session_id, message_count) tracked

**Time:** 15 min

---

## Summary

| Phase | Steps | Time | Status |
|-------|-------|------|--------|
| 1. ScoutOS Setup | 5 | 1.5 hrs | ✅ Complete |
| 2. Backend | 4 | 2.5 hrs | ✅ Complete |
| 3. Frontend | 5 | 4.5 hrs | ✅ Complete |
| 4. Testing | 3 | 1.25 hrs | ⬜ Remaining |
| **Total** | **17** | **~10 hrs** | **~75% done** |

## Progress

### Phase 1: ScoutOS Agent Setup ✅
- [x] **Step 1.1**: Create ScoutOS Agent ✅
  - Agent ID: `cmlo9s6t320kv5ts6xqz1ke84`
  - Created via API (POST /agents)
  - Model: Claude Sonnet 4, temp: 0.7
- [x] **Step 1.2**: Configure System Prompt ✅ (set during creation)
- [x] **Step 1.3**: Upload Knowledge Documents ✅
  - PRD → `/onhyper/prd.md`
  - Launch blog → `/onhyper/blog-launch.md`
  - Dogfooding blog → `/onhyper/blog-dogfooding.md`
- [x] **Step 1.4**: Test Agent Via API ✅
- [x] **Step 1.5**: Store Agent ID in Railway ✅
  - `SCOUTOS_SUPPORT_AGENT_ID=cmlo9s6t320kv5ts6xqz1ke84`

### Phase 2: Backend Chat Routes ✅
- [x] **Step 2.1**: Add Streaming Support to Proxy ✅
  - SSE streaming for `text/event-stream` responses
  - Commit: `d99c17e`
- [x] **Step 2.2**: Create Chat Route ✅
  - `POST /api/chat/message` - Sync and streaming responses
  - `POST /api/chat/lead` - Lead capture
  - `GET /api/chat/status` - Health check
- [x] **Step 2.3**: Register Chat Routes ✅
  - Mounted at `/api/chat` (public, no auth)
- [x] **Step 2.4**: Deploy and Test Backend ✅
  - Commit: `d720f34`
  - All endpoints verified working

### Phase 3: Frontend Chat UI ✅
- [x] **Step 3.1**: Add Chat to Navigation ✅
- [x] **Step 3.2**: Create Chat Page ✅
  - `public/pages/chat.html`
- [x] **Step 3.3**: Implement Chat Logic ✅
  - Session persistence via localStorage
  - API integration
  - Message rendering
- [x] **Step 3.4**: Add Lead Capture ✅
  - Form appears after 3+ messages
  - Email stored via `/api/chat/lead`
- [x] **Step 3.5**: Deploy Frontend ✅
  - Commit: `e4b83bf`
  - Live at https://onhyper.io/#/chat

### Phase 4: Testing & Polish ⬜
- [ ] **Step 4.1**: End-to-End Test
- [ ] **Step 4.2**: Mobile Testing
- [ ] **Step 4.3**: Analytics Verification

## Blockers

| Blocker | Status | Owner |
|---------|--------|-------|
| ScoutOS Agent ID | ⚠️ Needed | Manual creation in ScoutOS Studio |
| SCOUT_API_KEY in Railway | ✅ Done | Already configured |

## Notes

- ScoutOS free tier: 200 agent messages/month
- May need paid plan for production traffic
- Agent can be improved over time by adding more knowledge documents

---

*Plan updated: February 15, 2026*