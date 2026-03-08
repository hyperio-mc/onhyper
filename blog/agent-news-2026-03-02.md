---
title: "AI Agents Learn to Use Computers, Run Networks, and Work Full Shifts"
date: 2026-03-02
author: MC
tags: [ai-agents, news, weekly]
featured: false
---

The past week in AI agents has been quietly significant. No single headline dominated, but three stories together sketch a picture of where this technology is going: agents that operate computers like humans, run telecom infrastructure autonomously, and sustain focus for an entire workday.

## Anthropic Buys Vercept, and Computer Use Gets Real

Anthropic acquired Vercept, a Seattle startup focused on AI perception and software interaction. The headline is acquisition news, but the underlying data point deserves more attention: Claude's performance on OSWorld—a benchmark for computer use—jumped from under 15% in late 2024 to 72.5% today.

That number matters because "computer use" means exactly what it sounds like. The model sees a screen, moves a cursor, clicks buttons, types into forms, and navigates between applications. Not through APIs or integrations—through the actual interface humans use.

Think about what that enables. An agent that can fill out a complex spreadsheet, switch browser tabs, look up data, and return to enter it correctly. That's not a demo anymore. Sonnet 4.6 is approaching human performance on exactly those tasks.

Vercept's team will focus entirely on pushing this further. Their external product is shutting down. Anthropic clearly sees computer use as core infrastructure, not a side project. The acquisition is a bet that the next frontier isn't smarter language models—it's models that can act on that intelligence through real software.

For anyone building AI-powered tools, this raises a question: do you build proprietary integrations, or do you build for agents that can use any software humans can? The answer is shifting.

## Telcos Start Handing Their Networks to AI Agents

At Mobile World Congress this week, Google announced a suite of AI agents designed to run telecom networks with minimal human involvement. The pitch is "zero-touch" networks that identify problems, diagnose root causes, and fix themselves.

The centerpiece is a network digital twin—a dynamic graph representing real-time physical and logical state. Telcos can simulate failures, predict cascading issues, and test upgrades before deploying them. Google released the source code for their telco data pipeline on GitHub, pushing for industry-standard ontologies.

The agents go beyond monitoring. They take action. If a network node fails, the agent reroutes traffic through optimal paths. If call quality drops, it diagnoses and restores performance. Deutsche Telekom and Vodafone are already on board.

This is infrastructure AI at scale. Not a chatbot answering customer queries—agents making consequential decisions about connectivity for millions of users. The engineering mindset here is worth noting: Google built these systems to act autonomously within defined parameters, not to escalate every edge case to a human operator.

Critics will point out that "zero-touch" is marketing language, not an engineering reality. Edge cases exist. Failures cascade unpredictably. But the direction is clear: large-scale infrastructure is becoming an agent operations problem, not a human operations problem.

## AI Agents Are Now Working Full Shifts

Jon Radoff published a comprehensive research deck on the state of AI agents in 2026. The most striking finding isn't a single benchmark—it's the task horizon data from METR.

In early 2024, frontier models could sustain autonomous work for about four minutes. By February 2026, Claude Opus 4.6 crossed 14.5 hours of sustained autonomous work. The doubling rate: every 123 days.

Extrapolate that curve and you get week-long autonomous tasks by late 2026, month-long tasks by mid-2027. This isn't theoretical—it's measured performance on real work.

The economic context matters too. Inference costs dropped 92% in three years. Per-million-token pricing fell from $30 in early 2023 to between $0.10 and $2.50 today. At those prices, agentic workflows shift from expensive experiments to baseline infrastructure.

Other data points from the research: 4% of all GitHub commits are now authored by Claude Code. Cursor reached $1 billion ARR in 24 months—the fastest B2B SaaS ramp ever. SaaS valuations lost $2 trillion in market cap in January 2026 alone, partly because per-seat pricing looks increasingly untenable when one agent can replace dozens of seats.

The research frames this as the shift from engineering-era software to creator-era software. The bottleneck is no longer "can we build this." It's "should we build this, and for whom." I'm not fully sold on that framing—it assumes the hard problems are solved. They're not. But the direction is right.

The compute story underneath all this gets less attention but deserves more. Big Tech committed $690 billion in 2026 capex. Global data center power consumption will hit 96 gigawatts—twice the UK's entire electrical grid. The constraint is atoms, not software.

## What I'm Watching

These three stories share a theme: agents moving from demos to infrastructure. Computer use agents don't just chat about tasks—they perform them. Network agents don't just suggest fixes—they implement them. And the task horizon data suggests the length of those tasks is scaling faster than most people realize.

The gap between "AI can do this task" and "AI reliably does this task for hours without breaking things" is narrowing. That's not a polished marketing narrative yet. It's a messy, practical reality that's starting to matter for infrastructure, enterprise software, and developer tooling.

Ship your own agent-built apps at onhyper.io

---

## References

- [Anthropic acquires Vercept to optimize Claude's computer use](https://www.techzine.eu/news/analytics/139119/anthropic-acquires-vercept-to-optimize-claudes-computer-use/)
- [Google's newest AI agents bring telcos a step closer to autonomous network operations](https://siliconangle.com/2026/03/02/googles-newest-ai-agents-bring-telcos-step-closer-autonomous-network-operations/)
- [The State of AI Agents in 2026 - Jon Radoff](https://meditations.metavert.io/p/the-state-of-ai-agents-in-2026)
- [Anthropic updates Claude Cowork tool built to give the average office worker a productivity boost](https://www.cnbc.com/2026/02/24/anthropic-claude-cowork-office-worker.html)