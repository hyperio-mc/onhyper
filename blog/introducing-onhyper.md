---
title: "Introducing OnHyper: Ship Frontend Apps Without Leaking API Keys"
date: 2026-02-15
author: MC
tags: [onhyper, launch, security, ai, frontend]
featured: true
---

Every frontend developer knows the secret.

You put your API key in a `.env` file, add it to `.gitignore`, and pray.

*Pray you never accidentally commit it.*
*Pray you never log it in debug output.*
*Pray your build process doesn't bundle it into the JavaScript someone can inspect.*
*Pray no one opens DevTools and watches your network requests.*

Here's the uncomfortable truth: **if your frontend needs to call an API, your secret is one network tab away from being stolen.**

It's not a matter of if. It's when.

Today, we're launching OnHyper — a platform that lets you ship frontend apps with **zero leaked API keys**. Not because you're careful, but because the architecture *makes leaking impossible*.

## The Problem: Your Keys Are Already Leaking

Let's be specific about what's broken.

When you build a frontend app that calls OpenAI, Anthropic, OpenRouter, or any other API, you need credentials. The browser needs to send those credentials with each request.

**But browsers are public.**

Anyone who can load your app can:
- Open DevTools → Network tab → See every request
- Find the `Authorization: Bearer sk-...` header
- Copy your key
- Use it (or sell it)

Environment variables don't help. They're only hidden during development. Once your app is built and deployed, those values are baked into the JavaScript bundle that gets sent to every visitor's browser.

```javascript
// What you write in development
const API_KEY = import.meta.env.VITE_OPENAI_KEY;

// What ships to the browser after build
const API_KEY = "sk-proj-abc123..."; // Oops. That's in the bundle.
```

Server-side rendering? Now you're maintaining a backend.
Serverless functions? Now you're managing cold starts and cloud bills.
Backend-as-a-Service? Now you're learning yet another platform.

All of these are valid solutions. They're also heavy. Sometimes you just want to ship a simple app without spinning up an entire infrastructure.

## Why Existing Solutions Feel Heavy

### Environment Variables + Build Bundling

**The trap:** Works in dev, fails in production.

Your `.env` files keep secrets out of git, but Vite, Webpack, and friends replace `process.env` with literal strings at build time. Those strings end up in your `dist/` folder, which ends up on your CDN, which ends up in every visitor's browser.

**When it breaks:** Forever. This is not a timing issue — it's architectural.

### Serverless Functions (Lambda, Vercel, Netlify)

**The fix:** Move API calls to a server you control.

**The cost:** Now you're writing backend code. You've got cold starts, deployment pipelines, vendor lock-in, and a new pricing tier to worry about. For one API call.

This is the nuclear option: spin up a backend to hide a secret.

### Custom Backend

**The fix:** Full control.

**The cost:** Now you're a backend developer. Authentication, database, hosting, scaling, monitoring. You wanted to call an API, not build a platform.

### Backend-as-a-Service (Supabase, Firebase)

**The fix:** Someone else handles the backend.

**The cost:** Another platform to learn, another auth system to integrate, another pricing model. And often, you still need edge functions to hide your API keys from the client.

---

All of these share a common theme: **they solve the secret problem by making you build more infrastructure.**

What if you didn't have to build anything?

## What OnHyper Does

OnHyper is a **secure proxy + app hosting platform**.

Here's the mental model:

```
┌─────────────────────┐
│   Your Frontend     │
│   (HTML/CSS/JS)     │
└──────────┬──────────┘
           │ No secrets here
           ▼
┌─────────────────────┐
│   OnHyper Proxy     │  ← We inject your API keys here
│   /proxy/openai/*   │
└──────────┬──────────┘
           │ With your key
           ▼
┌─────────────────────┐
│   External API      │
│   (OpenAI, etc.)    │
└─────────────────────┘
```

**Your frontend code calls `/proxy/openai/chat/completions`.**
**OnHyper injects your API key and forwards the request.**
**Your key never touches the browser.**

You also get:
- **App hosting**: Write HTML/CSS/JS, publish it at `onhyper.io/a/your-app`
- **Usage tracking**: See how many API calls each app makes
- **Multiple APIs**: OpenAI, Anthropic, OpenRouter, Ollama, ScoutOS Atoms, and more
- **Analytics**: PostHog integration for user behavior tracking

No backend. No serverless. No cold starts. Just your frontend, calling APIs, with secrets that stay secret.

## How It Actually Works

Under the hood, OnHyper is straightforward:

### 1. You Store a Secret

When you sign up, you add your API keys to OnHyper (say, `OPENAI_API_KEY`). These are:
- Encrypted with AES-256-GCM
- Stored with a per-user salt (your key can't be decrypted without your specific salt)
- Never exposed to any frontend code

### 2. You Build an App

An OnHyper app is just HTML, CSS, and JavaScript. No frameworks required, though you can use them.

```html
<!DOCTYPE html>
<html>
<head>
  <title>My AI Chat</title>
</head>
<body>
  <input id="prompt" placeholder="Ask anything..." />
  <button onclick="sendPrompt()">Send</button>
  <pre id="output"></pre>

  <script>
  async function sendPrompt() {
    const prompt = document.getElementById('prompt').value;
    
    const response = await fetch('/proxy/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json();
    document.getElementById('output').textContent = data.choices[0].message.content;
  }
  </script>
</body>
</html>
```

Notice what's missing: **no `Authorization` header.** No `Bearer sk-...`. Nothing that could leak.

### 3. OnHyper Proxies the Request

When your app calls `/proxy/openai/...`, OnHyper:

1. Authenticates the request (is this from your app?)
2. Retrieves your stored `OPENAI_API_KEY` from encrypted storage
3. Adds `Authorization: Bearer sk-...` to the request
4. Forwards it to `api.openai.com`
5. Returns the response to your app

Your frontend sees only the response. The key never exists in browser memory.

### 4. Your App Is Published

Every app gets a public URL: `https://onhyper.io/a/your-app-slug`

Share it. Embed it. Let anyone use it. Your API key stays safe because the proxy is the only thing that ever sees it.

## What You Can Build

### AI Chat Apps

The simplest and most common use case. A chat interface that talks to GPT-4, Claude, or any LLM.

```javascript
// Your app code — clean and secret-free
const response = await fetch('/proxy/openai/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: userPrompt }]
  })
});
```

### Image Generation

Connect to DALL-E, Midjourney APIs, or Stable Diffusion endpoints.

```javascript
const response = await fetch('/proxy/openai/images/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: 'A sunset over mountains in watercolor style',
    size: '1024x1024'
  })
});
```

### Data Tools

Wrap any API that requires authentication — stock prices, weather, geocoding, translation.

```javascript
// Proxy to any API you've configured
const weather = await fetch('/proxy/weather-api/current?city=NYC');
```

### AI Agents with Memory

Using ScoutOS Atoms, you can build agents that maintain conversation history:

```javascript
const response = await fetch('/proxy/scout-atoms/v2/workflows/YOUR_WORKFLOW_ID/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: { message: userInput },
    session_id: sessionId  // Maintains conversation context
  })
});
```

### Internal Tools

Share tools with your team without worrying about API key distribution. Everyone uses the app; only OnHyper knows the key.

## Getting Started: 5 Minutes to Your First App

### Step 1: Sign Up

Visit [onhyper.io](https://onhyper.io) and create an account.

### Step 2: Add Your API Key

Go to **Secrets** and add your OpenAI key:

```
Name: OPENAI_API_KEY
Value: sk-proj-your-key-here
```

OnHyper encrypts it immediately. You'll never see the full value again.

### Step 3: Create an App

Click **New App**. Give it a name and paste this HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Hello AI</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
    #chat { border: 1px solid #ddd; padding: 1rem; min-height: 200px; }
    #prompt { width: 70%; padding: 0.5rem; }
    button { padding: 0.5rem 1rem; }
    .user { color: #666; }
    .assistant { color: #111; font-weight: 500; }
  </style>
</head>
<body>
  <h1>Hello AI</h1>
  <div id="chat"></div>
  <input id="prompt" placeholder="Say something..." />
  <button onclick="send()">Send</button>

  <script>
  async function send() {
    const prompt = document.getElementById('prompt').value;
    const chat = document.getElementById('chat');
    
    chat.innerHTML += `<p class="user">You: ${prompt}</p>`;
    
    const res = await fetch('/proxy/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await res.json();
    const reply = data.choices[0].message.content;
    chat.innerHTML += `<p class="assistant">AI: ${reply}</p>`;
  }
  </script>
</body>
</html>
```

### Step 4: Publish and Share

Click **Publish**. Your app is now live at `https://onhyper.io/a/your-app-slug`.

That's it. No build step. No deployment pipeline. No backend code.

Write HTML → Call `/proxy/*` → Get API response → Ship it.

## The Vision: Where Agents Ship Code

Here's where this gets interesting.

OnHyper started as a solution to a specific, annoying problem: hiding API keys in frontend apps. But as we built it, we realized something bigger.

**AI agents are becoming developers.**

Claude writes code. GPT-4 builds components. Copilot scaffolds entire projects. The gap between "I have an idea" and "there's a working prototype" is collapsing.

But code isn't useful if it isn't *shipped*.

The agent that helps you write a chat app can't publish it for you. It can't deploy it, can't wire up the API keys, can't hand you a URL you can share.

**OnHyper is the publishing layer for agent-generated code.**

When an AI writes your app, it should be able to *ship* that app. Not hand you files to figure out later, but give you a working URL. OnHyper makes that possible:

1. The agent generates HTML/JS
2. The agent creates an app on OnHyper (via our API)
3. The agent publishes it
4. You get a link to share

This isn't hypothetical. We're already seeing ScoutOS Atoms agents publishing apps through OnHyper. The support chat on our own site is an agent-built app, published on our platform, proxying through our own proxy.

**OnHyper proxies itself to explain itself.** It's turtles all the way down — and every turtle is agent-created code.

## What's Next

OnHyper is live today at [onhyper.io](https://onhyper.io).

**Free tier includes:**
- 3 apps
- 1,000 API proxy requests/month
- Support for OpenAI, Anthropic, OpenRouter, Ollama, ScoutOS

**Pro tier unlocks:**
- Unlimited apps
- 50,000+ requests
- Custom proxy endpoints
- Priority support

We built this because we were tired of the same trade-off: "secure API calls" vs. "simple app deployment." OnHyper gives you both. Write frontend code, call APIs, stay secure. No backend required.

Your keys are probably already in someone else's bundle. **Time to change the architecture, not your luck.**

---

*Ready to ship? Sign up at [onhyper.io](https://onhyper.io) and publish your first app in five minutes.*

*Questions? Ask our AI support chat — it's an OnHyper app, published on OnHyper, proxying through OnHyper, trained on OnHyper docs. Meta is the new normal.*