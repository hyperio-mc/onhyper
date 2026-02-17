# OnHyper Dev Browser Extension Plan

## Overview

A browser extension that lets developers test OnHyper apps locally with their own API keys. No server required - the extension intercepts proxy calls and routes them to real APIs.

## Directory Structure

```
onhyper/
├── extension/           # NEW - clean subdirectory
│   ├── manifest.json     # Extension manifest (MV3)
│   ├── popup/            # Popup UI for key management
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── background/       # Service worker
│   │   └── service-worker.js
│   ├── content/          # Content scripts (if needed)
│   ├── lib/              # Shared utilities
│   │   ├── encryption.js  # Key encryption
│   │   ├── proxy-map.js   # URL rewriting logic
│   │   └── storage.js     # Chrome storage wrapper
│   ├── icons/            # Extension icons (16, 48, 128)
│   └── README.md         # User documentation
├── src/                  # Existing backend
├── public/               # Existing frontend
└── ...
```

## Phase 1: Core Extension Structure

### Step 1.1: Create Extension Directory
- Create `extension/` directory at project root
- Create `manifest.json` with Manifest V3 config
- Create minimal popup HTML
- Create placeholder icons

**Success Criteria:**
- `extension/` directory exists
- `manifest.json` valid JSON
- Extension can be loaded in Chrome (developer mode)
- Icon shows in toolbar

### Step 1.2: Popup UI
- Create popup HTML with key input form
- Add provider dropdown (OpenAI, Anthropic, etc.)
- Add key input field (password type)
- Add save/delete buttons
- Style with OnHyper branding

**Success Criteria:**
- Popup opens on toolbar click
- UI shows provider selector
- Key can be entered (hidden text)
- Save button exists but not yet functional

### Step 1.3: Chrome Storage & Encryption
- Implement `lib/storage.js` for Chrome storage API
- Implement `lib/encryption.js` with AES-GCM
- Keys stored encrypted with user password
- Keys retrievable and decryptable

**Success Criteria:**
- Can save encrypted key to storage
- Can retrieve and decrypt key
- Keys survive browser restart
- Keys are NOT readable in plaintext storage

### Step 1.4: Proxy Mapping Logic
- Create `lib/proxy-map.js`
- Map `/proxy/openai/*` → `api.openai.com/*`
- Map `/proxy/anthropic/*` → `api.anthropic.com/*`
- Map `/proxy/openrouter/*` → `openrouter.ai/api/v1/*`
- Handle URL rewriting correctly

**Success Criteria:**
- Unit tests for all mappings
- Correct header injection (provider-specific)
- Query params preserved

## Phase 2: Request Interception

### Step 2.1: Service Worker Setup
- Create `background/service-worker.js`
- Register declarativeNetRequest rules
- Handle localhost and file:// origins
- Enable extension only when user has keys

**Success Criteria:**
- Service worker starts on extension load
- Rules registered correctly
- Console logs show interception working

### Step 2.2: Fetch Interception
- Intercept fetch calls to `/proxy/*`
- Rewrite URLs to real API endpoints
- Inject API keys as headers
- Pass response back unchanged

**Success Criteria:**
- `fetch('/proxy/openai/v1/chat/completions')` works
- Request reaches OpenAI with correct key
- Response returns to app unchanged
- Error handling works (bad key, network error)

### Step 2.3: Header Injection
- OpenAI: `Authorization: Bearer ${key}`
- Anthropic: `x-api-key: ${key}` + `anthropic-version`
- OpenRouter: `Authorization: Bearer ${key}`
- Ollama: No auth needed (local)

**Success Criteria:**
- Each provider gets correct headers
- Headers not visible to page code
- Headers survive redirects

## Phase 3: User Experience

### Step 3.1: Key Management
- Add multiple API keys (one per provider)
- Delete individual keys
- Validate keys format before saving
- Show which keys are configured

**Success Criteria:**
- Can add OpenAI key
- Can add Anthropic key
- Can delete specific key
- UI shows configured providers

### Step 3.2: Status Indicators
- Green icon: Keys configured, working
- Yellow icon: Keys configured, not tested
- Red icon: API error (invalid key?)
- Gray icon: No keys configured

**Success Criteria:**
- Icon changes based on state
- Tooltip shows current status
- Last API call status visible

### Step 3.3: Error Handling
- Catch 401/403 errors (bad key)
- Show user-friendly error messages
- Log errors for debugging
- Suggest fixes (wrong key, expired key)

**Success Criteria:**
- Bad key shows "Invalid API key" message
- Network errors handled gracefully
- User can see error in popup

## Phase 4: Documentation & Testing

### Step 4.1: README Documentation
- How to install (developer mode)
- How to add API keys
- How to test locally
- Troubleshooting guide
- Security notes

**Success Criteria:**
- README exists and is clear
- Step-by-step installation guide
- Example local app code
- FAQ section

### Step 4.2: Test Page
- Create `extension/test-page.html`
- Test all proxy endpoints
- Show success/failure for each
- Easy debugging for users

**Success Criteria:**
- Test page exists
- Can test OpenAI from test page
- Can test Anthropic from test page
- Results clearly shown

### Step 4.3: Extension Icons
- Create 16x16 icon
- Create 48x48 icon
- Create 128x128 icon
- Use OnHyper branding (⚡ logo)

**Success Criteria:**
- Icons exist at all sizes
- Icons visible in Chrome
- Icons match OnHyper brand

## Phase 5: Store Readiness (Future)

### Step 5.1: Chrome Web Store
- Create store listing
- Screenshots and promo images
- Privacy policy
- Submit for review

### Step 5.2: Firefox Add-ons
- Create Firefox manifest (may need MV2)
- Submit to Mozilla
- Handle browser differences

---

## Technical Notes

### Security Considerations
- Keys encrypted with AES-GCM using user passphrase
- Keys never stored in plaintext
- Extension only intercepts localhost/file://
- No telemetry or external calls
- Open source - fully auditable

### Browser Compatibility
- Target: Chrome/Chromium (MV3)
- Firefox: May need MV2 version
- Safari: Not planned initially
- Edge: Works via Chrome store

### Manifest V3 Constraints
- Use declarativeNetRequest (not webRequest)
- Service worker (not background page)
- No remote code execution
- Limited async in service worker