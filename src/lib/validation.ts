/**
 * Zod Schema Validation for OnHyper.io
 * 
 * Provides reusable validation schemas and middleware for input validation
 * across all API endpoints.
 * 
 * ## Usage
 * 
 * ### Using validation middleware
 * ```typescript
 * import { validateBody, authSchemas } from '../lib/validation.js';
 * 
 * // Validate request body
 * app.post('/signup', validateBody(authSchemas.signup), async (c) => {
 *   const body = c.get('validatedBody'); // Typed and validated data
 *   // ...
 * });
 * ```
 * 
 * ### Using schemas directly
 * ```typescript
 * import { authSchemas } from '../lib/validation.js';
 * 
 * const result = authSchemas.signup.safeParse(input);
 * if (result.success) {
 *   console.log(result.data.email); // Typed!
 * }
 * ```
 * 
 * @module lib/validation
 */

import { z } from 'zod';
import type { Context, MiddlewareHandler } from 'hono';

// ============================================================================
// Common Validation Patterns
// ============================================================================

/**
 * Email validation schema with sensible constraints
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')
  .transform(email => email.toLowerCase().trim());

/**
 * Password validation schema - matches config requirements
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

/**
 * User name schema (optional on signup)
 */
export const nameSchema = z.string()
  .min(1, 'Name must not be empty')
  .max(100, 'Name must be less than 100 characters')
  .optional();

/**
 * Plan schema (restricted to valid plan values)
 */
export const planSchema = z.enum(['FREE', 'HOBBY', 'PRO', 'BUSINESS']).optional().default('FREE');

/**
 * Source schema for tracking signups
 */
export const sourceSchema = z.string().max(100).optional();

/**
 * UUID schema for resource IDs
 */
export const uuidSchema = z.string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid ID format');

/**
 * Token schema (password reset, etc.)
 */
export const tokenSchema = z.string()
  .min(1, 'Token is required')
  .max(256, 'Invalid token format');

// ============================================================================
// Auth Route Schemas
// ============================================================================

export const authSchemas = {
  /**
   * POST /api/auth/signup
   */
  signup: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
    plan: planSchema,
    source: sourceSchema,
  }),

  /**
   * POST /api/auth/login
   */
  login: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),

  /**
   * PUT /api/auth/password
   */
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),

  /**
   * POST /api/auth/forgot-password
   */
  forgotPassword: z.object({
    email: emailSchema,
  }),

  /**
   * POST /api/auth/reset-password
   */
  resetPassword: z.object({
    token: tokenSchema,
    password: passwordSchema.optional(),
  }),

  /**
   * DELETE /api/auth/account
   */
  deleteAccount: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
};

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Validation error response format
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Format Zod validation errors into a user-friendly format
 */
function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Create a body validation middleware for a given schema
 * 
 * @param schema - Zod schema to validate against
 * @returns Hono middleware that validates body and sets validatedBody
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T): MiddlewareHandler {
  return async (c: Context, next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);
      
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        return c.json({
          error: 'Validation failed',
          details: errors,
        }, 400);
      }
      
      // Store validated data for route handlers
      c.set('validatedBody', result.data);
      await next();
    } catch (error) {
      // Handle JSON parse errors
      if (error instanceof SyntaxError) {
        return c.json({ error: 'Invalid JSON in request body' }, 400);
      }
      throw error;
    }
  };
}

/**
 * Create a query parameter validation middleware for a given schema
 * 
 * @param schema - Zod schema to validate against
 * @returns Hono middleware that validates query params and sets validatedQuery
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T): MiddlewareHandler {
  return async (c: Context, next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);
    
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return c.json({
        error: 'Invalid query parameters',
        details: errors,
      }, 400);
    }
    
    // Store validated data for route handlers
    c.set('validatedQuery', result.data);
    await next();
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type SignupInput = z.infer<typeof authSchemas.signup>;
export type LoginInput = z.infer<typeof authSchemas.login>;
export type ChangePasswordInput = z.infer<typeof authSchemas.changePassword>;
export type ForgotPasswordInput = z.infer<typeof authSchemas.forgotPassword>;
export type ResetPasswordInput = z.infer<typeof authSchemas.resetPassword>;
export type DeleteAccountInput = z.infer<typeof authSchemas.deleteAccount>;