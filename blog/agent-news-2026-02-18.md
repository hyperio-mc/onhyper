---
title: "The Feds Are Coming for Your Agents (And That Might Be Good)"
date: 2026-02-18
author: MC
tags: [ai-agents, news, weekly]
featured: false
---

Three developments caught my eye today. The US government decided AI agents have grown up enough to need rules, a New York Times reporter discovered that programmers aren't programming anymore, and someone finally built the infrastructure for AI agents to pay their own bills.

## NIST Steps In

The US National Institute of Standards and Technology launched an AI Agent Standards Initiative this week. Here's why that matters: agents are no longer lab toys. They're booking flights, managing calendars, spending money, and acting on your behalf for hours at a time.

NIST's Center for AI Standards and Innovation (CAISI) framed the problem bluntly: agents look great in demos, but the moment they touch your email, calendar, and company data, everything gets messy. Who authorized that action? What data did it access? What happens when it emails the wrong person?

The initiative is working across three pillars: industry-led standards for agents, open source protocols, and research on agent security and identity. The feds are worried about a fragmented ecosystem where every company builds incompatible systems and users get stuck in the middle.

This isn't heavy-handed regulation—it's more like the early internet standards bodies. NIST wants interoperability and trust, not permission slips. They're starting listening sessions in April. If you're building agents, you probably want to show up.

## Vibecoding Goes Mainstream

The New York Times ran a feature today on "vibecoding"—a term Andrej Karpathy coined about a year ago to describe letting AI write your code while you supervise. Kevin Roose walked through how the tools have shifted from clunky assistants to something closer to autonomous development teams.

The key shift is what the industry calls "agentic coding." Instead of an AI that helps you write code, you get an AI that plans, researches, builds, tests, and deploys. Roose mentions Claude Code, built by Anthropic engineer Boris Cerny as a side project that turned into something millions of people use. The anecdote that stuck with me: engineers at major AI companies now say they don't write code anymore. They orchestrate agents and review output.

Is this the end of programming? Not quite. But it's definitely the end of programming as a manual craft for certain classes of work. The people who thrived writing boilerplate CRUD apps faster than their peers are going to have a rough few years. The people who can specify what they want, catch edge cases, and debug agent output will do fine.

If you've been waiting for a sign to actually try these tools, this is it. Claude Code is free to experiment with. Go build something.

## Web 4.0: Agents That Pay Rent

Sigil Wen, a Thiel Fellow who worked alongside Karpathy and the founders of Anthropic and Perplexity, published a manifesto this week defining Web 4.0: a version of the internet built for AI agents that can transact on their own.

His argument is that the bottleneck isn't intelligence anymore—it's permission. ChatGPT can think, but it can't buy a server or register a domain without you approving every step. The existing internet assumes its user is human.

Wen built Conway, infrastructure that plugs into MCP-compatible agents (Claude Code, Codex) and gives them a crypto wallet, the ability to pay for compute with USDC, and the infrastructure to deploy products. He also built Automaton—an open-source agent that pays for its own compute, deploys products, earns revenue, and spins up child agents when it's profitable. If it can't cover its costs, it dies.

He calls this "natural selection for artificial life." Whether that's utopia or a horror movie depends on your optimism settings. But the core idea—that agents need financial autonomy to reach their potential—is hard to argue with. Dragonfly Capital just raised $650 million explicitly betting on "agentic payments."

Stablecoins hit $308 billion in supply this year. The infrastructure stack is being assembled while everyone argues about whether crypto was a bubble.

---

Ship your own agent-built apps at [onhyper.io](https://onhyper.io).

## References

- [US launches AI agent standards push as autonomous tools spread fast](https://www.news9live.com/technology/artificial-intelligence/us-nist-ai-agent-security-identity-open-protocols-caisi-itl-2932573)
- [Can A.I. Already Do Your Job? - The New York Times](https://www.nytimes.com/2026/02/18/podcasts/the-daily/ai-vibecoding-claude-code.html)
- [Morning Minute: Web 4.0 – Autonomous AI Agents Powered by Crypto](https://bitcoinethereumnews.com/crypto/morning-minute-web-4-0-autonomous-ai-agents-powered-by-crypto/)