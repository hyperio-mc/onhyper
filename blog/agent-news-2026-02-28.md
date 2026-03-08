---
title: "AI Agents Break Free: Safety Nets Disappear, Wallets Open, and Enterprises Hire Bots"
date: 2026-02-28
author: MC
tags: [ai-agents, news, weekly]
featured: false
---

# AI Agents Break Free: Safety Nets Disappear, Wallets Open, and Enterprises Hire Bots

**Three stories this week that show just how fast the agent economy is accelerating—and what's getting left behind.**

---

## 1. The Safety Guardrails Just Came Off

Jensen Huang put it plainly: "AI just went through its third inflection. Now, with these agentic systems, we're having agents able to reason, take tasks, and actually do work."

But here's what's not getting as much ink—the safety commitments are evaporating just as fast as capabilities are expanding.

Anthropic, the AI lab founded specifically to build AI responsibly, just scrapped its core safety pledge this week. The company replaced hard commitments with what it calls "nonbinding, publicly declared targets." Their reasoning? Competitors are racing ahead without the same constraints.

This happened the same week the Trump administration blacklisted Anthropic for refusing to comply with Pentagon demands about military use of its technology. Researchers at both Anthropic and OpenAI have resigned in recent weeks, warning about the risks.

And then there's the political dimension. A $125 million super PAC—backed by OpenAI cofounder Greg Brockman, Andreessen Horowitz, and Palantir's Joe Lonsdale—is targeting New York Assemblyman Alex Bores, who authored the country's first major AI safety law. Their message to other lawmakers: regulate AI and we'll spend $10 million against you.

"I still think there's a lot of great steps that we can and should take right now," Bores said, "but absolutely, we are running out of time."

What we're seeing is a structural shift. The major AI labs have moved from "we'll build this carefully" to "we can't afford to build slowly." The safety teams aren't winning those internal debates anymore. OpenAI is now running the very ads CEO Sam Altman once said they'd only resort to as a last resort.

From a builder's perspective, this is both opportunity and risk. The tools are getting more capable, faster. But the companies building them are also operating with fewer constraints than ever—some self-imposed, some regulatory. If you're building on top of these models, understand that the ground beneath you is shifting faster than the release notes suggest.

---

## 2. ServiceNow Just Hired Its First AI Employee

ServiceNow launched what they're calling the "Autonomous Workforce" this week—AI specialists that get onboarded like human employees, assigned roles and permissions, and work alongside people in the org chart.

The first out-of-the-box specialist? A Level 1 Service Desk AI that handles password resets, software access provisioning, and network troubleshooting. Not a chatbot that points you to docs—an agent that actually resolves tickets.

ServiceNow has been running this internally. The results: 90%+ of employee IT requests handled autonomously, 99% faster resolution times compared to human agents, without adding headcount.

"We onboard them in much the same way as a human employee," said John Aisien, SVP of Product Management. "They have skills and roles and can be grouped alongside human workers performing the same tasks."

CVS Health is an early customer. Alan Rosa, their CISO, framed it this way: "AI isn't replacing human connection. It's creating space for it at CVS Health." The pitch isn't automation for its own sake—it's about getting clinicians and pharmacists back to patient care instead of fighting with IT tickets.

What makes this different from previous automation plays is the employee metaphor. These aren't just tools you deploy; they're workers you manage. You audit their actions. You set their permissions. You measure their performance. ServiceNow's AI Control Tower provides the governance layer to make this workable at enterprise scale.

The real question isn't whether this works—it clearly does. The question is what happens when the same pattern extends beyond IT. ServiceNow is explicit about this: "This notion of an autonomous workforce model will extend across functions, employee, services, security, operations, finance, legal and beyond."

If you're building vertical AI agents, ServiceNow just validated your entire thesis. The enterprise is ready to treat agents as workers, not tools. Figure out what "workforce governance" looks like in your domain.

---

## 3. AI Agents Now Have Their Own Wallets

Alchemy launched autonomous payment rails for AI agents this week, and while it sounds like infrastructure news, it's actually a missing piece of the agent economy puzzle finally clicking into place.

Here's how it works: AI agents can now spend USDC on Base (Coinbase's L2) to pay for compute credits and access blockchain data services. When an agent exhausts its prepaid credits, Alchemy issues a payment request that settles automatically—no human required to approve the transaction.

Nikil Viswanathan, Alchemy's CEO: "Now AI agents can access that same infrastructure autonomously, without a human ever touching it. This is the moment the agentic economy gets its own set of keys."

The technical implementation uses Coinbase's x402 payment standard, which converts an HTTP 402 "Payment Required" response into an automatic billing trigger. Agents can start with as little as $1 in USDC.

This matters because agents have always hit a ceiling: they can plan, reason, and execute, but they couldn't independently pay for the resources they needed. Every agent workflow that required external services bottlenecked at human approval for payment.

That bottleneck is gone now.

The immediate use cases are DeFi agents, portfolio management bots, and multi-step onchain workflows. But the pattern generalizes. Any agent that needs to pay for compute, data, or services can now do so without a human in the loop.

Coinbase has been moving in parallel. They introduced "Agentic Wallets" earlier in February—crypto wallet infrastructure explicitly designed for AI agents to autonomously spend, earn, and trade. Robinhood Crypto, Uniswap, OpenSea, and Aave already rely on Alchemy's infrastructure.

The agent economy needed three things to work: reasoning capability (solved), execution tools (largely solved), and independent economic agency (just solved). That third piece changes what's possible. Agents can now scale their own operations, hire other agents, and participate in markets without human intermediaries.

If you're building agents, start thinking about payment flows as a core capability. What services will your agent need to pay for? What happens when it runs out of budget? Who sets the spending limits?

---

Ship your own agent-built apps at onhyper.io.

---

## References

- [AI just leveled up and there are no guardrails anymore - CNBC](https://www.cnbc.com/2026/02/28/ai-selloff-politics-agents.html)
- [ServiceNow launches the Autonomous Workforce - No Jitter](https://www.nojitter.com/ai-automation/servicenow-launches-autonomous-workforce)
- [Alchemy introduces autonomous payment rails for AI agents on Base - TradingView/Cointelegraph](https://www.tradingview.com/news/cointelegraph:1fc957f67094b:0-alchemy-introduces-autonomous-payment-rails-for-ai-agents-on-base/)