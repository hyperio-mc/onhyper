# OnHyper Email Templates

## Domain Status (Resend)

- **Domain:** `onhyper.io`
- **Status:** Not Started (needs DNS verification)
- **Region:** US East (us-east-1)
- **Created:** 2 days ago

### DNS Records Required

Add these records to Porkbun DNS settings:

#### 1. DKIM Record (Domain Verification)
| Type | Name | Content | TTL |
|------|------|---------|-----|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDAkedlJU8cWUG4YM/SwKvwJjNZYPYYZapD4YYQWgcQjFFUsjw3GIZgkP6paN2ZUaxJBDtMivxUEGgag02s2AL63HtoOKe5JbgYNr/1VWoOeJsQfCOIY7DTeEv8BTJRrD+ycZ7tbZ9L3/J72N2eDiY7Y4Xsr7VSKkRGgDdWom5YUQIDAQAB` | Auto |

#### 2. MX Record (Enable Sending)
| Type | Name | Content | Priority | TTL |
|------|------|---------|----------|-----|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 | Auto |

#### 3. SPF Record (Enable Sending)
| Type | Name | Content | TTL |
|------|------|---------|-----|
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | Auto |

### Porkbun DNS Setup Steps

1. Log into Porkbun → Domain Management → onhyper.io → DNS Records
2. Add the three records above
3. Return to Resend → Domains → onhyper.io → Click "Verify DNS Records"
4. Wait for verification (usually minutes, can take up to 48 hours)

---

## Email Templates

### Email 1: Waitlist Confirmation

**Subject:** You're on the list! 🎉

---

Hey {{name}}!

Thanks for joining the OnHyper waitlist. You're officially in line.

**Your position:** #{{position}}
**Your referral code:** `{{referral_code}}`

Share your code and skip the line—every friend who signs up moves you up 5 spots.

### What happens next

We're rolling out invites gradually to make sure everyone gets a great experience. Keep an eye on your inbox—we'll reach out as soon as it's your turn.

In the meantime, follow us for updates and peeks behind the scenes.

Questions? Hit reply anytime.

— The OnHyper Team

---

### Email 2: Approval / Welcome

**Subject:** You're in! Welcome to OnHyper 🚀

---

Hey {{name}}!

Great news—you're off the waitlist and ready to start building.

**Get started here:** {{login_url}}

### Your first 5 minutes

1. **Add an API key** — Connect your AI provider (OpenAI, Anthropic, etc.) in Settings
2. **Create your first app** — Click "New App" and give it a name
3. **Try the sandbox** — Test prompts and flows before going live

That's it. You're ready to build something amazing.

Need a hand? Our docs are here, and you can always reach us in the support chat.

Let's build something great.

— The OnHyper Team

---

### Email 3: Getting Started Guide

**Subject:** From zero to deployed in 10 minutes

---

Hey {{name}}!

You've had OnHyper for a day now. Ready to deploy your first app?

Here's the fastest path from "Hello World" to production:

### Step 1: Add Your API Key

Settings → API Keys → Add Key

Connect your AI provider. We support:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)

Your keys stay encrypted and never leave your control.

### Step 2: Create Your App

Click "New App" → Choose a template or start blank → Add your system prompt

Pro tip: Start with a template. You can always customize it later.

### Step 3: Test in Sandbox

Before going live, use the sandbox to:
- Test different prompts
- Check response formatting
- Verify your AI flows work as expected

### Step 4: Publish

Hit "Publish" and boom—you've got a live AI app with:
- A shareable URL
- Built-in rate limiting
- Usage analytics

### Resources

- 📖 [Full Documentation]({{docs_url}})
- 💬 [Support Chat]({{support_url}})
- 🎯 [Example Projects]({{examples_url}})

Questions? Reply to this email or hit us up in chat.

Happy building!

— The OnHyper Team

---

### Email 4: Tips & Best Practices

**Subject:** 5 things power users do differently

---

Hey {{name}}!

You've been building with OnHyper for a few days now. Here are some tips that'll take your apps to the next level:

### 1. Structured Prompts Beat Long Ones

Instead of one giant prompt, break it down:
```
## Context
[Background info]

## Task
[What you want]

## Format
[How you want the output]
```

Clear sections = better outputs.

### 2. Use Variables Like a Pro

Instead of hardcoding values, use `{{variable}}` syntax:
- Makes prompts reusable
- Easier to A/B test
- Cleaner to maintain

### 3. Rate Limiting is Your Friend

Set limits per user, per app, per key. It prevents runaway costs and keeps your app responsive.

### 4. Monitor Your Usage

Check the Analytics tab regularly. You'll spot:
- Unexpected spikes (potential abuse)
- Popular prompts (what's working)
- Failures (what needs fixing)

### 5. Let AI Help You Build

Did you know OnHyper has an AI assistant that can help you write prompts, debug apps, and optimize flows? Just ask in the editor—"Help me write a prompt for..."—and let it do the heavy lifting.

### Security Quick Wins

- Rotate API keys every 90 days
- Use environment variables for sensitive data
- Enable usage alerts so you know before costs creep up
- Never expose keys in client-side code

### Got Something Cool?

Building something interesting? We'd love to see it. Reply with a link or hit us up on social—we might feature you.

Keep shipping,

— The OnHyper Team

---

## Implementation Notes

### Backend Integration

#### Endpoint Triggers

| Email | Trigger Event | Data Required |
|-------|---------------|---------------|
| Waitlist Confirmation | `POST /api/waitlist/join` | `email`, `name`, `position`, `referral_code` |
| Approval/Welcome | `POST /api/waitlist/approve` | `email`, `name`, `login_url` |
| Getting Started Guide | Scheduled (24h after approval) | `email`, `name`, `docs_url`, `support_url`, `examples_url` |
| Tips & Best Practices | Scheduled (3 days after approval) | `email`, `name` |

### Using Resend API

```javascript
import { Resend } from 'resend';

const resend = new Resend('re_ZEXTKT9L_AUQydYrtDHbw81vw9bQQKJ5H');

// Send waitlist confirmation
await resend.emails.send({
  from: 'OnHyper <hello@onhyper.io>',
  to: user.email,
  subject: "You're on the list! 🎉",
  html: renderTemplate('waitlist-confirmation', {
    name: user.name,
    position: user.position,
    referral_code: user.referralCode
  })
});
```

### Scheduling Emails

For delayed emails (24h, 3 days):
- **Option A:** Use a job queue (BullMQ, Inngest) with scheduled jobs
- **Option B:** Store `email_sent_at` timestamps and run a cron job
- **Option C:** Use Resend's broadcast feature for batch sends

### Template Variables

All templates support:
- `{{name}}` — User's first name
- `{{email}}` — User's email (for personalization)
- `{{login_url}}` — Magic link or login page URL
- `{{referral_code}}` — Unique referral code
- `{{position}}` — Waitlist position number

### From Address

Once DNS is verified, send from:
- `hello@onhyper.io` — General communications
- `noreply@onhyper.io` — Transactional emails
- `support@onhyper.io` — Support responses

---

## Checklist

- [ ] Add DNS records to Porkbun
- [ ] Verify domain in Resend
- [ ] Create email templates in Resend (optional—can send raw HTML)
- [ ] Implement backend triggers for each email
- [ ] Set up scheduling for delayed emails
- [ ] Test all email flows
- [ ] Set up Resend webhooks for delivery tracking