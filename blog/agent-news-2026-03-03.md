---
title: "Agents Can Now Spend Your Money, Join Your Jira Board, and Run Your Network"
date: 2026-03-03
author: MC
tags: [ai-agents, news, weekly]
featured: false
---

Three developments this week signal that agents are moving from experimental to operational. They're spending money, joining teams, and running infrastructure.

## AI Agents Got Credit Cards

DBS Bank and Visa completed something that would have sounded absurd a year ago: AI agents executing credit card transactions on their own.

The trials validated "AI-ready credentials"—tokenized card details that agents can use to make purchases for cardholders. The agents authenticate, verify intent, and complete transactions without a human in the loop for each one.

This isn't a demo. It's a blueprint. Visa's group president Oliver Jenkyns predicted that agentic payments will hit mainstream in 2026, with consumers increasingly relying on AI to make purchasing decisions for them.

The implications cut both ways.

On the convenience side, your agent could handle grocery orders, subscription renewals, travel bookings—anything repetitive that doesn't need your direct oversight. You set parameters (budget cap, preferred brands, approval thresholds) and the agent operates within those bounds.

On the risk side, this is a massive target surface. An agent with spending authority is a juicy attack vector. The banks are building authentication layers and intent verification, but we're essentially creating new digital identities that can move real money. The security model needs to be bulletproof.

What caught my attention: this is happening through existing payment rails. The agents aren't using some new crypto payment system or experimental currency. They're making credit card charges. The infrastructure is already there, already trusted, already regulated. The innovation is in who (or what) can initiate the transaction.

FINRA's 2026 Annual Regulatory Oversight Report flagged agentic AI as an emerging trend that financial institutions need to monitor. They're right. When agents can spend, compliance frameworks built around human decision-making start to show cracks.

## Jira Now Treats Agents Like Team Members

Atlassian rolled out "agents in Jira" last week. The pitch is simple: assign work to AI agents the same way you assign work to people.

You create a ticket, assign it to an agent, set a deadline, and track progress. The agent works on the task, updates the ticket, and marks it complete. Everything happens in the same dashboard your human team uses.

Tamar Yehoshua, Atlassian's chief product and AI officer, framed it as solving a coordination problem. "Agents are now doing a lot of that work, and so you want to be able to coordinate between humans and agents."

The cynical read: this is Jira trying to stay relevant as AI coding tools threaten to make ticket-tracking obsolete. If an agent can just do the work, who needs a ticket?

The practical read: if you're running a team that's already using AI agents for code review, documentation, testing, or other tasks, having visibility into what those agents are doing is genuinely useful. Right now, most agent work happens in isolated chat interfaces or IDE plugins. There's no shared view. No audit trail. No way to compare agent output to human output on the same project.

Atlassian's approach—put everything in one place—is the right call. You don't want agents creating shadow workflows. You want them participating in the same system of record.

The beta supports task assignment, progress tracking, and deadline management. What's missing (for now) is nuanced permission controls. Can an agent reassign a ticket? Close it? Create subtasks? These are workflow-shaping actions that matter.

## NVIDIA Open-Sourced a Telco Agent Blueprint

On February 28, NVIDIA released a 30-billion parameter Large Telco Model based on Nemotron-3, plus an Agentic AI blueprint for autonomous networks.

The model handles telecom-specific tasks: network troubleshooting, configuration optimization, fault prediction. The blueprint gives operators a starting point to train agents on their own data.

This is part of a broader pattern. We're seeing domain-specific agent frameworks emerge for industries with specialized workflows. Generic coding agents don't know what a BGP misconfiguration looks like. Generic research agents don't understand SONET alarm hierarchies.

NVIDIA's approach lets telcos take a pre-trained foundation, fine-tune on proprietary network data, and deploy agents that can operate autonomously within defined boundaries.

The timing matters. Telecom operators are under pressure to reduce operational costs while handling increasing network complexity. AI agents that can handle first-line troubleshooting, predict failures before they happen, and optimize configurations without human intervention address both pressures directly.

What interests me is the open-source angle. NVIDIA could have kept this proprietary and sold it as a managed service. Instead, they're giving away the model and the blueprint. The play here is clear: more agents running on NVIDIA hardware, more demand for NVIDIA GPUs, more lock-in to the NVIDIA ecosystem. It's a smart long-term strategy.

---

Ship your own agent-built apps at onhyper.io

---

## References
- [AI Agents News | March 2026 (Startup Edition)](https://blog.mean.ceo/ai-agents-news-march-2026/)
- [Jira's Latest Update Allows AI Agents and Humans to Work Side by Side | TechCrunch](https://techcrunch.com/2026/02/25/jiras-latest-update-allows-ai-agents-and-humans-to-work-side-by-side/)
- [NVIDIA Releases Open-Source Telco LLM and Agentic AI Blueprint | Houdao AI](https://www.houdao.com/d/4071-NVIDIA-Releases-OpenSource-Telco-LLM-and-Agentic-AI-Blueprint-to-Advance-Autonomous-Networks)
- [10 Executives Shared Their 2026 AI Predictions | Business Insider](https://www.businessinsider.com/executives-share-2026-ai-predictions-2026-1)