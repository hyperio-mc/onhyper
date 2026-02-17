# Secure Key Sharing - Feature Design

## Problem Statement

Non-technical users cannot safely receive API keys from technical users. Current methods are insecure:
- Sending keys in plain text (email, DM) - visible to intermediaries
- Sharing credentials files - no encryption
- Screen sharing passwords - visible in recordings
- No audit trail or access control

## Proposed Solution: E2E Encrypted Key Sharing

A browser extension feature that enables secure, end-to-end encrypted key transfer using hybrid encryption.

### User Story

> As an **enterprise developer**, I want to securely share API credentials with my **non-technical stakeholders**, so they can use AI-powered tools without exposing secrets in transit or requiring key management expertise.

### Flow Comparison

| Method | Security | Non-Tech Friendly | Audit Trail |
|--------|----------|-------------------|--------------|
| Plain text email | ❌ None | ✅ Yes | ❌ No |
| Password managers | ⚠️ Shared secrets | ⚠️ Account needed | ❌ No |
| **OnHyper Key Share** | ✅ E2E encrypted | ✅ One-click import | ✅ Built-in |

## Technical Design

### Hybrid Encryption Scheme

```
Sender                                Recipient
───────                               ─────────
API Keys                              
    │                                 
    ▼                                 
Random Code (32 bytes)                
    │                                 
    ├──► Symmetric Encrypt (AES-256-GCM)
    │    │                            
    │    ▼                            
    │   Encrypted Keys                
    │                                 
    ▼                                 
Recipient's Public Key                
    │                                 
    ├──► Asymmetric Encrypt (RSA-OAEP)
    │    │                            
    │    ▼                            
    │   Encrypted Code                
    │                                 
    ▼                                 
Bundle JSON                           
    │                                 
    └──── Send via any channel ─────►  Import Bundle
                                       │
                                       ▼
                                      Private Key
                                       │
                                       ▼
                                      Decrypt Code
                                       │
                                       ▼
                                      Decrypt Keys ✅
```

### Bundle Format

```json
{
  "version": "1.0.0",
  "type": "onhyper-key-share",
  "sender": {
    "name": "Optional Sender Name",
    "email": "sender@example.com",
    "timestamp": "2026-02-17T03:30:00Z"
  },
  "recipient": {
    "method": "public-key",
    "fingerprint": "SHA-256 of public key (first 8 chars shown)"
  },
  "encryption": {
    "algorithm": "AES-256-GCM",
    "keyWrap": "RSA-OAEP-SHA-256"
  },
  "payload": {
    "encryptedCode": "base64...",
    "codeIV": "base64...",
    "encryptedKeys": {
      "openai": {
        "iv": "base64...",
        "ciphertext": "base64...",
        "keyHash": "sha256:abcd1234"
      },
      "anthropic": { ... }
    }
  },
  "metadata": {
    "keyCount": 2,
    "providers": ["openai", "anthropic"],
    "expiresAt": "2026-03-17T03:30:00Z"
  }
}
```

### Key Distribution Options

| Option | Discovery | Setup | Best For |
|--------|-----------|-------|----------|
| **A: Extension-generated** | None (manual share) | 1-click | All users |
| **B: GitHub Gist** | `gist.github.com/user` | Account needed | Devs |
| **C: GitHub SSH keys** | `github.com/user.keys` | SSH setup | Power users |
| **D: DNS TXT record** | `user._onhyper.domain` | Domain access | Enterprise |

**Recommended default: Option A** (works for everyone, no external dependency)

### Security Properties

| Property | Implementation |
|----------|----------------|
| **Confidentiality** | AES-256-GCM for keys |
| **Forward Secrecy** | Random code per share |
| **Authentication** | Recipient fingerprint verification |
| **Integrity** | GCM authentication tag |
| **Forward Secure** | Private key in extension only |
| **No Server Trust** | All crypto client-side |
| **Channel Independent** | Works over any transport |

## Implementation Plan

### Phase 6.1: RSA Keypair Generation
- Generate RSA-OAEP 2048-bit keypair
- Store private key in IndexedDB (encrypted with user password)
- Export public key as JSON/JWK
- Fingerprint calculation (SHA-256, show first 8 chars)

**Tests**: 15 tests (key generation, storage, export, fingerprint)

### Phase 6.2: Key Wrapping Library
- `wrapKeysWithPassword(keys, recipientPublicKey)` → bundle
- `unwrapKeys(bundle, privateKey)` → keys
- Code generation (32 random bytes)
- Bundle serialization/deserialization

**Tests**: 25 tests (wrap/unwrap, edge cases, tamper detection)

### Phase 6.3: GitHub Integration (Optional)
- Fetch public keys from `api.github.com/users/:username/keys`
- Convert OpenSSH format to WebCrypto JWK
- Key discovery via Gist (`gist.github.com/:user`)

**Tests**: 10 tests (API fetch, key conversion, caching)

### Phase 6.4: Export/Import UI
- "Share Keys" button in popup
- Select recipient method (clipboard, file, GitHub user)
- Select which keys to share
- Generate and download bundle
- "Import Keys" button (file or paste)
- Verify recipient fingerprint match
- Import and store keys

**Tests**: 15 tests (UI interactions, error states)

### Phase 6.5: Enterprise Features (Future)
- Bundle expiration dates
- Revocation lists
- Audit logging
- Key rotation workflows

## Use Cases

### Use Case 1: Developer → Stakeholder

```
Dev (Alice)                    Stakeholder (Bob)
────────────                   ────────────────
1. Configures extension
   with OpenAI key
2. Clicks "Share Keys"
3. Enters Bob's email
4. Downloads bundle
                               5. Receives bundle (Slack/email)
                               6. Opens extension
                               7. Clicks "Import"
                               8. Uploads bundle
                               9. Keys imported! ✅
                               10. Tests app locally
```

### Use Case 2: Enterprise Onboarding

```
IT Admin                       New Employee
────────                       ────────────
1. Generates keys for employee
2. Creates share bundle
3. Sends via secure channel
                               4. Receives bundle
                               5. Imports on first day
                               6. Ready to work ✅
```

### Use Case 3: Agency → Client Handoff

```
Agency Dev                     Client
──────────                     ──────
1. Builds AI app for client
2. Configures with client's keys
3. Shares bundle at handoff
                               4. Imports bundle
                               5. Takes ownership
                               6. No key exposure ✅
```

## Market Differentiation

| Feature | OnHyper | 1Password | LastPass | Manual |
|---------|---------|-----------|----------|--------|
| E2E Encrypted | ✅ | ✅ | ⚠️ | Varies |
| No Account Needed | ✅ | ❌ | ❌ | ✅ |
| Zero Knowledge | ✅ | ✅ | ⚠️ | Varies |
| Non-Tech Friendly | ✅ | ⚠️ | ⚠️ | ❌ |
| Self-Contained | ✅ | ❌ | ❌ | ✅ |
| Free | ✅ | ❌ | ❌ | ✅ |

## Pitch to Pate Bryant (Code and Trust)

> Hey Pate,
>
> You asked about self-hosting OnHyper. While the platform itself is currently hosted-only, I have a solution that might work for your use case:
>
> **Secure Key Sharing for Non-Technical Users**
>
> What if you could:
> 1. Set up API keys in your browser
> 2. Export them in an encrypted bundle
> 3. Send that bundle to your non-technical stakeholders
> 4. They import it with one click - keys unlocked
>
> The keys are end-to-end encrypted. Even if someone intercepts the bundle, they can't read it. Only the intended recipient with their browser extension can decrypt.
>
> This means:
> - Your stakeholders don't need to manage keys
> - Keys never appear in emails/Slack
> - No password manager account needed
> - Works with any transport (email, DM, carrier pigeon)
>
> Would this solve the "how do I get keys to non-technical users" problem? If so, I can prioritize this feature for the extension.

## Success Metrics

| Metric | Target |
|--------|--------|
| Bundle creation time | < 1 second |
| Bundle import time | < 2 seconds |
| Bundle size (3 keys) | < 2KB |
| Encryption overhead | < 100ms |
| Test coverage | 70+ tests |
| User satisfaction | "Dead simple" |

---

**Status**: Ready for implementation
**Estimated Effort**: 2-3 hours (with parallel agents)
**Dependencies**: Existing extension crypto (ext-1.3 complete)
**Blocking**: None