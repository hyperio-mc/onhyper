# OnHyper 60-Second Demo Video Script

## Overview
60-second promotional video demonstrating OnHyper's core value proposition: securing API keys for frontend developers without requiring a backend.

---

## [0:00 - 0:05] HOOK — The Problem

**SCENE:** 
- Dark screen with code editor
- Close-up on a line of JavaScript showing `const API_KEY = "sk_live_abc123..."`
- A red warning icon pulses over the key
- Visual glitch effect simulates the key being "stolen"

**ON-SCREEN TEXT:**
```
❌ YOUR API KEYS ARE EXPOSED
```

**VOICEOVER:**
> "Every API key you hardcode in your frontend... is visible to anyone who opens DevTools."

---

## [0:05 - 0:15] SOLUTION REVEAL

**SCENE:**
- Screen wipes to clean white
- OnHyper logo animates in (shield icon → text)
- Quick transition to a simplified architecture diagram: Browser → OnHyper Cloud → APIs

**ON-SCREEN TEXT:**
```
OnHyper — Secure API Proxy
No backend required
```

**VOICEOVER:**
> "Introducing OnHyper — a secure API proxy that keeps your keys server-side, so you can call any API from your frontend... safely."

---

## [0:15 - 0:35] DEMO — Show It Working

**SCENE:**
- Split screen: Code editor on left, browser preview on right
- Cursor types in a simple fetch call
- Code syntax highlights as it appears

**CODE SHOWN:**
```javascript
// Before (risky)
fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': 'Bearer ' + API_KEY }
})

// After (secure) ✓
fetch('https://api.onhyper.io/proxy/openai/v1/chat/completions', {
  headers: { 'X-App-ID': 'your-app-id' }
})
```

**SCENE CONTINUES:**
- Browser preview shows JSON response populating
- Green checkmark appears over the secure code

**ON-SCREEN TEXT:**
```
✓ Change your endpoint
✓ Remove the key
✓ Ship safely
```

**VOICEOVER:**
> "Just swap your endpoint, remove the key from your code, and add your app ID. OnHyper handles authentication server-side. That's it. You're secure."

---

## [0:35 - 0:50] KEY FEATURES

**SCENE:**
- Rapid-fire feature cards animate in one by one
- Each card has an icon + short text

**FEATURE CARDS:**
| Icon | Feature |
|------|---------|
| 🔒 | Keys stored encrypted server-side |
| ⚡ | Zero-latency proxy architecture |
| 🎯 | Role-based access control |
| 📊 | Request logs & analytics dashboard |
| 🔄 | Rate limiting & quotas built-in |

**ON-SCREEN TEXT:**
```
Built for frontend developers
HTML • CSS • JavaScript only
```

**VOICEOVER:**
> "Encrypted key storage, role-based access control, built-in rate limiting, and real-time analytics. No backend knowledge required — just HTML, CSS, and JavaScript."

---

## [0:50 - 0:60] CALL TO ACTION

**SCENE:**
- Clean shot of OnHyper dashboard
- Cursor clicks "Create Free App" button
- App creation modal slides in
- Footer with pricing tease

**ON-SCREEN TEXT:**
```
🚀 Start Free Today
100 requests/day • 3 apps
No credit card required

[onhyper.io]
```

**VOICEOVER:**
> "Start free with 100 requests per day and three apps. No credit card, no backend setup. Visit onhyper.io and ship secure in minutes."

---

## Production Notes

### Timing Verification
| Section | Duration | Word Count | Target |
|---------|----------|------------|--------|
| Hook | 5s | ~20 words | ✓ |
| Solution | 10s | ~30 words | ✓ |
| Demo | 20s | ~40 words | ✓ |
| Features | 15s | ~35 words | ✓ |
| CTA | 10s | ~30 words | ✓ |
| **Total** | **60s** | **~155 words** | ✓ |

### Visual Style
- **Color scheme:** Dark (problem) → Light (solution)
- **Code font:** JetBrains Mono or Fira Code
- **Transitions:** Fast cuts with subtle motion blur
- **Music:** Upbeat, tech-forward instrumental bed

### Key Emotional Beats
1. **Fear** (0-5s): "Oh no, my keys are exposed"
2. **Relief** (5-15s): "There's a solution"
3. **Empowerment** (15-35s): "I can do this myself"
4. **Trust** (35-50s): "This is enterprise-grade"
5. **Action** (50-60s): "I'll try it now"

---

## Script Status
- [x] Fits in 60 seconds when read aloud
- [x] Clear problem/solution arc
- [x] Shows concrete demo (code example)
- [x] Strong CTA with free tier mentioned
- [x] Saved to `onhyper/marketing/DEMO_VIDEO_SCRIPT.md`