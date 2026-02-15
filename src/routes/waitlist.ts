/**
 * Waitlist Routes for OnHyper.io
 * 
 * Handles waitlist applications, position tracking, and referrals
 */

import { Hono } from 'hono';
import { getDatabase, type WaitlistEntry, type WaitlistReferral, type InviteCode } from '../lib/db.js';
import { randomUUID } from 'crypto';

export const waitlist = new Hono();

/**
 * Generate a unique referral code
 */
function generateReferralCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate an invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ONHYPER-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Calculate auto score for an application
 */
function calculateAutoScore(
  whatBuilding: string,
  projectLink: string | null,
  apisUsed: string[],
  email: string
): number {
  let score = 0;

  // Q1 - "What are you building?" (0-3 points)
  const hasApiMention = /\b(openai|anthropic|claude|gpt|ai api|api|llm|language model)\b/i.test(whatBuilding);
  const hasProjectMention = /\b(building|building|created|developing|shipping|deployed|launched)\b/i.test(whatBuilding);
  const hasSpecifics = whatBuilding.length > 50 && !/\b(just exploring|want to learn|curious)\b/i.test(whatBuilding);
  
  if (hasApiMention && hasSpecifics && hasProjectMention) {
    score += 3;
  } else if (hasProjectMention || hasApiMention) {
    score += 2;
  } else if (whatBuilding.length > 20) {
    score += 1;
  }

  // Q2 - "Link to your work" (0-3 points)
  if (projectLink) {
    const hasGitHub = /github\.com/i.test(projectLink);
    const hasValidUrl = /^https?:\/\/.+\..+/.test(projectLink);
    if (hasGitHub) {
      score += 3;
    } else if (hasValidUrl) {
      score += 2;
    } else {
      score += 1;
    }
  }

  // Q3 - "Which AI APIs?" (0-2 points)
  if (apisUsed.length >= 2) {
    score += 2;
  } else if (apisUsed.length === 1) {
    score += 1;
  }

  // Email scoring (0-2 points)
  const isCustomDomain = !/@(gmail|outlook|hotmail|yahoo|icloud|aol)\.com$/i.test(email);
  const isDisposable = /@(temp|throwaway|guerrilla|10minutemail|mailinator)/i.test(email);
  const isEdu = /\.edu$/i.test(email);
  
  if (isDisposable || isEdu) {
    score = Math.min(score, 4); // Cap at 4 for student/disposable
  } else if (isCustomDomain) {
    score += 2;
  } else {
    score += 1;
  }

  return Math.min(score, 10);
}

/**
 * Calculate position in waitlist
 */
function calculatePosition(entryId: string): number {
  const db = getDatabase();
  
  // Count entries with higher or equal position that are pending
  const result = db.prepare(`
    SELECT COUNT(*) as count 
    FROM waitlist_entries 
    WHERE status = 'pending' AND (position_boost > 0 OR created_at <= (SELECT created_at FROM waitlist_entries WHERE id = ?))
  `).get(entryId) as { count: number };
  
  return result.count;
}

/**
 * POST /api/waitlist - Submit a waitlist application
 */
waitlist.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      email,
      name,
      whatBuilding,
      projectLink,
      apisUsed,
      referralSource,
      inviteCode,
      referredBy
    } = body;

    // Validate required fields
    if (!email || !whatBuilding) {
      return c.json({ error: 'Email and project description are required' }, 400);
    }

    // Check for disposable emails
    if (/@(temp|throwaway|guerrilla|10minutemail|mailinator)/i.test(email)) {
      return c.json({ 
        error: 'Please use a real email address. Disposable emails are not accepted.' 
      }, 400);
    }

    // Check for student emails
    if (/\.edu$/i.test(email)) {
      return c.json({ 
        error: 'OnHyper is for active builders with live projects. Join us when you\'re ready to ship!',
        isStudent: true
      }, 400);
    }

    const db = getDatabase();

    // Check if email already exists
    const existing = db.prepare('SELECT * FROM waitlist_entries WHERE email = ?').get(email) as WaitlistEntry | undefined;
    if (existing) {
      return c.json({ 
        error: 'This email is already on the waitlist',
        position: existing.position,
        referralCode: existing.referral_code
      }, 409);
    }

    // Check invite code if provided
    let inviteCodeData: InviteCode | null = null;
    let autoApprove = false;
    if (inviteCode) {
      inviteCodeData = db.prepare('SELECT * FROM invite_codes WHERE code = ? AND is_used = 0').get(inviteCode) as InviteCode | undefined || null;
      if (!inviteCodeData) {
        return c.json({ error: 'Invalid or already used invite code' }, 400);
      }
      autoApprove = true;
    }

    // Parse APIs used
    const apisArray = Array.isArray(apisUsed) ? apisUsed : (apisUsed ? apisUsed.split(',') : []);

    // Calculate score
    const autoScore = calculateAutoScore(whatBuilding, projectLink || null, apisArray, email);

    // Determine initial status
    let status: 'pending' | 'approved' = 'pending';
    if (autoApprove || autoScore >= 8) {
      status = 'approved';
    }

    // Look up referrer if provided
    let referrerId: string | null = null;
    let referrerData: WaitlistEntry | null = null;
    if (referredBy) {
      referrerData = db.prepare('SELECT * FROM waitlist_entries WHERE referral_code = ?').get(referredBy) as WaitlistEntry | undefined || null;
      if (referrerData && referrerData.email !== email) {
        referrerId = referrerData.id;
      }
    }

    // Generate IDs and referral code
    const id = randomUUID();
    const referralCode = generateReferralCode();
    const now = new Date().toISOString();

    // Get total count for position
    const countResult = db.prepare('SELECT COUNT(*) as count FROM waitlist_entries').get() as { count: number };
    const initialPosition = countResult.count + 1;

    // Insert entry
    db.prepare(`
      INSERT INTO waitlist_entries (
        id, email, name, referral_code,
        question_what_building, question_project_link, question_apis_used, question_referral_source,
        auto_score, status, position, referral_count, position_boost,
        created_at, updated_at, approved_at, referred_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `).run(
      id,
      email,
      name || null,
      referralCode,
      whatBuilding,
      projectLink || null,
      JSON.stringify(apisArray),
      referralSource || '',
      autoScore,
      status,
      initialPosition,
      now,
      now,
      status === 'approved' ? now : null,
      referrerId
    );

    // Handle invite code usage
    if (inviteCodeData && status === 'approved') {
      db.prepare('UPDATE invite_codes SET is_used = 1, used_by = ?, used_at = ? WHERE id = ?')
        .run(id, now, inviteCodeData.id);
    }

    // Handle referral boost
    let referrerPositionBoost = 0;
    if (referrerData) {
      // Create referral record
      const referralId = randomUUID();
      db.prepare(`
        INSERT INTO waitlist_referrals (id, referrer_id, referral_email, position_boost, created_at)
        VALUES (?, ?, ?, 10, ?)
      `).run(referralId, referrerData.id, email, now);

      // Update referrer stats
      db.prepare(`
        UPDATE waitlist_entries 
        SET referral_count = referral_count + 1, 
            position_boost = position_boost + 10,
            updated_at = ?
        WHERE id = ?
      `).run(now, referrerData.id);

      // Log email notification (would send actual email via Resend)
      console.log(`[EMAIL] Referral boost: ${referrerData.email} jumped 10 positions (position: ${referrerData.position})`);

      referrerPositionBoost = 10;
    }

    // Get final position
    const position = calculatePosition(id);

    // Log welcome email (would send actual email via Resend)
    console.log(`[EMAIL] Welcome to waitlist: ${email} at position ${position} (score: ${autoScore})`);

    return c.json({
      success: true,
      entry: {
        id,
        email,
        referralCode,
        position,
        score: autoScore,
        status
      },
      referrerBoost: referrerPositionBoost > 0
    });

  } catch (error) {
    console.error('Waitlist submission error:', error);
    return c.json({ error: 'Failed to submit application' }, 500);
  }
});

/**
 * GET /api/waitlist/position - Get position in queue
 */
waitlist.get('/position', async (c) => {
  try {
    const email = c.req.query('email');
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const db = getDatabase();
    const entry = db.prepare(`
      SELECT 
        id, email, referral_code, position, referral_count, position_boost, 
        status, auto_score, created_at, approved_at, rejected_at
      FROM waitlist_entries 
      WHERE email = ?
    `).get(email) as WaitlistEntry | undefined;

    if (!entry) {
      return c.json({ error: 'Email not found on waitlist' }, 404);
    }

    // Get queue stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
      FROM waitlist_entries
    `).get() as { pending_count: number; approved_count: number; rejected_count: number };

    return c.json({
      email: entry.email,
      referralCode: entry.referral_code,
      position: entry.position,
      effectivePosition: entry.position ? entry.position - entry.position_boost : null,
      referralCount: entry.referral_count,
      positionBoost: entry.position_boost,
      status: entry.status,
      score: entry.auto_score,
      createdAt: entry.created_at,
      approvedAt: entry.approved_at,
      queueStats: stats
    });

  } catch (error) {
    console.error('Position lookup error:', error);
    return c.json({ error: 'Failed to get position' }, 500);
  }
});

/**
 * POST /api/waitlist/referral - Process a referral
 */
waitlist.post('/referral', async (c) => {
  try {
    const body = await c.req.json();
    const { referrerCode, referralEmail } = body;

    if (!referrerCode || !referralEmail) {
      return c.json({ error: 'Referrer code and referral email are required' }, 400);
    }

    const db = getDatabase();

    // Find referrer
    const referrer = db.prepare('SELECT * FROM waitlist_entries WHERE referral_code = ?')
      .get(referrerCode) as WaitlistEntry | undefined;

    if (!referrer) {
      return c.json({ error: 'Invalid referral code' }, 404);
    }

    // Check if referral already exists
    const existingReferral = db.prepare('SELECT * FROM waitlist_referrals WHERE referrer_id = ? AND referral_email = ?')
      .get(referrer.id, referralEmail) as WaitlistReferral | undefined;

    if (existingReferral) {
      return c.json({ error: 'This referral has already been recorded' }, 409);
    }

    // Check if the referral email is already on waitlist
    const referralEntry = db.prepare('SELECT * FROM waitlist_entries WHERE email = ?')
      .get(referralEmail) as WaitlistEntry | undefined;

    if (referralEntry) {
      // They're already on the list - still give referrer credit
    }

    // Create referral record
    const referralId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO waitlist_referrals (id, referrer_id, referral_email, position_boost, created_at)
      VALUES (?, ?, ?, 10, ?)
    `).run(referralId, referrer.id, referralEmail, now);

    // Update referrer stats
    db.prepare(`
      UPDATE waitlist_entries 
      SET referral_count = referral_count + 1, 
          position_boost = position_boost + 10,
          updated_at = ?
      WHERE id = ?
    `).run(now, referrer.id);

    // Log notification
    console.log(`[EMAIL] Referral earned: ${referrer.email} jumped 10 positions`);

    return c.json({
      success: true,
      referrer: {
        email: referrer.email,
        newReferralCount: referrer.referral_count + 1,
        newPositionBoost: referrer.position_boost + 10
      }
    });

  } catch (error) {
    console.error('Referral processing error:', error);
    return c.json({ error: 'Failed to process referral' }, 500);
  }
});

/**
 * GET /api/waitlist/invite/:code - Validate invite code
 */
waitlist.get('/invite/:code', async (c) => {
  try {
    const code = c.req.param('code');

    const db = getDatabase();
    const invite = db.prepare(`
      SELECT id, code, tier, is_used, created_at, used_at
      FROM invite_codes 
      WHERE code = ?
    `).get(code) as InviteCode | undefined;

    if (!invite) {
      return c.json({ valid: false, error: 'Invite code not found' }, 404);
    }

    if (invite.is_used) {
      return c.json({ 
        valid: false, 
        error: 'This invite code has already been used',
        tier: invite.tier
      }, 400);
    }

    return c.json({
      valid: true,
      tier: invite.tier,
      createdAt: invite.created_at
    });

  } catch (error) {
    console.error('Invite code validation error:', error);
    return c.json({ error: 'Failed to validate invite code' }, 500);
  }
});

/**
 * GET /api/waitlist/stats - Get global waitlist stats
 */
waitlist.get('/stats', async (c) => {
  try {
    const db = getDatabase();

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM waitlist_entries
    `).get() as { total: number; pending: number; approved: number; rejected: number };

    const referralStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(position_boost), 0) as total_boosts
      FROM waitlist_referrals
    `).get() as { count: number; total_boosts: number };

    return c.json({
      total: stats.total,
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected,
      totalReferrals: referralStats.count,
      totalPositionBoosts: referralStats.total_boosts
    });

  } catch (error) {
    console.error('Stats error:', error);
    return c.json({ error: 'Failed to get stats' }, 500);
  }
});

// ============ ADMIN ROUTES ============

/**
 * GET /api/waitlist/admin/pending - List pending applications
 */
waitlist.get('/admin/pending', async (c) => {
  try {
    const db = getDatabase();
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const entries = db.prepare(`
      SELECT 
        id, email, name, referral_code,
        question_what_building, question_project_link, question_apis_used, question_referral_source,
        auto_score, status, position, referral_count, position_boost, created_at
      FROM waitlist_entries 
      WHERE status = 'pending'
      ORDER BY auto_score DESC, created_at ASC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as WaitlistEntry[];

    const countResult = db.prepare('SELECT COUNT(*) as count FROM waitlist_entries WHERE status = \'pending\'').get() as { count: number };

    return c.json({
      entries: entries.map(e => ({
        ...e,
        question_apis_used: JSON.parse(e.question_apis_used || '[]')
      })),
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit)
      }
    });

  } catch (error) {
    console.error('Admin pending list error:', error);
    return c.json({ error: 'Failed to get pending applications' }, 500);
  }
});

/**
 * GET /api/waitlist/admin/all - List all applications
 */
waitlist.get('/admin/all', async (c) => {
  try {
    const db = getDatabase();
    const status = c.req.query('status');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, email, name, referral_code,
        question_what_building, question_project_link, question_apis_used, question_referral_source,
        auto_score, manual_score, final_score, status, position, referral_count, position_boost,
        created_at, approved_at, rejected_at
      FROM waitlist_entries 
    `;
    const params: (string | number)[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const entries = db.prepare(query).all(...params) as WaitlistEntry[];

    const countQuery = status 
      ? 'SELECT COUNT(*) as count FROM waitlist_entries WHERE status = ?'
      : 'SELECT COUNT(*) as count FROM waitlist_entries';
    const countResult = db.prepare(countQuery).get(...(status ? [status] : [])) as { count: number };

    return c.json({
      entries: entries.map(e => ({
        ...e,
        question_apis_used: JSON.parse(e.question_apis_used || '[]')
      })),
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit)
      }
    });

  } catch (error) {
    console.error('Admin list error:', error);
    return c.json({ error: 'Failed to get applications' }, 500);
  }
});

/**
 * POST /api/waitlist/admin/:id/approve - Approve an application
 */
waitlist.post('/admin/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE waitlist_entries 
      SET status = 'approved', approved_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, id);

    if (result.changes === 0) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    // Get the entry for email notification
    const entry = db.prepare('SELECT email FROM waitlist_entries WHERE id = ?').get(id) as { email: string } | undefined;

    if (entry) {
      console.log(`[EMAIL] Application approved: ${entry.email}`);
    }

    return c.json({ success: true, approvedAt: now });

  } catch (error) {
    console.error('Approve error:', error);
    return c.json({ error: 'Failed to approve application' }, 500);
  }
});

/**
 * POST /api/waitlist/admin/:id/reject - Reject an application
 */
waitlist.post('/admin/:id/reject', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE waitlist_entries 
      SET status = 'rejected', rejected_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, id);

    if (result.changes === 0) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    return c.json({ success: true, rejectedAt: now });

  } catch (error) {
    console.error('Reject error:', error);
    return c.json({ error: 'Failed to reject application' }, 500);
  }
});

/**
 * POST /api/waitlist/admin/generate-invites - Generate invite codes
 */
waitlist.post('/admin/generate-invites', async (c) => {
  try {
    const body = await c.req.json();
    const { count = 5, tier = 'access', createdBy = null } = body;

    const db = getDatabase();
    const codes: string[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const id = randomUUID();
      const code = generateInviteCode();

      db.prepare(`
        INSERT INTO invite_codes (id, code, tier, created_by, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, code, tier, createdBy, now);

      codes.push(code);
    }

    return c.json({ success: true, codes, tier, count });

  } catch (error) {
    console.error('Generate invites error:', error);
    return c.json({ error: 'Failed to generate invite codes' }, 500);
  }
});

/**
 * GET /api/waitlist/admin/invites - List invite codes
 */
waitlist.get('/admin/invites', async (c) => {
  try {
    const db = getDatabase();
    const unusedOnly = c.req.query('unused') === 'true';

    let query = 'SELECT * FROM invite_codes';
    if (unusedOnly) {
      query += ' WHERE is_used = 0';
    }
    query += ' ORDER BY created_at DESC';

    const invites = db.prepare(query).all() as InviteCode[];

    return c.json({ invites });

  } catch (error) {
    console.error('List invites error:', error);
    return c.json({ error: 'Failed to list invite codes' }, 500);
  }
});