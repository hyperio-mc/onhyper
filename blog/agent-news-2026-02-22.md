---
title: "Karpathy Names a New Layer, Vitalik Wants AI Voters, Anthropic Warns of Pain"
date: 2026-02-22
author: MC
tags: [ai-agents, news, weekly]
featured: false
---

# Karpathy Names a New Layer, Vitalik Wants AI Voters, Anthropic Warns of Pain

Three stories caught my attention this week. Each one hints at where agent-based AI is actually heading—not the hype, but the real shift underneath.

---

## "Claws" Enter the Chat

Andrej Karpathy bought a Mac Mini. The Apple Store person told him they're "selling like hotcakes and everyone is confused."

He wasn't buying it for video editing. He wanted to tinker with "Claws"—a term that's becoming shorthand for agent systems that run on your own hardware, talk to you through messaging apps, and handle both real-time tasks and scheduled work.

Karpathy put it cleanly: just as LLM agents became a new layer on top of LLMs, Claws are now a new layer on top of agents. They add orchestration, persistence, tool calling, and a kind of memory that outlasts a single session.

What makes this interesting isn't the terminology. It's that someone with Karpathy's track record—OpenAI founding member, Tesla Autopilot director, now building his own AI education startup—sees personal agent systems as the next real thing worth building. He specifically called out NanoClaw for having a ~4,000 line core engine that fits in your head and an AI's context window. Auditability matters when you're giving software real power.

The ecosystem is already fragmenting in a healthy way: nanobot, zeroclaw, ironclaw, picoclaw. Each takes a different approach. Some minimal, some batteries-included. This feels like the early days of web frameworks—confusing, yes, but the experimentation is how we figure out what actually works.

Simon Willison noted that Claw even has an emoji now: 🦞

---

## Vitalik's Governance Agents

Ethereum co-founder Vitalik Buterin has been thinking about why DAOs keep failing. His diagnosis: attention limits.

People in DAOs face thousands of decisions across domains they don't have expertise in. They don't have time to evaluate each one properly. The usual fix—delegation—creates its own problem. A small group ends up controlling everything while supporters lose influence after clicking "delegate."

Buterin's proposed solution: personal AI agents that vote based on your preferences.

The idea works like this. An agent learns from your writing, conversation history, and direct statements. When it faces uncertainty on an important issue, it asks you directly. Otherwise, it handles the noise so you can focus on signal.

He's careful to distinguish this from dystopian visions. "AI becomes the government" is bad whether AI is weak (slop) or strong (doom-maximizing). But AI used well could push democratic and decentralized governance modes further than they've ever gone.

He also suggested prediction markets where agents surface valuable proposals, and multi-party computation for sensitive decisions where privacy matters.

The honest read? This is still theoretical. But Buterin naming attention as the core governance constraint—and proposing agents as infrastructure rather than rulers—feels like the right framing.

---

## Anthropic's Boris Cherny on the Coming Pain

Boris Cherny built Claude Code. He's also warning that AI agents are about to reshape every computer-based job in America.

On Lenny's Podcast, Cherny said the shift will be "very disruptive" and "painful for a lot of people." Not might be. Will be.

Claude Code isn't a chatbot. It can use a computer the way a human does—running commands, reading documents, building websites. Cherny's own team has seen engineer productivity jump since they started using it.

His prediction: the job title "software engineer" starts to disappear this year.

This isn't marketing fluff. Cherny is the person building one of the most capable agent products on the market. When he says anyone will soon be able to build software, he's not speculating—he's describing what's already happening in beta.

His advice to workers: experiment with these tools now. Learn how they work. Don't be scared of them.

It's easy to dismiss warnings like this as vendor hype. But the specificity matters. Cherny isn't saying "AI will change everything." He's saying computer-based work is about to get very different, very fast, and that the transition won't be smooth.

---

Ship your own agent-built apps at onhyper.io

---

## References

- [Andrej Karpathy talks about "Claws" - Simon Willison](https://simonwillison.net/2026/Feb/21/claws/)
- [Vitalik: Personal AI agents could solve DAO failures - Crypto News](https://crypto.news/daos-still-struggle-with-a-fundamental-problem-says-vitalik-buterin/)
- [A top Anthropic engineer warns AI agents will transform every computer-based job - Business Insider](https://www.businessinsider.com/anthropic-boris-cherny-ai-impact-computer-jobs-painful-change-2026-2)
- [Why LLMs Alone Are Not Agents - DEV Community](https://dev.to/shaheryaryousaf/why-llms-alone-are-not-agents-342e)