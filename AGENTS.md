# AGENTS.md

Guidance for coding agents working in this repository.

## Project Snapshot
- Runtime: Node.js `>=20`.
- Language: TypeScript (`strict` mode, ESM).
- API framework: Hono.
- Storage: SQLite (`better-sqlite3`) + LMDB.
- Tests: Vitest (`src/**/*.test.ts`).
- Package manager: npm (`package-lock.json` present).

## Setup and Run
Run from repo root unless noted.

```bash
npm install
cp .env.example .env
npm run dev
```

Default server URL: `http://localhost:3000`.

## Build / Lint / Test

### Build
```bash
npm run build
```
Compiles TypeScript to `dist/`.

### Lint and type checking
No dedicated lint script or ESLint/Biome config is currently in this repo.

Use TypeScript checks:
```bash
npm run build
```

Optional type-check without emitting:
```bash
npx tsc --noEmit
```

### Test suite (all)
```bash
npm test
```

For one-shot non-watch run:
```bash
npm test -- --run
```

### Single test execution (important)
Run one file:
```bash
npm test -- src/lib/encryption.test.ts
```

Run one test name pattern:
```bash
npm test -- -t "should create new settings for user"
```

Run one file plus one test case:
```bash
npm test -- src/routes/settings.test.ts -t "should identify user from valid JWT token"
```

### Extension-specific test
Documented in `extension/README.md`:
```bash
cd extension/lib
node --experimental-vm-modules proxy-map.test.js
```

## High-Value Code Paths
- `src/index.ts`: app bootstrap, middleware, route registration, shutdown.
- `src/config.ts`: env parsing, defaults, security validation, plan tiers.
- `src/routes/*.ts`: route-level request/response logic.
- `src/lib/db.ts`: schema, migrations, DB helpers, audit logging.
- `src/lib/validation.ts`: Zod schemas + middleware.
- `src/lib/users.ts`: auth, JWT, API key and password-reset flows.

## Code Style and Conventions
These are inferred from the codebase and should be preserved.

### Imports and module system
- Use ESM imports/exports.
- Use `.js` extension for local TS imports.
  - Example: `import { config } from '../config.js';`
- Prefer grouping external imports before local imports.
- Prefer named exports for modules.
- Use `import type` when importing types only.

### Formatting
- Indentation: 2 spaces.
- Strings: single quotes.
- Semicolons: yes.
- Keep trailing commas in multiline literals/calls where existing style uses them.
- Prefer readable multiline formatting for large objects and SQL strings.
- Keep existing JSDoc/block-comment style where already present.

### TypeScript usage
- Keep all code compatible with `strict: true`.
- Type public function signatures explicitly.
- Prefer narrow unions for constrained values (`FREE | HOBBY | PRO | BUSINESS`).
- Prefer `unknown` + narrowing over broad `any`.
- If `any` is necessary, keep scope local and minimal.
- Use `as const` for constant maps/config tables.

### Naming
- Functions/variables: `camelCase`.
- Interfaces/types/classes: `PascalCase`.
- True constants: `UPPER_SNAKE_CASE`.
- Route module filenames: lowercase under `src/routes/`.
- Database field names/types often use `snake_case`; preserve existing schema naming.

### Validation and request handling
- Validate request bodies/queries with Zod middleware from `src/lib/validation.ts`.
- Use context keys for validated payloads (`c.get('validatedBody')`, `c.get('validatedQuery')`).
- Return JSON error payloads in consistent shapes (`{ error: string }`, optional `details`).
- Use precise status codes (`400`, `401`, `403`, `404`, `409`, `500`).

### Error handling
- Wrap async route handlers in `try/catch` if operations may throw.
- Do not leak secrets, tokens, or stack internals in client-facing errors.
- For auth/security endpoints, prefer generic failure messages when appropriate.
- Log actionable server-side context with `console.error`.
- Keep production secret checks enforced (`validateProductionSecrets`).

### Database patterns
- Use shared DB access via `initDatabase()` and `getDatabase()`.
- Always parameterize SQL with placeholders (`?`) instead of string interpolation.
- Keep schema changes idempotent (`IF NOT EXISTS`, column-existence checks).
- Follow test DB flow where relevant: `enableTestMode()`, `resetDatabase()`, `initDatabase()`.

### Testing patterns
- Use Vitest APIs: `describe`, `it`, `expect`, `beforeEach`, `afterEach`.
- Keep tests close to related modules as currently done in `src/lib` and `src/routes`.
- Prefer deterministic unit tests; avoid network-dependent behavior unless explicit.
- When fixing bugs, add/update a focused regression test when practical.

## Security and Operational Guardrails
- Never commit plaintext credentials, tokens, or `.env` secrets.
- Production requires strong `ONHYPER_JWT_SECRET` and `ONHYPER_MASTER_KEY`.
- Treat auth/proxy/header behavior changes as security-sensitive.
- Preserve audit logging and rate-limit behavior unless intentionally changing policy.

## Cursor and Copilot Rules
Checked locations:
- `.cursorrules`: not found.
- `.cursor/rules/`: not found.
- `.github/copilot-instructions.md`: not found.

If these files are added later, update this document to incorporate them.
