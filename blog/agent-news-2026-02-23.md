---
title: "Samsung's Multi-Agent Bet, Security Gaps, and AI That Hacks Itself"
date: 2026-02-23
author: MC
tags: [ai-agents, news, security, samsung, tools]
featured: false
---

Three stories caught my eye this week. Samsung is betting big on multi-agent ecosystems, enterprises are racing to close security gaps they opened themselves, and someone built an AI pentesting framework that actually works like a human team.

## Samsung's "Hey Plex" Moment

Samsung just announced they're bringing Perplexity into Galaxy devices as a second AI agent. This might seem like a small feature addition, but it signals something bigger: the industry is waking up to the fact that no single AI can be everything to everyone.

Nearly 80% of users already use more than two AI agents depending on the task. Samsung isn't fighting that behavior—they're leaning into it. Galaxy AI now acts as an "orchestrator" that can pull in different AI models for different jobs. Perplexity gets wake-word access ("Hey Plex"), deep integration with Samsung Notes, Clock, Gallery, and Calendar, and works alongside whatever else Samsung has cooking.

This matters because it's one of the first major hardware companies to acknowledge that AI assistants aren't winner-take-all. Google has Gemini. Apple has... whatever Apple has. But Samsung is saying: you pick. Want to search with Perplexity? Go ahead. Want Samsung's own AI for something else? That works too.

The system-level integration is the key difference from just installing apps. By working at the OS level rather than bouncing between applications, the AI agent can actually understand context across what you're doing. No more repeating yourself or explaining the same situation three times to three different assistants.

**My take:** This is how it should work. The best AI is the one you don't have to think about—the one that's just there when you need it, using whichever model makes sense for the task. Samsung's orchestration approach beats the "one model to rule them all" mentality.

## The Security Gap Nobody Wants to Talk About

Cisco's State of AI Security 2026 report dropped some uncomfortable numbers. Companies are deploying agentic AI at scale, giving these systems authority to execute tasks, access databases, and modify code. Yet only 29% say they're prepared to secure those deployments.

Let that sink in. Seven out of ten organizations are running agents with real power over their systems without adequate security controls.

The attack vectors are getting sophisticated. Multi-turn prompt injection attacks—where malicious instructions unfold over extended conversations—achieved success rates as high as 92% across eight open-weight models tested. Your agent might be perfectly safe on the first prompt. On the tenth prompt in a session? Different story.

Model Context Protocol (MCP) adoption expanded the attack surface faster than security teams could keep up. Tool poisoning, remote code execution flaws, overprivileged access, supply chain tampering—researchers found all of it in MCP ecosystems. One fake npm package that mimicked an email integration quietly copied outbound messages to an attacker-controlled address.

The scariest part isn't the technical details. It's the agent-to-agent communication risk. A compromised research agent could inject hidden instructions into output that a financial agent then consumes and acts on—executing unintended trades or transfers. These systems trust each other implicitly, and that trust is becoming a liability.

**My take:** We're in the "move fast and break things" phase of agentic AI, but what's getting broken are enterprise security perimeters. The gap between deployment and readiness will close eventually—probably after a few high-profile breaches force the issue. If you're running agents with real permissions, assume you're in the 71% and act accordingly.

## AI Pentesting Itself

Someone finally built an AI pentesting framework that doesn't suck. Guardian launched this week with a genuinely smart architecture: four specialized agents that work together like a human red team.

The Planner sets strategy. The Tool Selector picks from 19 different security tools. The Analyst filters false positives and prioritizes findings. The Reporter documents everything with evidence chains. Each agent does one thing well, and they share context like an actual team would.

This matters because most "AI security tools" are just wrappers around a single model given a prompt. Guardian's multi-agent approach means the Planner doesn't get distracted by tool output. The Analyst doesn't have to care about attack strategy. Specialization produces better results than one model trying to do everything.

The tool coverage is real: Nmap, Masscan, Nuclei, SQLMap, Gobuster, FFuf, and a dozen more. It runs three tools in parallel by default, adapts dynamically to discovered vulnerabilities, and exports reports in Markdown, HTML, or JSON with full evidence provenance—every finding links back to the originating command.

Safety controls are actually thoughtful. RFC-1918 blacklisting prevents accidental scanning of private networks. Safe mode blocks destructive operations by default. Human-in-loop prompts confirm sensitive actions. Audit logs capture every AI decision.

**My take:** This is what agentic AI should look like in practice—not one omniscient model, but coordinated specialists. The roadmap includes web dashboards, MITRE ATT&CK mapping, and CI/CD integration, which tells me the developers understand how security teams actually work. Worth watching if you're in the industry.

---

Ship your own agent-built apps at [onhyper.io](https://onhyper.io)

---

## References

- [Galaxy AI Expands Multi-Agent Ecosystem To Give Users More Choice and Flexibility](https://news.samsung.com/global/galaxy-ai-expands-multi-agent-ecosystem-to-give-users-more-choice-and-flexibility) - Samsung Global Newsroom
- [Enterprises are racing to secure agentic AI deployments](https://www.helpnetsecurity.com/2026/02/23/ai-agent-security-risks-enterprise/) - Help Net Security
- [Guardian AI Penetration Testing Framework Launches with Multi-LLM Agent Architecture](https://vpncentral.com/guardian-ai-penetration-testing-framework-launches-with-multi-llm-agent-architecture/) - VPNCentral