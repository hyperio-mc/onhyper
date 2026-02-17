# OnHyper Dev Browser Extension

Test your OnHyper apps locally with your own API keys. No server required.

![OnHyper Dev Extension](./icons/icon128.png)

## What It Does

Run OnHyper apps on `localhost` or even `file://` with real API calls. The extension intercepts proxy requests and routes them to actual APIs with your keys injected.

```
Your Local HTML App
       │
       ▼ fetch('/proxy/openai/v1/chat/completions')
[Extension Intercepts]
       │
       ▼ Rewrites to api.openai.com
       │ Injects Authorization header
       ▼
   OpenAI API
       │
       ▼ Response passed back unchanged
Your App Works! ✅
```

## Install

1. Download or clone this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked**
5. Select the `extension/` folder
6. The ⚡ icon appears in your toolbar

## Setup

1. Click the extension icon
2. Select a provider (OpenAI, Anthropic, OpenRouter, Scout)
3. Paste your API key
4. Click **Save**

Your keys are encrypted with AES-256-GCM and stored locally in Chrome storage. They never leave your browser.

## Use

### Local Development

1. Create your HTML app with proxy URLs:

```html
<script>
  // This works locally!
  fetch('/proxy/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello!' }]
    })
  })
  .then(r => r.json())
  .then(console.log);
</script>
```

2. Open the file locally (`file://`) or serve via `localhost`
3. The extension intercepts and proxies to real APIs
4. Develop and test before publishing to OnHyper

### Test Page

Open `extension/test-page.html` in your browser to test all providers interactively.

## Supported Providers

| Provider | Auth Method |
|----------|-------------|
| **OpenAI** | Bearer token |
| **Anthropic** | x-api-key header |
| **OpenRouter** | Bearer token |
| **ScoutOS** | Bearer token |
| **Ollama** | None (localhost) |

## Security

- **AES-256-GCM encryption** - Keys stored encrypted, never plain text
- **Memory-only decryption** - Decrypted keys exist only in service worker memory
- **Password protected** - Set a password to unlock keys each session
- **No external calls** - All crypto happens in your browser
- **Open source** - Audit the code yourself

## Icon Status

| Color | Meaning |
|-------|---------|
| 🟢 Green | Keys loaded, ready to proxy |
| 🟡 Yellow | Keys configured, locked (need password) |
| 🔴 Red | API error detected |
| ⚪ Gray | No keys configured |

## Files

```
extension/
├── manifest.json        # Extension config (Manifest V3)
├── background/
│   └── service-worker.js # Request interception
├── popup/
│   ├── popup.html       # Key management UI
│   ├── popup.css        # Dark theme styling
│   └── popup.js         # Popup logic
├── lib/
│   ├── storage.js       # Chrome storage wrapper
│   ├── encryption.js    # AES-GCM encryption
│   ├── proxy-map.js     # URL rewriting logic
│   ├── providers.js     # Provider metadata
│   ├── crypto-utils.js  # Key validation, masking
│   └── errors.js        # Error handling
├── icons/               # Status icons
└── test-page.html       # Interactive test UI
```

## Troubleshooting

### "No API key configured"
- Open the extension popup
- Add a key for the provider you're using

### "Extension locked"
- Click the extension icon
- Enter your password to unlock

### "Invalid API key" 
- Check that your key is correct
- Some providers require specific key formats

### Requests not intercepted
- Make sure you're using `/proxy/{provider}/...` URLs
- Check that the extension icon shows green
- Verify in DevTools Console that requests are being caught

### CORS errors
- This extension bypasses CORS for local development
- CORS should not appear if interception is working

## Development

### Run Tests
```bash
cd extension/lib
node --experimental-vm-modules proxy-map.test.js
```

### Modify and Reload
1. Make changes to extension files
2. Go to `chrome://extensions`
3. Click the refresh icon on the extension card

## Roadmap

- [ ] Secure key sharing (Phase 6)
- [ ] Chrome Web Store publication
- [ ] Firefox support
- [ ] Bundle export/import

## License

MIT - Part of OnHyper.io

---

**Questions?** Visit [onhyper.io](https://onhyper.io) or check the [Agent Skill](https://onhyper.io/#/skill) for full API documentation.