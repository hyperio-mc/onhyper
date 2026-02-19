# Forgot Password Workflow Test Report

**Test Date:** 2026-02-18
**Production URL:** https://onhyper.io
**Tester:** OpenClaw Automated Testing

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Forgot Password UI | ✅ Pass | Page loads correctly, shows success message |
| Form Validation (Client) | ❌ **FAIL** | No client-side validation for email format |
| API - Valid Email | ✅ Pass | Returns expected success message |
| API - Invalid Email Format | ❌ **FAIL** | Accepts invalid email format (no backend validation) |
| API - Missing Email | ✅ Pass | Returns "Email is required" error |
| Reset Password UI (No Token) | ⚠️ Partial | Shows error BUT form still visible |
| Reset Password API | ✅ Pass | Properly validates tokens |
| Login Page Integration | ✅ Pass | "Forgot password?" link works |

---

## Detailed Findings

### 1. Forgot Password Page UI

**URL:** https://onhyper.io/#/forgot-password

**✅ What Works:**
- Page loads correctly
- Email input field with placeholder
- "Send Reset Link" button
- "Remember your password? Login" link
- Success message shown after submission: "Check Your Email - If an account with that email exists, you'll receive a password reset link shortly."

**❌ Issues Found:**
- **No client-side form validation** - can submit with empty email and invalid email format
- No HTML5 email validation on input field
- No error messages displayed for invalid input

### 2. API Endpoint Tests

**Endpoint:** `POST /api/auth/forgot-password`

| Test Case | Request | Response | Status |
|-----------|---------|----------|--------|
| Valid email format | `{"email":"test@example.com"}` | `{"success":true,"message":"..."}` | ✅ Pass |
| Invalid email format | `{"email":"invalid-email"}` | `{"success":true,"message":"..."}` | ❌ **FAIL** |
| Missing email | `{}` | `{"error":"Email is required"}` (400) | ✅ Pass |

**🐛 Critical Bug: Backend doesn't validate email format**
- The API accepts `"invalid-email"` as a valid email
- This means emails could be sent to invalid addresses
- Code review shows `forgot-password` endpoint only checks if email exists, not format

**Expected behavior:** Should validate email format before processing

### 3. Reset Password Page UI

**URL:** https://onhyper.io/#/reset-password

**What Works:**
- Shows "Invalid Link" error when accessed without token
- Error message: "This password reset link is invalid. Please request a new one."

**⚠️ UI/UX Issue:**
- The password reset form is still visible below the error message
- Users can fill in passwords even though the token is invalid
- This is confusing - the form should be hidden when token is invalid
- Submitting the form does nothing (good), but UI doesn't reflect this

**Recommendation:** Hide the form when token is invalid/expired, show only the error message and "Back to Login" link.

### 4. Login Page Integration

**URL:** https://onhyper.io/#/login

**✅ What Works:**
- "Forgot password?" link is present
- Links to `#/forgot-password`
- Link navigates correctly

### 5. API Endpoint Tests - Reset Password

**Endpoint:** `POST /api/auth/reset-password`

| Test Case | Request | Response | Status |
|-----------|---------|----------|--------|
| Invalid token | `{"token":"invalid-token-12345","password":"NewPass123!"}` | `{"error":"Invalid or expired reset token"} (400)` | ✅ Pass |
| Empty token | `{"token":"","password":"NewPass123!"}` | `{"error":"Token and new password are required"} (400)` | ✅ Pass |
| Missing token | `{"password":"NewPass123!"}` | `{"error":"Token and new password are required"} (400)` | ✅ Pass |

**API validation is correct** - properly rejects invalid/missing tokens.

### 6. Full Flow Test

**Could not complete** - Production database not accessible for creating test tokens.

**Code Review Findings:**
- Reset tokens are 64-character hex strings (secure)
- Tokens expire after 1 hour
- Tokens are single-use (deleted after password reset)
- Token is stored in `password_resets` table with user_id reference

---

## Security Assessment

### ✅ Good Practices
1. **Email enumeration prevention** - Always returns success message whether email exists or not
2. **Token security** - 64-char hex tokens, cryptographically random
3. **Token expiration** - 1 hour expiry
4. **Single-use tokens** - Deleted after successful password reset
5. **Rate limiting** - `strictRateLimit` middleware applied

### ❌ Security Issues
1. **No email format validation on backend** - Could trigger emails to invalid addresses
2. **No client-side validation** - Poor UX, users don't know they entered invalid email

---

## Console Errors

Found CORS error on forgot-password page:
```
Access to script at 'https://us-assets.i.posthog.com/array.min.js' from origin 'https://onhyper.io' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This is a PostHog analytics script issue - not critical but should be fixed.

---

## Recommendations

### High Priority
1. **Add email format validation** to `/api/auth/forgot-password` endpoint:
   ```typescript
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
     return c.json({ error: 'Invalid email format' }, 400);
   }
   ```

2. **Hide reset form when token is invalid** - Only show error message and "Back to Login" link

### Medium Priority
3. **Add client-side email validation** - Use HTML5 `type="email"` and/or JavaScript validation
4. **Fix PostHog CORS issue** - Update PostHog script URL or configuration

### Low Priority
5. **Add loading state** to "Send Reset Link" button during API call
6. **Add rate limiting feedback** - Show message if user is rate limited

---

## Test Artifacts

- Screenshot: Forgot Password Page - `MEDIA:/Users/mastercontrol/.openclaw/media/browser/9ce53f08-df16-40b0-8a02-ddca13516a4e.png`
- Screenshot: Reset Password Page (no token) - `MEDIA:/Users/mastercontrol/.openclaw/media/browser/658c8640-600d-4bbf-a48f-04e707d5b337.png`

---

## Code References

**Backend Code:**
- `/src/routes/auth.ts` - Forgot password and reset password endpoints
- `/src/lib/users.ts` - `createPasswordResetToken`, `validatePasswordResetToken`, `resetUserPassword`
- `/src/lib/db.ts` - `password_resets` table schema

**Bug Location:**
- `src/routes/auth.ts` line ~260 - Missing email format validation in `/forgot-password` endpoint

---

## Conclusion

The forgot password workflow is **functional but has validation gaps**:
- ✅ Core security (token generation, expiration, single-use) is solid
- ✅ Email enumeration prevention is correctly implemented
- ❌ Backend should validate email format before processing
- ❌ Client-side validation is missing
- ⚠️ Reset password UI should hide form when token is invalid

**Overall Status: NEEDS FIXES** - The core flow works, but input validation should be improved.