# WorkOS Authentication Demo for HYPR

A sample HYPR app demonstrating WorkOS SSO authentication through the HYPR proxy.

## Overview

This demo shows how to integrate WorkOS authentication into a HYPR app using:

1. **SSO Login Button** - Initiates WorkOS SSO flow
2. **HYPR Proxy** - Securely calls WorkOS API with stored credentials
3. **User Info Display** - Shows authenticated user details

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Demo App      │────▶│   HYPR Proxy    │────▶│   WorkOS     │
│   (Browser)     │     │   /proxy/auth/  │     │   API        │
└─────────────────┘     └─────────────────┘     └──────────────┘
        │                       │
        │   X-App-Slug header   │   Injects API key
        │                       │   (stored securely)
        ▼                       ▼
   User clicks SSO        HYPR adds auth header
   → Redirects to IdP     → Forwards to WorkOS
```

## Setup Instructions

### 1. Create a WorkOS Account

1. Go to [workos.com](https://workos.com) and sign up for a free account
2. Create a new application in the WorkOS Dashboard
3. Note your **API Key** (starts with `sk_test_`) and **Client ID** (starts with `client_`)

### 2. Configure WorkOS Application

In your WorkOS Dashboard:

1. **Add a Redirect URI**: 
   - For local testing: `http://localhost:3000/auth/callback`
   - For production: `https://your-app.onhyper.io/auth/callback`

2. **Set up an Identity Provider** (for SSO):
   - Go to "SSO" in the sidebar
   - Click "Create Connection"
   - Choose your IdP (Okta, Azure AD, Google Workspace, etc.)
   - Follow the setup wizard
   - Note the **Connection ID** (you'll need this)

3. **Enable Passwordless Auth** (optional):
   - Go to "Passwordless" in the sidebar
   - Enable magic link or passkey authentication

### 3. Add WorkOS Secrets to HYPR

In your HYPR Dashboard (Settings > Secrets), add:

| Secret Name | Value |
|-------------|-------|
| `WORKOS_API_KEY` | `sk_test_xxxxxxx...` |
| `WORKOS_CLIENT_ID` | `client_xxxxxxx...` |

Or via API:
```bash
curl -X POST https://onhyper.io/api/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "WORKOS_API_KEY", "value": "sk_test_xxxxxxx..."}'

curl -X POST https://onhyper.io/api/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "WORKOS_CLIENT_ID", "value": "client_xxxxxxx..."}'
```

### 4. Configure the Demo App

Open `index.html` and update the configuration at the top of the `<script>` section:

```javascript
const CONFIG = {
  // Your HYPR app slug (set when you publish the app)
  appSlug: 'workos-demo',
  
  // Your WorkOS Client ID (safe to include - it's public)
  clientId: 'client_xxxxxxx...',
  
  // Your WorkOS Connection ID for SSO
  connectionId: 'conn_xxxxxxx...',
  
  // Redirect URI (must match what you configured in WorkOS)
  redirectUri: 'https://your-app.onhyper.io/auth/callback'
};
```

### 5. Publish the App to HYPR

```bash
# Create ZIP of the demo
cd samples/workos-demo
zip -r ../../workos-demo.zip .

# Upload to HYPR
curl -X POST https://onhyper.io/api/apps/YOUR_APP_ID/zip \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@../../workos-demo.zip"
```

Or use the HYPR Dashboard:
1. Create a new app
2. Set the slug (e.g., `workos-demo`)
3. Upload the ZIP file
4. Publish

## Usage

### SSO Login Flow

1. User clicks "Sign in with SSO"
2. App redirects to WorkOS authorization URL
3. User authenticates with their Identity Provider (IdP)
4. WorkOS redirects back to your callback URL with an authorization code
5. App exchanges code for user info via HYPR proxy
6. User info is displayed

### Magic Link Login (Alternative)

1. User enters their email
2. App sends magic link request via HYPR proxy
3. User clicks link in email
4. User is authenticated and redirected back

## API Endpoints Used

This demo uses the following WorkOS endpoints through the HYPR proxy:

| Endpoint | Description |
|----------|-------------|
| `GET /proxy/auth/workos/sso/authorize` | Initiate SSO flow |
| `POST /proxy/auth/workos/sso/token` | Exchange code for token |
| `GET /proxy/auth/workos/users/:id` | Get user details |
| `POST /proxy/auth/workos/passwordless/session` | Send magic link |
| `GET /proxy/auth/workos/sessions/:id` | Validate session |

## Security Notes

- **API Key Security**: Your WorkOS API key is stored encrypted in HYPR and never exposed to the browser
- **Client ID**: This is public and safe to include in frontend code
- **Connection ID**: This identifies your SSO connection; also safe to include in frontend code
- **State Parameter**: Always include a random state parameter to prevent CSRF attacks

## Extending the Demo

### Add More Auth Methods

```javascript
// Magic Link Auth
async function sendMagicLink(email) {
  const response = await fetch('/proxy/auth/workos/passwordless/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Slug': CONFIG.appSlug
    },
    body: JSON.stringify({
      email,
      redirect_uri: CONFIG.redirectUri
    })
  });
  return response.json();
}

// Passkey Auth (WebAuthn)
async function startPasskeyAuth() {
  // Use WorkOS passkey endpoints
}
```

### Access Organization Info

```javascript
async function getOrganization(orgId) {
  const response = await fetch(`/proxy/auth/workos/organizations/${orgId}`, {
    headers: { 'X-App-Slug': CONFIG.appSlug }
  });
  return response.json();
}
```

### Directory Sync (SCIM)

```javascript
async function getDirectoryUsers(directoryId) {
  const response = await fetch(`/proxy/auth/workos/directory_users?directory=${directoryId}`, {
    headers: { 'X-App-Slug': CONFIG.appSlug }
  });
  return response.json();
}
```

## Troubleshooting

### "No WORKOS_API_KEY configured"
- Ensure you've added the secret in HYPR Dashboard > Settings > Secrets
- The secret name must be exactly `WORKOS_API_KEY`

### "Invalid redirect_uri"
- Check that the redirect URI in the app matches what's configured in WorkOS Dashboard
- Include the protocol (https://) and any trailing path

### "Connection not found"
- Verify your Connection ID is correct
- Ensure the SSO connection is active in WorkOS Dashboard

### "State mismatch"
- Clear browser storage and try again
- The state parameter is used to prevent CSRF

## WorkOS Pricing

WorkOS offers a generous free tier:
- **1 Million MAU** (Monthly Active Users) free
- **SSO**: $125/month per connection
- **Directory Sync**: $4/user/month (first 1,000 free)

For most B2B apps, the free tier is sufficient until significant scale.

## Resources

- [WorkOS Documentation](https://workos.com/docs)
- [WorkOS SSO Guide](https://workos.com/docs/sso/guide)
- [WorkOS User Management](https://workos.com/docs/user-management)
- [HYPR Proxy Guide](../../PROXY_GUIDE.md)
- [HYPR Auth Design](../../AUTH_DESIGN.md)

## License

MIT