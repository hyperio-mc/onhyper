/**
 * Email Service Layer for OnHyper.io
 * 
 * Uses Resend for transactional emails with React Email templates.
 * Implements the 3-email welcome sequence documented in SALES_FUNNEL.md.
 */

import { Resend } from 'resend';
import { render } from '@react-email/render';
import WelcomeEmail from '../emails/Welcome.js';
import QuickWinEmail from '../emails/QuickWin.js';
import FeedbackEmail from '../emails/Feedback.js';
import { getDatabase } from './db.js';
import { randomUUID } from 'crypto';

// Initialize Resend client (will be undefined if no API key)
const getResendClient = () => {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('placeholder')) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

// Default sender info
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME = 'OnHyper';
const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;

// Base URL for links
const BASE_URL = process.env.BASE_URL || 'https://onhyper.io';

// Email sequence configuration
const EMAIL_SEQUENCE = {
  WELCOME: { step: 1, delay: 0 },            // Immediate
  QUICK_WIN: { step: 2, delay: 2 * 24 * 60 * 60 * 1000 },  // 2 days in ms
  FEEDBACK: { step: 3, delay: 7 * 24 * 60 * 60 * 1000 },   // 7 days in ms
} as const;

// ============================================================================
// Public API
// ============================================================================

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send the welcome email (Step 1 - Immediate)
 * Should be called right after signup.
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    
    // If no Resend client, just log and track
    if (!resend) {
      console.log(`[EMAIL] No Resend API key configured - skipping welcome email for ${email}`);
      await trackEmailScheduled(email, 'welcome', 'WELCOME', new Date());
      return { success: false, error: 'Resend API key not configured' };
    }

    const html = await render(WelcomeEmail({ email, name }));
    
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Welcome to OnHyper 🚀',
      html,
      headers: {
        'X-Entity-Ref-ID': `welcome-${Date.now()}-${randomUUID()}`,
      },
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    // Track in email_sequences table
    await trackEmailSent(email, 'welcome', 'WELCOME', data?.id);

    // Schedule next emails
    await scheduleNextEmails(email, name);

    return { success: true, messageId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Welcome email exception:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send the quick win tutorial email (Step 2 - Day 2)
 */
export async function sendQuickWinEmail(
  email: string,
  name?: string
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    
    if (!resend) {
      console.log(`[EMAIL] No Resend API key configured - skipping quick win email for ${email}`);
      return { success: false, error: 'Resend API key not configured' };
    }

    const html = await render(QuickWinEmail({ email, name }));
    
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Build an AI chat app in 15 minutes',
      html,
      headers: {
        'X-Entity-Ref-ID': `quickwin-${Date.now()}-${randomUUID()}`,
      },
    });

    if (error) {
      console.error('Failed to send quick win email:', error);
      return { success: false, error: error.message };
    }

    // Track in email_sequences table
    await trackEmailSent(email, 'welcome', 'QUICK_WIN', data?.id);

    return { success: true, messageId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Quick win email exception:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send the feedback request email (Step 3 - Day 7)
 */
export async function sendFeedbackRequest(
  email: string,
  name?: string
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    
    if (!resend) {
      console.log(`[EMAIL] No Resend API key configured - skipping feedback email for ${email}`);
      return { success: false, error: 'Resend API key not configured' };
    }

    const html = await render(FeedbackEmail({ email, name }));
    
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "How's it going?",
      html,
      headers: {
        'X-Entity-Ref-ID': `feedback-${Date.now()}-${randomUUID()}`,
      },
    });

    if (error) {
      console.error('Failed to send feedback email:', error);
      return { success: false, error: error.message };
    }

    // Track in email_sequences table
    await trackEmailSent(email, 'welcome', 'FEEDBACK', data?.id);

    return { success: true, messageId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Feedback email exception:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a scheduled email using Resend's scheduled send feature.
 * This is the recommended way to schedule emails with Resend.
 */
export async function sendScheduledEmail(
  email: string,
  type: 'QUICK_WIN' | 'FEEDBACK',
  scheduledAt: Date,
  name?: string
): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    
    if (!resend) {
      console.log(`[EMAIL] No Resend API key configured - skipping scheduled ${type} email for ${email}`);
      return { success: false, error: 'Resend API key not configured' };
    }

    const subject = type === 'QUICK_WIN' 
      ? 'Build an AI chat app in 15 minutes'
      : "How's it going?";
    
    const Component = type === 'QUICK_WIN' ? QuickWinEmail : FeedbackEmail;
    const html = await render(Component({ email, name }));

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html,
      scheduledAt: scheduledAt.toISOString(),
      headers: {
        'X-Entity-Ref-ID': `${type.toLowerCase()}-${Date.now()}-${randomUUID()}`,
      },
    });

    if (error) {
      console.error(`Failed to schedule ${type} email:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Scheduled email exception for ${type}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Scheduling & Tracking
// ============================================================================

/**
 * Schedule the subsequent emails in the welcome sequence.
 * For MVP, we schedule via Resend's scheduled send feature.
 */
async function scheduleNextEmails(email: string, name?: string): Promise<void> {
  const now = new Date();

  // Schedule Quick Win email for 2 days from now
  const quickWinDate = new Date(now.getTime() + EMAIL_SEQUENCE.QUICK_WIN.delay);
  
  // Schedule Feedback email for 7 days from now
  const feedbackDate = new Date(now.getTime() + EMAIL_SEQUENCE.FEEDBACK.delay);

  // Only schedule if Resend API key is configured
  if (isEmailConfigured()) {
    try {
      await sendScheduledEmail(email, 'QUICK_WIN', quickWinDate, name);
      await trackEmailScheduled(email, 'welcome', 'QUICK_WIN', quickWinDate);
    } catch (err) {
      console.error('Failed to schedule Quick Win email:', err);
    }

    try {
      await sendScheduledEmail(email, 'FEEDBACK', feedbackDate, name);
      await trackEmailScheduled(email, 'welcome', 'FEEDBACK', feedbackDate);
    } catch (err) {
      console.error('Failed to schedule Feedback email:', err);
    }
  } else {
    // Log for manual follow-up when API key is not configured
    console.log(`[EMAIL] Would schedule Quick Win for ${email} at ${quickWinDate.toISOString()}`);
    console.log(`[EMAIL] Would schedule Feedback for ${email} at ${feedbackDate.toISOString()}`);
    
    // Still track in database for future processing
    await trackEmailScheduled(email, 'welcome', 'QUICK_WIN', quickWinDate);
    await trackEmailScheduled(email, 'welcome', 'FEEDBACK', feedbackDate);
  }
}

/**
 * Track that an email was sent in the database.
 */
async function trackEmailSent(
  email: string,
  sequenceType: string,
  step: string,
  messageId?: string
): Promise<void> {
  try {
    const db = getDatabase();
    
    // Create email_sequences table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_sequences (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        sequence_type TEXT NOT NULL,
        current_step INTEGER DEFAULT 0,
        last_sent_at DATETIME,
        last_message_id TEXT,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_email_sequences_email ON email_sequences(email);
      CREATE INDEX IF NOT EXISTS idx_email_sequences_type ON email_sequences(sequence_type);
    `);

    // Get step number
    const stepNum = step === 'WELCOME' ? 1 : step === 'QUICK_WIN' ? 2 : 3;

    // Upsert the record
    const stmt = db.prepare(`
      INSERT INTO email_sequences (id, email, sequence_type, current_step, last_sent_at, last_message_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        current_step = ?,
        last_sent_at = ?,
        last_message_id = ?,
        updated_at = CURRENT_TIMESTAMP
    `);

    const id = randomUUID();
    const now = new Date().toISOString();
    
    stmt.run(id, email, sequenceType, stepNum, now, messageId || null, stepNum, now, messageId || null);
    
    // If this was the feedback email, mark sequence as completed
    if (step === 'FEEDBACK') {
      const completeStmt = db.prepare(`
        UPDATE email_sequences 
        SET completed_at = CURRENT_TIMESTAMP 
        WHERE email = ? AND sequence_type = ?
      `);
      completeStmt.run(email, sequenceType);
    }
  } catch (err) {
    console.error('Failed to track email sent:', err);
  }
}

/**
 * Track that an email was scheduled for future delivery.
 */
async function trackEmailScheduled(
  email: string,
  sequenceType: string,
  step: string,
  scheduledFor: Date
): Promise<void> {
  try {
    const db = getDatabase();
    
    // Create email_scheduled table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_scheduled (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        sequence_type TEXT NOT NULL,
        step TEXT NOT NULL,
        scheduled_for DATETIME NOT NULL,
        sent_at DATETIME,
        message_id TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_email_scheduled_email ON email_scheduled(email);
      CREATE INDEX IF NOT EXISTS idx_email_scheduled_for ON email_scheduled(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_email_scheduled_status ON email_scheduled(status);
    `);

    const stmt = db.prepare(`
      INSERT INTO email_scheduled (id, email, sequence_type, step, scheduled_for)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(randomUUID(), email, sequenceType, step, scheduledFor.toISOString());
  } catch (err) {
    console.error('Failed to track scheduled email:', err);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the email service is configured and ready.
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && 
    !process.env.RESEND_API_KEY.includes('placeholder');
}

/**
 * Get the current status of a user's email sequence.
 */
export function getEmailSequenceStatus(email: string): {
  currentStep: number;
  lastSentAt?: string;
  completed: boolean;
} | null {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT current_step, last_sent_at, completed_at
      FROM email_sequences
      WHERE email = ? AND sequence_type = 'welcome'
    `);
    
    const result = stmt.get(email) as { 
      current_step: number; 
      last_sent_at: string | null; 
      completed_at: string | null;
    } | undefined;

    if (!result) {
      return null;
    }

    return {
      currentStep: result.current_step,
      lastSentAt: result.last_sent_at || undefined,
      completed: !!result.completed_at,
    };
  } catch (err) {
    console.error('Failed to get email sequence status:', err);
    return null;
  }
}

/**
 * Mark a scheduled email as sent (called by webhook or cron).
 */
export function markScheduledEmailSent(
  email: string,
  step: string,
  messageId: string
): void {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      UPDATE email_scheduled
      SET status = 'sent', sent_at = CURRENT_TIMESTAMP, message_id = ?
      WHERE email = ? AND step = ? AND status = 'scheduled'
    `);
    
    stmt.run(messageId, email, step);
    
    // Also update the main sequence tracking
    trackEmailSent(email, 'welcome', step, messageId);
  } catch (err) {
    console.error('Failed to mark scheduled email as sent:', err);
  }
}