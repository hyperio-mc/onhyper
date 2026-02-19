/**
 * Audit Log Routes for OnHyper.io
 * 
 * Provides endpoints for users to view their audit history.
 * All endpoints require authentication.
 * 
 * ## Endpoints
 * 
 * ### GET /api/audit-logs
 * Get audit logs for the authenticated user.
 * 
 * **Headers:** `Authorization: Bearer <token>`
 * 
 * **Query Parameters:**
 * - `limit` - Number of results (default: 50, max: 200)
 * - `offset` - Number of results to skip (for pagination)
 * - `action` - Filter by action type(s), comma-separated (e.g., `login,app_create`)
 * - `since` - Filter by time period (e.g., `7d`, `24h`, `30d`)
 * 
 * **Response (200):**
 * ```json
 * {
 *   "logs": [
 *     {
 *       "id": 1,
 *       "action": "login",
 *       "resource_type": null,
 *       "resource_id": null,
 *       "details": null,
 *       "created_at": 1708320000000
 *     }
 *   ],
 *   "total": 1,
 *   "limit": 50,
 *   "offset": 0
 * }
 * ```
 * 
 * **Errors:**
 * - 401: Not authenticated
 * 
 * @module routes/audit
 */

import { Hono } from 'hono';
import { getAuthUser } from '../middleware/auth.js';
import { getDatabase, AuditLog } from '../lib/db.js';

const audit = new Hono();

/**
 * Parse time period string into milliseconds ago
 * Supports: Xh (hours), Xd (days), Xw (weeks)
 * Returns null if invalid
 */
function parseTimePeriod(period: string): number | null {
  const match = period.match(/^(\d+)([hdw])$/);
  if (!match) return null;
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000,      // hours to ms
    d: 24 * 60 * 60 * 1000, // days to ms
    w: 7 * 24 * 60 * 60 * 1000, // weeks to ms
  };
  
  return value * multipliers[unit];
}

/**
 * GET /api/audit-logs
 * Get audit logs for the authenticated user with pagination and filtering
 */
audit.get('/', async (c) => {
  const user = getAuthUser(c);
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  // Parse pagination params
  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');
  const actionParam = c.req.query('action');
  const sinceParam = c.req.query('since');
  
  // Validate and clamp limit (default 50, max 200)
  let limit = 50;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 200);
    }
  }
  
  // Validate offset (default 0)
  let offset = 0;
  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }
  
  // Parse action filter (comma-separated)
  const actions = actionParam 
    ? actionParam.split(',').map(a => a.trim()).filter(a => a.length > 0)
    : null;
  
  // Parse since filter
  let sinceTime: number | null = null;
  if (sinceParam) {
    const parsedMs = parseTimePeriod(sinceParam);
    if (parsedMs !== null) {
      sinceTime = Date.now() - parsedMs;
    }
    // If invalid, we just ignore the filter (could also return error)
  }
  
  const db = getDatabase();
  
  // Build query based on filters
  let query = 'SELECT * FROM audit_logs WHERE user_id = ?';
  const params: (string | number)[] = [user.userId];
  
  // Add action filter
  if (actions && actions.length > 0) {
    const placeholders = actions.map(() => '?').join(', ');
    query += ` AND action IN (${placeholders})`;
    params.push(...actions);
  }
  
  // Add time filter
  if (sinceTime !== null) {
    query += ' AND created_at >= ?';
    params.push(sinceTime);
  }
  
  // Get total count (before pagination)
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
  const countResult = db.prepare(countQuery).get(...params) as { count: number };
  const total = countResult.count;
  
  // Add ordering and pagination
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const logs = db.prepare(query).all(...params) as AuditLog[];
  
  return c.json({
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      details: log.details ? JSON.parse(log.details) : null,
      created_at: log.created_at,
    })),
    total,
    limit,
    offset,
  });
});

export { audit };