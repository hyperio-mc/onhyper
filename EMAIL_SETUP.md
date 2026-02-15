# Email Welcome Sequence Setup

This document describes the email infrastructure for OnHyper's welcome sequence.

## Overview

OnHyper uses **Resend** for transactional emails with React Email templates. The welcome sequence consists of 3 emails sent over 7 days after signup.

## Quick Setup

### 1. Get a Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create a new API key from the dashboard
3. For testing, Resend provides a sandbox: `onboarding@resend.dev`

### 2. Configure Environment

Add to your `.env` file:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=hello@onhyper.io
```

For production, you'll also need to verify your domain in Resend's dashboard.

### 3. Verify Setup

The email service will automatically send emails when:
- A user signs up (welcome email)
- The sequence progresses (day 2 and day 7 emails)

If no API key is configured, the system logs email intents instead of sending.

## Email Sequence

| Email | Trigger | Delay | Purpose |
|-------|---------|-------|---------|
| **Welcome** | Signup | Immediate | Welcome, onboarding steps |
| **Quick Win** | Signup | +2 days | Tutorial: Build AI chat in 15 min |
| **Feedback** | Signup | +7 days | Check-in, community invite |

## Files

```
src/
├── emails/
│   ├── Welcome.tsx        # Email 1 template
│   ├── QuickWin.tsx       # Email 2 template
│   ├── Feedback.tsx       # Email 3 template
│   └── index.ts           # Exports
├── lib/
│   └── email.ts           # Email service layer
└── routes/
    ├── auth.ts            # Triggers welcome on signup
    └── unsubscribe.ts     # Unsubscribe handling
```

## How It Works

### Signup Flow

1. User completes signup via `POST /api/auth/signup`
2. `sendWelcomeEmail()` is called asynchronously
3. Welcome email is sent immediately
4. Quick Win and Feedback emails are scheduled via Resend's scheduled send

### Email Tracking

The system tracks email state in two SQLite tables:

```sql
-- Per-user sequence progress
email_sequences (
  email,
  sequence_type,
  current_step,
  last_sent_at,
  completed_at
)

-- Individual scheduled emails
email_scheduled (
  email,
  step,
  scheduled_for,
  status
)
```

### Scheduling

For scheduled emails, we use Resend's native `scheduledAt` parameter:

```typescript
await resend.emails.send({
  from: FROM,
  to: email,
  subject: '...',
  html: '...',
  scheduledAt: '2026-02-17T10:00:00Z', // ISO timestamp
});
```

### Unsubscribe

All emails include an unsubscribe link:
- `GET /unsubscribe?email=user@example.com` - Confirmation page
- `POST /unsubscribe` - Process unsubscribe

Unsubscribes are recorded in the `subscribers` table with `unsubscribed_at` timestamp.

## Manual Email Triggers

If you need to manually trigger emails (for testing or recovery):

```typescript
import { sendWelcomeEmail, sendQuickWinEmail, sendFeedbackRequest } from './lib/email.js';

// Send welcome email
await sendWelcomeEmail('user@example.com', 'John');

// Send quick win email
await sendQuickWinEmail('user@example.com', 'John');

// Send feedback request
await sendFeedbackRequest('user@example.com', 'John');
```

## Testing

### With Resend Sandbox

Using `onboarding@resend.dev`:
- Emails are delivered to the Resend dashboard
- You can view sent emails in the Resend UI

### Without API Key

The system gracefully degrades:
- Logs email intents to console
- Tracks in database for later processing
- Returns `success: false` with error message

## Production Checklist

- [ ] Create Resend account
- [ ] Add `RESEND_API_KEY` to environment
- [ ] Verify sending domain in Resend dashboard
- [ ] Update `RESEND_FROM_EMAIL` to your verified domain
- [ ] Test welcome email sends on signup
- [ ] Verify unsubscribe page works
- [ ] Monitor email delivery in Resend dashboard

## Troubleshooting

### Emails not sending

1. Check `RESEND_API_KEY` is set and valid
2. Check Resend dashboard for delivery status
3. Check server logs for error messages

### Emails going to spam

1. Verify domain in Resend dashboard
2. Set up SPF/DKIM records
3. Warm up sending reputation gradually

### Unsubscribe not working

1. Check `/unsubscribe` route is accessible
2. Check database writes to `subscribers` table
3. Check email query parameter is passed correctly

---

*Last updated: February 2026*