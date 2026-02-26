# LinkedIn Post: Dogfooding Atoms + OnHyper

The most validating thing a platform can do? Work for its own creators.

Not in the "we use our own product internally" sense — I mean the platform solves a real problem its builders actually had, right now.

Last week, OnHyper did exactly that. And something delightfully meta happened.

We needed a support chat for OnHyper. The options:
- Intercom: $39/mo minimum
- Chatbase: $40-150/mo with unpredictable credits
- Custom build: 2-3 days of dev work

Then we looked at what we'd already built.

OnHyper proxies API calls for frontend apps. ScoutOS Atoms is an AI agent platform with RAG. And we'd already built the `POST /proxy/scoutos` endpoint for OTHER people to use.

Wait a second.

We could use OnHyper to proxy ScoutOS to power OnHyper's own support chat. OnHyper would proxy itself.

So we did:
1. Uploaded OnHyper docs to ScoutOS
2. Built a Svelte chat widget
3. Wired it to call through our own proxy

3 days. ~$50/mo in API costs. And a support chat that answers questions about OnHyper... powered by OnHyper... running on OnHyper.

OnHyper proxies itself to explain itself. 🐢

This is where things get interesting for AI agents: the copilot that helps you code today could SHIP that code tomorrow. The gap between "AI built this" and "anyone can use this" just got smaller.

Try the chat at onhyper.io

#aiagents #dogfooding #buildinpublic