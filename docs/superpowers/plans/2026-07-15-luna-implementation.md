# Luna AI Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, single-user Chinese AI companion web app with persistent streaming chat, context compression, long-term memory, and MiniMax speech on Cloudflare Pages.

**Architecture:** A Vite React SPA and same-origin Cloudflare Pages Functions share strict TypeScript DTOs and Zod schemas. HTTP routes delegate to bounded services; services depend on D1 repositories and injectable DeepSeek/MiniMax clients so behavior can be tested without paid API calls.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, React Router, Zod, Cloudflare Pages Functions, D1, Vitest, React Testing Library, Miniflare, Playwright, ESLint.

---

## File map

- `src/app/`: router, providers, responsive shell, compact navigation rail.
- `src/features/auth/`: login screen and session bootstrap.
- `src/features/chat/`: conversations, messages, streaming composer, message actions.
- `src/features/memories/`: memory management UI.
- `src/features/settings/`: theme, persona display, voice settings and preview.
- `src/features/usage/`: quota view.
- `src/lib/`: typed API client, SSE parser, audio lifecycle/cache, browser preferences.
- `functions/api/`: thin Pages Functions route adapters.
- `functions/_middleware.ts`: request ID, security headers and authentication context.
- `functions/_lib/clients/`: DeepSeek and MiniMax protocol clients.
- `functions/_lib/repositories/`: all D1 SQL and row mapping.
- `functions/_lib/services/`: auth, quotas, conversations, context, chat, memory and speech.
- `shared/`: DTOs, schemas and common error codes.
- `config/`: server-safe runtime constants and editable Luna persona prompt.
- `migrations/`: ordered D1 schema changes.
- `tests/`: Pages Functions integration and shared test utilities.
- `e2e/`: Playwright desktop/mobile journeys.

### Task 1: Bootstrap strict full-stack tooling and secret boundaries

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.worker.json`
- Create: `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, `wrangler.toml`
- Create: `.dev.vars.example`, `scripts/check-secrets.mjs`, `shared/env.ts`, `shared/env.test.ts`
- Modify: `.gitignore`

- [ ] Generate the Vite React TypeScript template in the repository root, remove demo assets, and install runtime/test dependencies.
- [ ] Write `shared/env.test.ts` asserting missing `APP_PASSWORD`, short `SESSION_SECRET`, and invalid numeric limits are rejected.
- [ ] Run `npm test -- shared/env.test.ts` and confirm failure because `parseEnv` does not exist.
- [ ] Implement `parseEnv` with Zod; expose only server variables and require a 32-character `SESSION_SECRET`.

```ts
export const parseEnv = (value: unknown) => z.object({
  DEEPSEEK_API_KEY: z.string().min(1), MINIMAX_API_KEY: z.string().min(1),
  APP_PASSWORD: z.string().min(8), SESSION_SECRET: z.string().min(32),
  DB: z.custom<D1Database>(), ENVIRONMENT: z.enum(['development', 'test', 'production']).default('development'),
}).parse(value)
```

- [ ] Add `check-secrets.mjs` to scan tracked source text for `sk-` credentials while excluding examples, lockfiles and `.git`; make `npm run check:secrets` fail on a match.
- [ ] Run `npm test -- shared/env.test.ts`, `npm run typecheck`, and `npm run check:secrets`; expect all to pass.
- [ ] Commit: `chore: bootstrap Luna full-stack tooling`.

### Task 2: Add configuration and editable Luna persona

**Files:**
- Create: `config/models.ts`, `config/limits.ts`, `config/persona.ts`
- Create: `config/config.test.ts`

- [ ] Test that the chat model is `deepseek-v4-flash`, speech model is `speech-2.8-turbo`, recent message count is within 20–30, and persona text includes identity transparency and anti-dependency rules.
- [ ] Run the test and confirm it fails because config modules are absent.
- [ ] Implement immutable configuration objects: DeepSeek base URL `/chat/completions`, MiniMax `/v1/t2a_v2` and `/v1/get_voice`, 24 recent messages, 12,000-token compression threshold, 4,000-character input limit, per-minute and daily quotas.
- [ ] Implement a single exported Chinese `LUNA_PERSONA` prompt covering the required tone, variable response length, no human impersonation, no coercive dependency, and no repeated-question behavior.
- [ ] Run `npm test -- config/config.test.ts`; expect pass.
- [ ] Commit: `feat: centralize Luna model and persona configuration`.

### Task 3: Create the D1 schema and repository layer

**Files:**
- Create: `migrations/0001_initial.sql`
- Create: `functions/_lib/repositories/{conversations,messages,summaries,memories,relationship,sessions,usage,rate-limits}.ts`
- Create: `functions/_lib/repositories/types.ts`, `tests/repositories.test.ts`, `tests/helpers/d1.ts`

- [ ] Write repository integration tests for conversation/message creation and deletion cascade, summary upsert coverage, memory edit/enable/delete/clear, single relationship row, session expiry, daily usage increments and rate windows.
- [ ] Run `npm test -- tests/repositories.test.ts`; confirm failure before migrations/repositories exist.
- [ ] Add all required tables plus `sessions`, `usage_daily`, `rate_limits`; add foreign keys and indexes on conversation ordering, message ordering, active memories and expiry fields.
- [ ] Implement focused repositories that accept `D1Database`; keep every SQL statement inside these files and map `0/1` to booleans at the boundary.
- [ ] Apply the migration to a disposable Miniflare D1 database and run the repository tests; expect pass.
- [ ] Commit: `feat: add D1 schema and repositories`.

### Task 4: Implement authentication, security headers, rate limits and quotas

**Files:**
- Create: `functions/_lib/services/auth.ts`, `functions/_lib/services/guard.ts`, `functions/_lib/http.ts`
- Create: `functions/api/auth/login.ts`, `functions/api/auth/logout.ts`, `functions/api/auth/session.ts`
- Create: `functions/_middleware.ts`, `tests/auth.integration.test.ts`

- [ ] Test wrong-password rejection, constant external error shape, signed HttpOnly/Secure/SameSite=Strict Cookie, logout invalidation, unauthenticated protected-route rejection, login rate limiting and daily quota exhaustion.
- [ ] Run the auth integration test and confirm expected route-not-found failures.
- [ ] Implement SHA-256 password comparison with `crypto.subtle.timingSafeEqual` equivalent byte-loop fallback, random 256-bit session IDs, HMAC-SHA-256 Cookie signatures, hashed session persistence and seven-day expiry.
- [ ] Add a route guard used by every `/api` route except `/api/auth/login`; attach a request ID and security headers (`CSP`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- [ ] Implement D1-backed fixed-window rate limits and transactional best-effort daily usage checks before paid calls.
- [ ] Run `npm test -- tests/auth.integration.test.ts`; expect pass with no secret values in snapshots.
- [ ] Commit: `feat: secure API access for one user`.

### Task 5: Build conversation and message CRUD APIs

**Files:**
- Create: `shared/chat.ts`
- Create: `functions/_lib/services/conversations.ts`
- Create: `functions/api/conversations/index.ts`, `functions/api/conversations/[id].ts`
- Create: `functions/api/conversations/[id]/messages/[messageId].ts`
- Create: `tests/conversations.integration.test.ts`

- [ ] Define and test Zod schemas for create, list, detail, delete-message and delete-conversation inputs/responses; reject empty or overlong content.
- [ ] Write integration tests for newest-first history, stable message order, generated title from the first user message, page refresh persistence, single-message deletion and full conversation deletion.
- [ ] Run tests and confirm route failures.
- [ ] Implement thin route handlers and a conversation service that owns title truncation and timestamps while delegating SQL to repositories.
- [ ] Run `npm test -- tests/conversations.integration.test.ts`; expect pass.
- [ ] Commit: `feat: persist conversations and messages`.

### Task 6: Assemble bounded context and stream DeepSeek chat

**Files:**
- Create: `functions/_lib/clients/deepseek.ts`, `functions/_lib/services/context.ts`, `functions/_lib/services/chat.ts`
- Create: `functions/api/chat.ts`, `shared/stream.ts`
- Create: `functions/_lib/services/context.test.ts`, `tests/chat.integration.test.ts`

- [ ] Test exact context order, active/relevant memory selection, summary inclusion, 24-message tail, no duplicate current input, abort propagation, upstream error mapping and incremental SSE framing.
- [ ] Run the tests and confirm missing-module failures.
- [ ] Implement a DeepSeek client accepting injected `fetch`, sending `model: 'deepseek-v4-flash'`, `stream: true`, non-thinking parameters and an AbortSignal; parse only `data:` frames and `[DONE]`.
- [ ] Implement context selection with deterministic token estimate `Math.ceil(content.length / 2)` for Chinese-heavy text and keyword-overlap memory ranking.
- [ ] Implement `/api/chat` to validate/guard, persist the user message, stream `meta`, `delta`, `done` or `error` SSE events, persist non-empty assistant output and account estimated usage.
- [ ] Run focused tests; expect pass, then run the full suite.
- [ ] Commit: `feat: stream bounded DeepSeek conversations`.

### Task 7: Add structured summaries and long-term memories

**Files:**
- Create: `shared/memory.ts`, `functions/_lib/services/summarization.ts`, `functions/_lib/services/memory-extraction.ts`
- Create: `functions/api/memories/index.ts`, `functions/api/memories/[id].ts`, `functions/api/memories/clear.ts`
- Create: `functions/_lib/services/summarization.test.ts`, `functions/_lib/services/memory-extraction.test.ts`, `tests/memories.integration.test.ts`

- [ ] Test compression threshold behavior, preservation of the recent window, structured summary schema, coverage advancement, extraction rejection for guesses/temporary/sensitive facts, normalized duplicate suppression, and every memory management action.
- [ ] Run tests and confirm failures before implementation.
- [ ] Implement strict structured-output prompts and Zod parsing; on invalid model output return a non-critical result without corrupting summaries or memories.
- [ ] Trigger summary/extraction from `ctx.waitUntil` after a completed reply; serialize per-conversation compression by rechecking the latest coverage before writing.
- [ ] Implement authenticated memory CRUD/clear routes and run focused/full tests; expect pass.
- [ ] Commit: `feat: compress context and manage long-term memories`.

### Task 8: Build the responsive app shell and authentication UI

**Files:**
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/AppShell.tsx`, `src/app/app.css`
- Create: `src/features/auth/LoginPage.tsx`, `src/lib/api.ts`, `src/lib/preferences.ts`
- Create: `src/app/AppShell.test.tsx`, `src/features/auth/LoginPage.test.tsx`

- [ ] Test unauthenticated login rendering, error/loading states, successful session transition, B-layout compact icon rail, history drawer behavior, mobile drawer and persisted light/dark/system theme.
- [ ] Run component tests and confirm missing-component failures.
- [ ] Implement the low-saturation blue-violet visual tokens, high-contrast message surfaces, compact rail, safe-area spacing and reduced-motion rules with Tailwind utilities plus a small CSS token file.
- [ ] Implement session bootstrap and login against typed API helpers; never persist passwords or auth tokens in browser storage.
- [ ] Run component tests and `npm run build`; expect pass.
- [ ] Commit: `feat: add secure responsive Luna shell`.

### Task 9: Implement the complete chat experience

**Files:**
- Create: `src/features/chat/{ChatPage,ConversationDrawer,MessageList,MessageBubble,Composer}.tsx`
- Create: `src/features/chat/useChat.ts`, `src/lib/sse.ts`
- Create: `src/features/chat/chat.test.tsx`, `src/lib/sse.test.ts`

- [ ] Test Enter send, Shift+Enter newline, sending/generating indicators, incremental deltas, stop generation, retry failed send, regenerate last response, copy, delete, new conversation, history switching and reload hydration.
- [ ] Run focused tests and confirm failures.
- [ ] Implement a reducer/state machine with `idle | sending | streaming | error`, one AbortController per generation and reconciled server IDs from SSE metadata.
- [ ] Implement optimistic user messages that remain visibly retryable on error; disable conflicting mutations during streaming; auto-scroll only when the reader is already near the bottom.
- [ ] Run focused tests, full tests and build; expect pass.
- [ ] Commit: `feat: deliver persistent streaming chat UI`.

### Task 10: Implement MiniMax voices, speech synthesis and browser audio lifecycle

**Files:**
- Create: `shared/speech.ts`, `functions/_lib/clients/minimax.ts`, `functions/_lib/services/speech.ts`
- Create: `functions/api/voices.ts`, `functions/api/tts.ts`
- Create: `src/features/settings/VoiceSettings.tsx`, `src/lib/speechText.ts`, `src/lib/audioController.ts`
- Create: `functions/_lib/services/speech.test.ts`, `src/lib/speechText.test.ts`, `src/lib/audioController.test.ts`

- [ ] Test dynamic `/v1/get_voice` mapping/ranking, speed/pitch/volume bounds, Markdown/code/URL preprocessing, natural text chunks, cache-key stability, one-audio-at-a-time behavior, pause/replay, resource cleanup and TTS failure isolation.
- [ ] Run tests and confirm failures.
- [ ] Implement MiniMax Bearer-auth clients for `/v1/get_voice` and `/v1/t2a_v2`, defaulting to `speech-2.8-turbo`, speed `0.92`, pitch `-1`, volume `1`, calm emotion and MP3 URL/hex response normalization.
- [ ] Implement authenticated voice/TTS routes with stricter rate/quota checks and no raw upstream error forwarding.
- [ ] Implement Cache API storage keyed by SHA-256 of normalized text and voice settings; request chunks sequentially, stop the previous audio before playback and revoke object URLs on switch/delete/unmount.
- [ ] Add play/pause/replay below assistant messages plus auto-read; confirm closing auto-read causes zero automatic TTS requests.
- [ ] Run focused/full tests and build; expect pass.
- [ ] Commit: `feat: add safe MiniMax voice playback`.

### Task 11: Finish memory, persona/voice settings and usage screens

**Files:**
- Create: `src/features/memories/MemoryPage.tsx`
- Create: `src/features/settings/SettingsPage.tsx`
- Create: `src/features/usage/UsagePage.tsx`, `functions/api/usage.ts`
- Create: `src/features/memories/MemoryPage.test.tsx`, `src/features/settings/SettingsPage.test.tsx`, `src/features/usage/UsagePage.test.tsx`

- [ ] Test memory list/edit/delete/toggle/clear confirmation, voice preview/settings/reset, read-only persona summary, and daily counts/token budget progress.
- [ ] Run tests and confirm component failures.
- [ ] Implement accessible forms, optimistic updates with rollback, destructive confirmations and loading/empty/error states; persist voice preferences locally without secrets.
- [ ] Add the authenticated usage endpoint and quota progress view.
- [ ] Run focused/full tests and build; expect pass.
- [ ] Commit: `feat: complete Luna management screens`.

### Task 12: Verify end-to-end behavior, documentation and deployment readiness

**Files:**
- Create: `e2e/luna.spec.ts`, `.github/workflows/ci.yml`, `README.md`
- Modify: `package.json`, `wrangler.toml`

- [ ] Write Playwright tests for login, new streamed conversation, refresh/history restore, stop/regenerate, theme change, memory management, voice failure isolation and mobile composer safe-area behavior; fail on console errors.
- [ ] Run Playwright against Wrangler with deterministic local upstream fixtures; fix every product defect via a new failing regression test before code changes.
- [ ] Document prerequisites, local secret creation, generated local login password retrieval, D1 create/migrate commands, Pages secrets, Pages deployment, GitHub integration, cost controls, backups and key rotation.
- [ ] Add CI jobs for install, typecheck, lint, unit/integration tests, build and secret scan; do not run paid smoke tests in CI.
- [ ] Run `npm run check:secrets`, `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run build`, and `npm run test:e2e`; all must exit 0 with no browser console errors.
- [ ] Run one opt-in real-API smoke test for a short DeepSeek response, voice list and short TTS sample; record upstream account/permission failures without exposing responses or keys.
- [ ] Commit: `docs: prepare Luna for Cloudflare deployment`.

## Execution checkpoints

After Tasks 1–5, run the local app and report Phase 1 behavior. After Tasks 6–7, report D1/history/compression/memory. After Tasks 8–10, report the finished UI and speech. After Tasks 11–12, provide final verification evidence and remaining external deployment steps. Each discovered defect receives a failing regression test before its fix.
