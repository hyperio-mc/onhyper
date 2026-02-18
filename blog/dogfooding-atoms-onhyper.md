---
title: "How OnHyper Proxies Itself: A Meta Story"
date: 2026-02-15
author: MC
tags: [onhyper, scoutos, dogfooding, ai]
---

What's the most validating thing a platform can do?

Work for its own creators.

Not in the "we use our own product internally" sense — though that matters. I mean: *the platform solves a real problem its builders actually had, right now, and does it well enough that they'd choose it even if they weren't the ones who built it.*

Last week, OnHyper did that. And in the process, something delightfully meta happened.

## The Challenge

We needed a support chat for OnHyper.

You know the drill: someone lands on your site, they have questions, you want to help them. A chat widget. Pretty standard stuff.

We had options:

1. **Intercom** — $39/mo minimum, overkill for a pre-launch product
2. **Chatbase** — $40-150/mo, credit-based pricing that's hard to predict
3. **Crisp** — $45-95/mo, solid but yet another subscription
4. **Custom build** — Free... but 2-3 days of dev work

But then we looked at what we'd already built.

## The Stack

OnHyper is a secure proxy platform. You store API keys server-side, and your frontend apps call APIs through us — we inject your secrets safely. No keys in browser code, no backend required.

ScoutOS Atoms is... well, it's an AI agent platform with RAG (retrieval-augmented generation) and conversation sessions built in. Upload your docs, create a workflow, get an AI that knows your product.

Here's the thing: **OnHyper already proxies ScoutOS Atoms.**

The `POST /proxy/scoutos` endpoint was already there in our proxy configuration. We'd built it for *other people* to use ScoutOS through OnHyper.

Wait a second.

## The Build

The realization hit: we could use OnHyper to proxy ScoutOS to power *OnHyper's own support chat*.

OnHyper would proxy itself.

```
┌─────────────────────┐
│   Chat Widget       │  (Svelte component we built)
│   (OnHyper docs)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   OnHyper Backend   │  (our own proxy server)
│   /api/chat route   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   /proxy/scoutos   │  (OnHyper proxying... OnHyper's backend dependency)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   ScoutOS Atoms     │  (the AI brain with RAG)
│   knows our docs    │
└─────────────────────┘
```

So we did it.

### What We Built

**Day 1:** We uploaded OnHyper's documentation to ScoutOS — product overview, pricing, technical specs, FAQ. ScoutOS handled the vector embeddings automatically (no RAG pipeline to build ourselves).

Then we created a simple workflow:
- Input: user message
- Query: search knowledge base  
- LLM: generate response with context
- Output: response text

**Day 2:** We built a Svelte chat widget component. Floating bubble, expandable window, message bubbles, typing indicator — standard stuff. Hooked it up to our `/api/chat` endpoint.

**Day 3:** We wired the backend route to call `/proxy/scoutos/v2/workflows/{id}/execute`. Because remember: OnHyper already proxies ScoutOS.

**Total time: ~3 days to a working AI support chat.**

### The Meta Moment

Here's where it gets recursive:

- OnHyper's chat widget is a published app on... **OnHyper**
- The chat calls ScoutOS through... **OnHyper's proxy**  
- ScoutOS knows about OnHyper because we fed it... **OnHyper docs**
- Users ask about OnHyper, and the AI explains... **OnHyper**

OnHyper proxies itself to explain itself.

## What Surprised Us

### 1. It actually worked faster than alternatives

We considered Chatbase and others, but setting up a ScoutOS workflow was genuinely quicker. The knowledge upload was drag-and-drop, the workflow builder was visual, and we already had the proxy endpoint ready.

### 2. Session management came for free

ScoutOS handles conversation history automatically when you pass a `session_id`. We didn't have to build our own chat state management — just pass the session ID back and forth.

### 3. The "dogfood" was actually nutritious

This wasn't a forced "we should use our own product" exercise. We legitimately saved time and money by using OnHyper + ScoutOS together. The proxy was already there. We just... used it.

### 4. Recursive architecture is weirdly satisfying

When you ask the chat "How does OnHyper work?", the AI explains OnHyper — powered by OnHyper's own proxy — running on OnHyper's infrastructure — answering questions about OnHyper.

It's turtles all the way down, and every turtle is your own code.

## Why This Matters

This isn't just about us shipping a chat widget.

**Think about what we just proved:**

1. **OnHyper works for real use cases.** We didn't demo it with a toy example. We used it for our actual production support chat.

2. **Agents can ship their own apps.** An AI agent (ScoutOS Atoms) is now powering a live app published on our platform. The "agent as developer" future isn't hypothetical — it's running right now.

3. **The stack composes.** Two products from different creators (OnHyper and ScoutOS) plugged together seamlessly because they were designed to be composable. No custom integration work, just API calls.

Imagine what happens when YOUR agent can publish YOUR apps. The copilot that helps you code today could ship that code tomorrow. The gap between "AI built this" and "anyone can use this" just got a whole lot smaller.

## Try It Yourself

1. **[OnHyper](https://onhyper.io)** — Publish apps that call APIs securely
2. **[ScoutOS](https://scoutos.com)** — Build AI workflows and agents (it's made by our friend Tom Wilson)

Both are designed to work together. We didn't plan that — it's just what happens when you build tools that follow the same principles: API-first, composable, agent-friendly.

## The Bottom Line

We needed a support chat. We had OnHyper. We had a ScoutOS proxy. We put them together.

The whole thing took three days and costs us about $50/month in API usage instead of $100+ for a third-party chat tool.

But the real value? We proved the vision works. AI agents can publish apps. Platforms can eat their own dogfood. And sometimes, your infrastructure is recursive enough to explain *itself*.

---

*Want to see the chat in action? It's floating in the bottom-right corner of [onhyper.io](https://onhyper.io). Ask it how OnHyper works. Watch it explain itself to you.*

*Then ask yourself: what could your agent ship?*