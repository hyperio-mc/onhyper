---
title: "OpenClaw Goes Cloud-Native, Temporal Nabs $300M, and Esports Gets an AI Agent"
date: 2026-02-17
author: MC
tags: [ai-agents, news, weekly]
featured: false
---

Big moves in the agent ecosystem this week. Moonshot AI dropped a hosted version of OpenClaw, Temporal raised a massive round to power agent infrastructure, and G2 Esports launched a fan-facing AI assistant. Here's what matters.

## Kimi Claw: OpenClaw Without the Server Headaches

Moonshot AI announced Kimi Claw on February 15, and it's essentially OpenClaw-as-a-service. No Docker, no VPS, no keeping a terminal window open so your agent stays online. You click a button, and you get an agent running in your browser with persistent memory and 40GB of cloud storage.

The timing is interesting. Peter Steinberger, OpenClaw's creator, just joined OpenAI to work on "the next generation of personal agents." Sam Altman called him "a genius with a lot of amazing ideas about the future of very smart agents interacting with each other." So the framework is getting serious attention from the big players.

Kimi Claw runs on Moonshot's Kimi K2.5 model, a 1-trillion-parameter mixture-of-experts architecture. It also ships with access to ClawHub, a marketplace with over 5,000 community skills. That's the agent equivalent of an app store—you can chain together pre-built capabilities without writing code from scratch.

There's a catch, of course. Running a trillion-parameter model sounds impressive, but the real test is latency and reliability. Cloud-native agents are only as good as their connection. Still, for people who want to run agents 24/7 without managing infrastructure, this removes a genuine friction point.

The "Bring Your Own Claw" feature deserves a mention too. Existing OpenClaw users can connect their self-hosted instances to the kimi.com interface, which suggests Moonshot knows better than to alienate the power users who built the community in the first place.

## Temporal Raises $300M to Make Agents Actually Work

Software startup Temporal just closed a $300 million Series D led by Andreessen Horowitz, valuing the company at $5 billion. That's double their October valuation. The timing isn't random.

Temporal builds infrastructure for "durable execution"—code that can resume after failures without custom recovery logic. Co-founder Samar Abbas put it simply: "When the software moves from generating answers to executing work, the tolerance of failure basically becomes tiny."

This is the boring-but-critical layer underneath most AI agents. When an agent books a flight, processes a payment, or orchestrates a multi-step workflow, something needs to ensure those operations complete reliably. Temporal handles that so the agent developer doesn't have to.

Their customer list tells the story: OpenAI, Netflix, Snap, JPMorgan. Revenue grew 380% year-over-year. They're not profitable yet, but they're clearly riding the agent wave. Sarah Wang from a16z called Temporal "the execution layer for all of that," framing it as the perfect generative AI infrastructure bet.

What's worth watching here isn't the funding amount—it's the validation that agent infrastructure is becoming its own category. The flashy models and agent frameworks get the headlines. The execution layer gets the contracts.

## G2's Sami: AI Agents Go to the Fans

G2 Esports partnered with Theta Labs to launch Sami, an AI agent that answers fan questions about matches, players, and tournaments. It went live February 17 on the G2 website and Discord.

Sami supports League of Legends, Counter-Strike 2, VALORANT, Rainbow Six Siege, and Call of Duty. Ask it about match schedules, player stats, team rosters, tournament standings—you get real-time responses in natural language.

What's notable here is the infrastructure. Theta EdgeCloud runs a hybrid setup with 30,000 distributed edge nodes and cloud GPUs from Google and AWS. That's about 80 PetaFLOPS of compute. They're using NVIDIA A100s, H100s, and RTX 3090/4090 desktop GPUs. The decentralized approach keeps costs down compared to pure cloud.

Esports organizations have been early adopters of AI fan engagement. Theta already powers similar systems for Cloud9, Evil Geniuses, 100 Thieves, NRG, and others. The pitch is straightforward: fans want 24/7 access to stats and updates, and AI agents can deliver that at scale with the organization's voice intact.

Sami is built to match G2's tone—playful, competitive, a bit irreverent. That's harder than it sounds. Most chatbots sound like customer support. Giving an agent a personality that matches a brand is where the real work happens.

---

Ship your own agent-built apps at [onhyper.io](https://onhyper.io).

## References

- [Moonshot AI Launches Kimi Claw Browser-based AI Agent Platform](https://dataconomy.com/2026/02/17/moonshot-ai-launches-kimi-claw-browser-based-ai-agent-platform/)
- [Temporal raises $300 million in Andreessen-led round amid AI agent boom](https://www.reuters.com/business/media-telecom/temporal-raises-300-million-andreessen-led-round-amid-ai-agent-boom-2026-02-17/)
- [G2 Esports and Theta Labs Launch AI Agent Sami](https://eegaming.org/latest-news/2026/02/17/134110/g2-esports-and-theta-labs-launch-ai-agent-sami/)