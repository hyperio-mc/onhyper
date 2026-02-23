# AGENTS.md

Guidance for coding agents working in this repository.

## Project Snapshot
- Runtime: Node.js `>=20` (`package.json` engines).
- Language: TypeScript with `strict: true`, ESM modules (`tsconfig.json`, `type: module`).
- API framework: Hono (`src/index.ts` and route modules).
- Data layer: SQLite (`better-sqlite3`) plus LMDB.
- Test framework: Vitest (`npm test`, tests under `src/**/*.test.ts`).
- Package manager: npm (`package-lock.json` present).

## Setup and Local Run
Run from repository root unless a section says otherwise.

```bash
npm install
cp .env.example .env
npm run dev
```

Default local server: `http://localhost:3000`.

## Build, Lint, and Test Commands

### Build / type-check
```bash
npm run build
```
Compiles TS to `dist/` and catches type errors.

### Lint
There is currently no dedicated lint script (no ESLint/Biome config in repo root).
Use TypeScript checking as the quality gate:

```bash
npm run build
```

Optional no-emit type check:

```bash
npx tsc --noEmit
```

### Tests (all)
```bash
npm test
```

Non-watch one-shot run:

```bash
npm test -- --run
```

### Single test execution (important)
Run one file:

```bash
npm test -- src/lib/encryption.test.ts
```

Run by test name pattern:

```bash
npm test -- -t "should create new settings for user"
```

Run one file + one test name:

```bash
npm test -- src/routes/settings.test.ts -t "should identify user from valid JWT token"
```

### Extension-specific test
From `extension/README.md`:

```bash
cd extension/lib
node --experimental-vm-modules proxy-map.test.js
```

## High-Value Code Paths
- `src/index.ts`: app bootstrap, middleware order, route registration, static serving, global error handler, shutdown.
- `src/config.ts`: environment parsing, defaults, production secret enforcement, plan tiers, proxy endpoint map.
- `src/lib/db.ts`: schema creation, migrations, DB lifecycle, helpers, and test-mode DB controls.
- `src/lib/validation.ts`: Zod schemas and request validation middleware (`validatedBody`, `validatedQuery`).
- `src/lib/users.ts`: user auth, JWT, API key generation/lookup, password-reset flows.
- `src/middleware/auth.ts`: JWT/API key/admin auth and context typing.
- `src/routes/*.ts`: endpoint behavior and response contracts.

## Code Style and Conventions
These conventions are inferred from the current codebase and should be preserved.

### Imports and module system
- Use ESM import/export syntax only.
- Use `.js` extension for local TS imports (e.g. `../lib/db.js`).
- Group external imports before local imports.
- Prefer named exports; use default exports only when already established.
- Use `import type` for type-only imports.

### Formatting
- Indentation: 2 spaces.
- Strings: single quotes.
- Semicolons: required.
- Keep trailing commas in multiline arrays/objects/calls where style already uses them.
- Prefer readable multiline formatting for SQL strings and large objects.
- Preserve existing JSDoc/block-comment style and section dividers when present.

### TypeScript practices
- Keep compatibility with `strict: true`.
- Explicitly type exported/public function signatures.
- Prefer narrow literal unions for constrained domains (plans, statuses, modes).
- Prefer `unknown` plus narrowing instead of broad `any`.
- If `any` is unavoidable, keep it local and minimal.
- Use `as const` for constant config maps/tables.
- When extending Hono context, follow module augmentation style in `src/middleware/auth.ts`.

### Naming conventions
- Variables/functions: `camelCase`.
- Types/interfaces/classes: `PascalCase`.
- True constants: `UPPER_SNAKE_CASE`.
- Route filenames: lowercase in `src/routes/`.
- Preserve DB schema naming (`snake_case` columns, SQL-friendly names).

### Validation and request handling
- Use Zod schemas from `src/lib/validation.ts` for body/query validation.
- Access validated payloads via `c.get('validatedBody')` and `c.get('validatedQuery')`.
- Keep JSON response shapes consistent (`{ error: string }`, optional `details`).
- Use appropriate HTTP status codes (`400`, `401`, `403`, `404`, `409`, `500`, etc.).
- Keep route registration order intentional (public/protected/fallback behavior in `src/index.ts`).

### Error handling
- Wrap throwing async route logic in `try/catch` when needed.
- Do not leak secrets, raw tokens, stack traces, or sensitive internals in responses.
- Prefer generic auth failure messages for security-sensitive endpoints.
- Log actionable server context with `console.error`/`console.warn`.
- Keep production secret validation enabled via `validateProductionSecrets()` at startup.

### Database and persistence patterns
- Use shared DB lifecycle helpers: `initDatabase()`, `getDatabase()`, `closeDatabase()`.
- In tests, use `enableTestMode()` + `resetDatabase()` + `initDatabase()`.
- Parameterize SQL (`?` placeholders); avoid string interpolation in SQL.
- Keep migrations idempotent (`IF NOT EXISTS`, existence checks before `ALTER TABLE`).
- Preserve transaction and audit-log patterns where already implemented.

### Testing conventions
- Use Vitest primitives (`describe`, `it`, `expect`, `beforeEach`, `afterEach`).
- Keep tests near related code (`src/lib/*.test.ts`, `src/routes/*.test.ts`).
- Prefer deterministic tests; avoid external network dependencies unless required.
- For bug fixes, add or update focused regression tests when practical.

## Security and Operational Guardrails
- Never commit secrets, credentials, JWTs, API keys, or `.env` values.
- Treat auth, proxy forwarding, headers, rate limiting, and admin flows as security-sensitive.
- Preserve timing-safe comparisons and admin key behavior in auth middleware.
- Production must set strong `ONHYPER_JWT_SECRET` and `ONHYPER_MASTER_KEY`.
- Do not bypass production secret validation or weaken default safeguards.

## Cursor and Copilot Rules
Checked in this repository:
- `.cursorrules`: not found.
- `.cursor/rules/`: not found.
- `.github/copilot-instructions.md`: not found.

If any of these files are added later, update this AGENTS.md to include and enforce their rules.

## Subdomain-First Architecture

Apps get subdomain URLs by default: `yourapp.onhyper.io`

### Default URL generation
- New apps automatically receive a subdomain based on the app name (slugified)
- If subdomain is taken, fallback adds random suffix (e.g., `myapp-abc123.onhyper.io`)
- Path-based URLs (`/a/{slug}`) exist but are secondary/legacy

### Subdomain claiming
- Subdomains require PRO tier or higher (enforced via feature flags)
- Short subdomains (<6 chars) require BUSINESS tier
- Claim logic in `src/routes/apps.ts` POST `/:id/publish`
- Validation in `src/lib/validation.ts` subdomain schema

## ZIP Publishing Workflow

ZIP file upload is the primary deployment method.

### Upload endpoint
- POST `/api/apps/:id/upload` accepts multipart/form-data with ZIP file
- ZIP is extracted to app storage directory
- Entry point defaults to `index.html` at root

### ZIP structure expectations
```
your-app.zip/
├── index.html        # Required entry point
├── assets/           # Static assets (CSS, JS, images)
├── _next/            # Next.js static export output
└── ...
```

### File handling
- Max ZIP size: 50MB (configurable via `MAX_ZIP_SIZE_MB`)
- Files stored in LMDB under app slug key
- Previous deployment files are replaced atomically

## Next.js Compatibility

Next.js apps require specific configuration for static export.

### Required `next.config.js`
```javascript
module.exports = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,  // Optional but recommended
}
```

### Build command
```bash
npm run build  # Creates out/ directory
cd out && zip -r ../app.zip . && cd ..
```

### Known limitations
- No server-side features (API routes, ISR, SSR)
- Image optimization disabled (`images.unoptimized: true`)
- Dynamic routes must use `generateStaticParams()`
- Runtime config not available (`publicRuntimeConfig`)

## Proxy Endpoints

OnHyper provides proxy endpoints for API forwarding with credential injection.

### Endpoint patterns
| Service | Pattern | Target |
|---------|---------|--------|
| OpenAI | `/proxy/openai/*` | `https://api.openai.com/*` |
| Anthropic | `/proxy/anthropic/*` | `https://api.anthropic.com/*` |
| Scout | `/proxy/scout/*` | `https://api.scoutos.com/*` |
| HyperMicro | `/proxy/hypermicro/*` or `/proxy/micro/*` | `https://api.hyper.io/*` |

### X-App-Slug header
Client apps authenticate via the `X-App-Slug` header:
```http
GET /proxy/openai/v1/chat/completions
X-App-Slug: my-app-slug
Authorization: Bearer sk-xxx  // Optional, injected if missing
```

### Auth header injection
- Route handler: `src/routes/proxy.ts`
- Looks up user secrets by app slug → user ID → secret name
- Injects `Authorization` header from stored credentials
- Headers: `Authorization: Bearer {secret}` or `x-api-key: {secret}`

### Secret naming convention
| Proxy endpoint | Secret name | Header format |
|----------------|-------------|---------------|
| `/proxy/openai/*` | `OPENAI_API_KEY` | `Authorization: Bearer {key}` |
| `/proxy/anthropic/*` | `ANTHROPIC_API_KEY` | `x-api-key: {key}` |
| `/proxy/scout/*` | `SCOUT_API_KEY` | `Authorization: Bearer {key}` |
| `/proxy/hypermicro/*` | `HYPERMICRO_API_KEY` | `Authorization: Bearer {key}` |

## LMDB Storage Patterns

Apps store files in LMDB (Lightning Memory-Mapped Database).

### Key structure
```
file:{appSlug}:{path}     → File content (Buffer)
metadata:{appSlug}        → App metadata (JSON)
```

### Access patterns
```typescript
import { getLMDB, putFile, getFile, deleteFile, listFiles } from './lib/lmdb.js';

// Store a file
await putFile(appSlug, 'index.html', Buffer.from(htmlContent));

// Retrieve a file
const content = await getFile(appSlug, 'index.html');

// List all files for an app
const files = await listFiles(appSlug);

// Delete app storage
await deleteAppFiles(appSlug);
```

### Testing with LMDB
- Tests use in-memory or temp directory for isolation
- LMDB instance created per-test-run via `enableTestMode()`
- Use `resetDatabase()` between tests for clean state

## Testing Conventions

### Run tests
```bash
npm test              # Watch mode (default)
npm test -- --run     # Single run, no watch
npm test -- --coverage  # With coverage report
```

### Test structure
- Tests live alongside source: `src/**/*.test.ts`
- Use Vitest primitives: `describe`, `it`, `expect`, `beforeEach`, `afterEach`
- Isolated test DB via `enableTestMode()` + `resetDatabase()`

### Coverage expectations
- Aim for meaningful coverage on critical paths
- Focus on auth, proxy, secrets, and app lifecycle
- Run coverage before major PRs: `npm test -- --coverage`

### Running specific tests
```bash
# Single test file
npm test -- src/routes/proxy.test.ts

# By test name pattern
npm test -- -t "should forward request to OpenAI"

# Combined
npm test -- src/routes/proxy.test.ts -t "should inject auth header"
```
