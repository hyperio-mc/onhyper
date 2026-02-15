/**
 * Unsubscribe routes for OnHyper.io
 * 
 * Handles email unsubscribes (required by law and Resend).
 */

import { Hono } from 'hono';
import { getDatabase } from '../lib/db.js';
import { randomUUID } from 'crypto';

const unsubscribe = new Hono();

/**
 * GET /unsubscribe
 * Display unsubscribe confirmation page
 */
unsubscribe.get('/', async (c) => {
  const email = c.req.query('email');
  
  if (!email) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe - OnHyper</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
            h1 { color: #171717; }
            .error { color: #dc2626; background: #fee2e2; padding: 16px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Unsubscribe Error</h1>
          <p class="error">No email address provided. Please use the unsubscribe link from your email.</p>
        </body>
      </html>
    `, 400);
  }

  // Show unsubscribe form
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Unsubscribe - OnHyper</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
          h1 { color: #171717; }
          .info { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
          .email { font-weight: bold; color: #4f46e5; }
          button { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; }
          button:hover { background: #4338ca; }
          .muted { color: #6b7280; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Unsubscribe from OnHyper Emails</h1>
        <div class="info">
          <p>You're about to unsubscribe <span class="email">${email}</span> from OnHyper marketing emails.</p>
          <p>You'll still receive essential account emails (password resets, security alerts, etc.).</p>
        </div>
        <form action="/unsubscribe" method="POST">
          <input type="hidden" name="email" value="${email}">
          <button type="submit">Confirm Unsubscribe</button>
        </form>
        <p class="muted">Changed your mind? Just close this page.</p>
      </body>
    </html>
  `);
});

/**
 * POST /unsubscribe
 * Process unsubscribe request
 */
unsubscribe.post('/', async (c) => {
  const body = await c.req.parseBody();
  const email = body.email as string;

  if (!email) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe Error - OnHyper</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
            h1 { color: #171717; }
            .error { color: #dc2626; background: #fee2e2; padding: 16px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Error</h1>
          <p class="error">No email address provided.</p>
        </body>
      </html>
    `, 400);
  }

  try {
    const db = getDatabase();
    
    // Create subscribers table if needed
    db.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        source TEXT,
        unsubscribed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
    `);

    // Update subscriber record or create one marked as unsubscribed
    const stmt = db.prepare(`
      INSERT INTO subscribers (id, email, unsubscribed_at, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        unsubscribed_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(randomUUID(), email);

    // Log unsubscribe in email_sequences
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_unsubscribes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        unsubscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);
    `);

    const logStmt = db.prepare(`
      INSERT INTO email_unsubscribes (id, email)
      VALUES (?, ?)
    `);
    logStmt.run(randomUUID(), email);

    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed - OnHyper</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
            h1 { color: #171717; }
            .success { color: #16a34a; background: #dcfce7; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
            .email { font-weight: bold; }
            a { color: #4f46e5; }
          </style>
        </head>
        <body>
          <h1>You've Been Unsubscribed</h1>
          <div class="success">
            <span class="email">${email}</span> has been removed from our marketing email list.
          </div>
          <p>You'll still receive essential account emails (password resets, security alerts, etc.).</p>
          <p>If this was a mistake or you'd like to re-subscribe, contact us at <a href="mailto:hello@onhyper.io">hello@onhyper.io</a>.</p>
          <p><a href="https://onhyper.io">← Back to OnHyper</a></p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe Error - OnHyper</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
            h1 { color: #171717; }
            .error { color: #dc2626; background: #fee2e2; padding: 16px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Error</h1>
          <p class="error">Something went wrong. Please contact <a href="mailto:hello@onhyper.io">hello@onhyper.io</a> to unsubscribe.</p>
        </body>
      </html>
    `, 500);
  }
});

export { unsubscribe };