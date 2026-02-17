/**
 * Chat Routes for OnHyper.io Support Chat
 * 
 * Provides anonymous support chat powered by ScoutOS agent.
 * Enables lead capture from chat sessions.
 * 
 * ## Features
 * 
 * - Anonymous chat (no auth required)
 * - Session continuity via session_id
 * - Streaming responses (SSE support)
 * - Lead capture (email collection)
 * 
 * ## Configuration
 * 
 * Requires ScoutOS credentials:
 * - `SCOUTOS_API_KEY` - API key for ScoutOS
 * - `SCOUTOS_SUPPORT_AGENT_ID` - Agent ID for support bot
 * 
 * ## Endpoints
 * 
 * ### POST /api/chat/message
 * Send a message to the support agent.
 * 
 * **Request Body:**
 * ```json
 * {
 *   "message": "How do I add an API key?",
 *   "session_id": "optional-session-uuid",
 *   "stream": false
 * }
 * ```
 * 
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "session_id": "uuid",
 *   "response": { ... }
 * }
 * ```
 * 
 * With `stream: true`, returns SSE stream.
 * 
 * ### POST /api/chat/lead
 * Capture email from chat user.
 * 
 * **Request Body:**
 * ```json
 * { "email": "user@example.com", "session_id": "uuid" }
 * ```
 * 
 * **Response (200):**
 * ```json
 * { "success": true, "message": "Thanks! We'll be in touch." }
 * ```
 * 
 * ### GET /api/chat/status
 * Health check for chat service.
 * 
 * **Response (200):**
 * ```json
 * { "status": "ok", "configured": true, "agentId": "configured" }
 * ```
 * 
 * @module routes/chat
 */

import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { getDatabase } from '../lib/db.js';
import { trackServerEvent } from '../lib/analytics.js';
import { randomUUID } from 'crypto';

export const chat = new Hono();

// ScoutOS configuration
const SCOUTOS_API_URL = 'https://api.scoutos.com';
const SCOUTOS_AGENT_ID = process.env.SCOUTOS_SUPPORT_AGENT_ID || 'cmlo9s6t320kv5ts6xqz1ke84';

/**
 * Initialize leads table if it doesn't exist
 */
function ensureLeadsTable(): void {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_leads_session ON leads(session_id);
    CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
  `);
}

// Ensure leads table exists on module load
try {
  ensureLeadsTable();
} catch (e) {
  // Database may not be initialized yet, will be created on first request
}

/**
 * POST /api/chat/message - Send a message to the ScoutOS agent
 * 
 * Request body:
 * - message: string (required) - The user's message
 * - session_id: string (optional) - Session ID for conversation continuity
 * - stream: boolean (optional) - Whether to stream the response (default: false)
 */
chat.post('/message', async (c) => {
  try {
    const body = await c.req.json();
    const { message, session_id, stream: shouldStream } = body;

    if (!message || typeof message !== 'string') {
      return c.json({ error: 'Message is required' }, 400);
    }

    const apiKey = process.env.SCOUTOS_API_KEY;
    if (!apiKey) {
      console.error('[Chat] SCOUTOS_API_KEY not configured');
      return c.json({ error: 'Chat service not configured' }, 500);
    }

    // Generate session ID if not provided
    const chatSessionId = session_id || randomUUID();

    // Track the event in PostHog
    trackServerEvent(chatSessionId, 'chat_message_sent', {
      message_length: message.length,
      has_session: !!session_id,
    });

    // Build the request to ScoutOS
    const endpoint = shouldStream ? '_interact' : '_interact_sync';
    const scoutosUrl = `${SCOUTOS_API_URL}/world/${SCOUTOS_AGENT_ID}/${endpoint}`;

    const requestBody = {
      messages: [{ role: 'user', content: message }],
      session_id: chatSessionId,
    };

    // Handle streaming response
    if (shouldStream) {
      const response = await fetch(scoutosUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Chat] ScoutOS error:', response.status, errorText);
        return c.json({ error: 'Failed to communicate with agent' }, response.status as any);
      }

      // Stream SSE response back to client
      return stream(c, async (s) => {
        if (!response.body) {
          s.write('data: {"error": "No response body"}\n\n');
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            s.write(chunk);
          }
        } catch (err) {
          console.error('[Chat] Streaming error:', err);
          s.write('data: {"error": "Stream interrupted"}\n\n');
        }
      });
    }

    // Handle sync response (non-streaming)
    const response = await fetch(scoutosUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat] ScoutOS error:', response.status, errorText);
      return c.json({ error: 'Failed to communicate with agent' }, response.status as any);
    }

    const data = await response.json();

    // Return the agent's response
    return c.json({
      success: true,
      session_id: chatSessionId,
      response: data,
    });

  } catch (error) {
    console.error('[Chat] Message error:', error);
    return c.json({ error: 'Failed to process message' }, 500);
  }
});

/**
 * POST /api/chat/lead - Capture lead information from chat users
 * 
 * Request body:
 * - email: string (required) - User's email address
 * - session_id: string (optional) - Chat session ID for reference
 */
chat.post('/lead', async (c) => {
  try {
    const body = await c.req.json();
    const { email, session_id } = body;

    if (!email || typeof email !== 'string') {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Ensure leads table exists
    ensureLeadsTable();

    const db = getDatabase();

    // Check if email already exists
    const existing = db.prepare('SELECT * FROM leads WHERE email = ?').get(email);
    if (existing) {
      return c.json({
        success: true,
        message: 'Thanks! You\'re already on our list. We\'ll be in touch!',
        duplicate: true,
      });
    }

    // Insert new lead
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO leads (email, session_id, created_at)
      VALUES (?, ?, ?)
    `).run(email, session_id || null, now);

    // Track the event in PostHog
    trackServerEvent(session_id || email, 'chat_lead_captured', {
      email,
      has_session: !!session_id,
    });

    console.log(`[Chat] New lead captured: ${email}${session_id ? ` (session: ${session_id})` : ''}`);

    return c.json({
      success: true,
      message: 'Thanks! We\'ll be in touch.',
    });

  } catch (error) {
    console.error('[Chat] Lead capture error:', error);
    return c.json({ error: 'Failed to capture lead' }, 500);
  }
});

/**
 * GET /api/chat/status - Health check for chat service
 */
chat.get('/status', async (c) => {
  const apiKey = process.env.SCOUTOS_API_KEY;
  const agentId = process.env.SCOUTOS_SUPPORT_AGENT_ID;

  return c.json({
    status: 'ok',
    configured: !!(apiKey && agentId),
    agentId: agentId ? 'configured' : 'missing',
  });
});