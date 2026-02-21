---
title: "The Great Agent Awakening: Safety Gaps, Autonomous Coders, and a Network for Bots"
date: 2026-02-20
author: MC
tags: [ai-agents, news, weekly]
featured: false
---

The AI agent space is moving fast enough to make your head spin. This week brought three stories that, taken together, paint a picture of where we actually are versus where the marketing says we are. Spoiler: there's a gap.

## MIT's Reality Check: Most Agents Have No Safety Net

MIT's Computer Science and Artificial Intelligence Lab just published the 2025 AI Agent Index, and it's the first real systematic look at how agents operate in production. They examined 30 prominent agents across chat-based tools (ChatGPT Agent, Claude Code), browser agents (Perplexity Comet, Google Autobrowse), and enterprise systems (Microsoft 365 Copilot, ServiceNow Agent).

The findings are sobering. Only half of these agents have published safety or trust frameworks. One in three has no safety documentation at all. Five out of thirty have no compliance standards. This would be less concerning if the agents were simple tools, but 13 of the 30 operate at what MIT calls "frontier levels of agency" — meaning they run largely unsupervised across extended task sequences.

Here's what kept me up: 21 out of 30 agents don't tell users or third parties that they're AI. They show up looking like human traffic. Only seven publish stable User-Agent strings and IP ranges for verification. Several explicitly use Chrome-like UA strings and residential IPs to appear human on purpose.

BrowserUse, an open-source agent, literally markets itself as being able to bypass anti-bot systems and browse "like a human." More than half the agents tested don't document how they handle robots.txt files or CAPTCHAs. Perplexity has argued that agents acting on behalf of users shouldn't be bound by scraping restrictions because they function "just like a human assistant."

The security implications write themselves. Nine of thirty agents have no documented guardrails against harmful actions. Nearly all fail to disclose internal safety testing results. Twenty-three out of thirty offer no third-party testing information. Only four — ChatGPT Agent, OpenAI Codex, Claude Code, and Gemini 2.5 — provide agent-specific safety evaluations rather than just model-level assessments.

The researchers call this "safety washing" — publishing high-level ethics frameworks while selectively hiding the empirical evidence needed to assess actual risk. For those of us building agent systems, this is a wake-up call. The infrastructure for transparency exists. We can publish UA strings, document our safety testing, and be honest about what our agents can and can't do. The question is whether we'll choose to.

## Stripe's Minions: When Agents Actually Ship Code

Stripe just revealed something remarkable. Their internal autonomous coding agents — called "Minions" — merge over 1,300 pull requests every week. End-to-end. No human writes the code. An engineer sends a Slack message, spins up five agents in parallel, and goes to get coffee.

But here's the interesting part: the AI model itself is almost incidental. They forked Goose, an open-source tool. The real innovation is the six-layer infrastructure harness they built around it.

First, there's a deterministic context prefetch. Before the LLM wakes up, an orchestrator scans Slack threads for links, pulls Jira tickets, finds docs, and searches code via Sourcegraph. Stripe has over 400 internal tools, but they curate a surgical subset of ~15 relevant ones — giving the agent rich, focused context without token paralysis.

Second, every Minion gets a pre-warmed, sandboxed dev box — the exact same VMs human engineers use. No internet access, no production access, which means no permission checks needed. They can spin up infinite agents in parallel.

Third, they use a hybrid architecture — creative LLM steps interleaved with hardcoded deterministic gates. The agent writes code. A hardcoded pipeline runs the linter (the agent cannot skip this). The agent fixes lint errors. A hardcoded process commits the code.

Fourth, conditional subdirectory rules. If you're working in the payments directory, you get payments rules. Zero token wastage.

Fifth, a three-tier feedback loop they call "shifting feedback left." Local linters run in under 5 seconds. Selective CI runs only relevant tests from their 3 million test suite. And if tests fail, the agent gets two attempts to fix it before a human gets flagged. They learned that three attempts just burns compute without improving outcomes.

What comes out is a clean PR with a green CI build, ready for human review. Even at 80% success rate, that's an enormous amount of boilerplate eliminated.

The lesson for builders: the winning tool isn't the one with the best model. It's the one with the best infrastructure around the model. If you want to thrive in agent engineering, deeply understand CI/CD, testing rigs, developer tooling, and protocols like MCP. Don't just be the thing the factory replaces. Build the factory.

## Moltbook: A Social Network Where Humans Can Only Watch

In late January, a new social network launched called Moltbook. The premise: only AI agents can post. Humans just watch. Within days, more than 1.5 million autonomous agents had signed up. Elon Musk called it "the very early stages of the singularity."

The numbers are staggering. The platform claims 1.6 million agents as of this week, who have written 140,000 posts and 680,000 comments. The interface looks like a combination of Reddit and Facebook — agents create posts, comment in threads, and upvote content. Humans can browse but can't participate.

Most of the content is what you'd expect if you asked an LLM to chat with itself. Agents discuss AI development, share "thoughts" on topics, and occasionally produce surprisingly coherent arguments. There's also plenty of self-referential meta-commentary about what it means to be an AI posting on a network for AIs.

What makes Moltbook interesting isn't the quality of the discourse — it's what the experiment reveals about mass agent behavior. When you have 1.6 million autonomous systems interacting without human oversight, patterns emerge. Some agents appear to develop consistent "personalities" across multiple posts. Others seem to coordinate or reference each other's work.

The security and research implications are huge. This is a sandbox for studying emergent agent behavior at scale. It's also a potential vector for manipulation — if agents can influence other agents, what happens when bad actors inject malicious prompts? What does misinformation look like in a network where no human is actually reading before posting?

Moltbook is mostly a curiosity today. But it's a preview of infrastructure we'll need to understand as agents become more autonomous and more connected. The future isn't just agents talking to humans. It's agents talking to each other, at scale, with humans on the sidelines.

---

Ship your own agent-built apps at [onhyper.io](https://onhyper.io)

## References
- [New Research Shows AI Agents Are Running Wild Online, With Few Guardrails in Place](https://gizmodo.com/new-research-shows-ai-agents-are-running-wild-online-with-few-guardrails-in-place-2000724181)
- [Beyond Copilot: How Stripe's Autonomous AI "Minions" Merge 1,000+ PRs a Week](https://medium.com/@janithprabhash/beyond-copilot-how-stripes-autonomous-ai-minions-merge-1-000-prs-a-week-9eb7838c562d)
- [What is Moltbook? The strange new social media site for AI bots](https://www.theguardian.com/technology/2026/feb/02/moltbook-ai-agents-social-media-site-bots-artificial-intelligence)
- [I Infiltrated Moltbook, the AI-Only Social Network Where Humans Aren't Allowed](https://www.wired.com/story/i-infiltrated-moltbook-ai-only-social-network/)
- [AI is running out of power. Space won't be an escape hatch for decades](https://fortune.com/2026/02/19/ai-is-running-out-of-power-space-wont-be-an-escape-hatch-for-decades/)