# Hybrid AI Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Luna as a reusable, public, local-first AI companion with customizable identity, optional cloud providers, transparent long-term memory, and user-supplied credentials.

**Architecture:** Keep the existing React UI and Pages Functions API. Run the same Functions locally through Wrangler/Miniflare for local mode, using local D1 state and an Ollama/llama.cpp-compatible chat endpoint; run them on Cloudflare with DeepSeek and D1 for cloud mode. Inject profile, model, speech, and memory providers behind shared interfaces so the frontend contract remains stable.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Cloudflare Pages Functions, Wrangler/Miniflare, D1/SQLite, Zod, Vitest, Playwright, Ollama or llama.cpp, optional MiniMax TTS.

---

## Stage Reports

At the end of every stage, create `docs/reports/YYYY-MM-DD-stage-N-<name>.md` with:

```markdown
# Stage N Report: <name>

## Completed
- Exact user-visible and engineering changes.

## Verification
- Command, exit status, passed/skipped/failed counts.

## GitHub
- Branch, commit, push or PR state.

## Remaining
- Work required by later stages.

## Risks
- Known limitations or decisions requiring future attention.
```

Chat handoff after each stage must summarize only those five headings and link the report.

## Stage 1 — Public Foundation and Companion Profile

### Task 1: Add companion profile schema and D1 migration

**Files:**
- Create: `shared/companion.ts`
- Create: `shared/companion.test.ts`
- Create: `migrations/0002_companion_profile.sql`
- Modify: `functions/_lib/repositories/types.ts`

- [ ] **Step 1: Write failing profile schema tests**

```ts
import { describe, expect, it } from 'vitest'
import { companionProfileInputSchema, DEFAULT_COMPANION_PROFILE } from './companion'

describe('companion profile', () => {
  it('accepts a custom relationship and trims text', () => {
    const value = companionProfileInputSchema.parse({
      displayName: ' Nova ',
      avatarUrl: '',
      relationshipPreset: 'custom',
      customRelationship: '灵魂搭档',
      userAddress: '小天',
      personality: '温柔但有主见',
      speakingStyle: '自然简短',
      boundaries: '不制造情感依赖',
    })
    expect(value.displayName).toBe('Nova')
    expect(value.customRelationship).toBe('灵魂搭档')
  })

  it('keeps Luna as the default example', () => {
    expect(DEFAULT_COMPANION_PROFILE.displayName).toBe('Luna')
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:run -- shared/companion.test.ts`  
Expected: FAIL because `shared/companion.ts` does not exist.

- [ ] **Step 3: Implement the shared profile contract**

```ts
import { z } from 'zod'

export const relationshipPresetSchema = z.enum(['girlfriend', 'boyfriend', 'friend', 'custom'])
export const companionProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  avatarUrl: z.union([z.literal(''), z.string().url().max(500)]),
  relationshipPreset: relationshipPresetSchema,
  customRelationship: z.string().trim().max(40),
  userAddress: z.string().trim().max(40),
  personality: z.string().trim().min(1).max(2_000),
  speakingStyle: z.string().trim().max(1_000),
  boundaries: z.string().trim().max(1_000),
})
export type CompanionProfileInput = z.infer<typeof companionProfileInputSchema>
export const DEFAULT_COMPANION_PROFILE: CompanionProfileInput = {
  displayName: 'Luna',
  avatarUrl: '',
  relationshipPreset: 'friend',
  customRelationship: '',
  userAddress: '',
  personality: '温柔、聪明、自然，略有成熟感，有自己的表达方式。',
  speakingStyle: '闲聊简短自然，认真问题可以详细，不连续追问。',
  boundaries: '明确自己是 AI，不编造现实身体或经历，不制造情感依赖。',
}
```

Create a singleton `companion_profile` table with `id INTEGER PRIMARY KEY CHECK (id = 1)`, one column for every input field, and `created_at`/`updated_at`. Insert the Luna defaults with `INSERT OR IGNORE`.

- [ ] **Step 4: Run the focused test and migration checks**

Run: `npm run test:run -- shared/companion.test.ts && npm run db:migrate:local`  
Expected: focused tests pass and migration `0002` applies.

- [ ] **Step 5: Commit**

```bash
git add shared/companion.ts shared/companion.test.ts migrations/0002_companion_profile.sql functions/_lib/repositories/types.ts
git commit -m "feat: add customizable companion profile"
```

### Task 2: Add profile repository and API

**Files:**
- Create: `functions/_lib/repositories/companion-profile.ts`
- Create: `functions/_lib/repositories/companion-profile.test.ts`
- Create: `functions/api/companion.ts`

- [ ] **Step 1: Write failing repository tests**

Test that `get()` returns the singleton and `update()` persists all user-editable fields while retaining timestamps.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- functions/_lib/repositories/companion-profile.test.ts`  
Expected: FAIL because the repository is missing.

- [ ] **Step 3: Implement repository and route**

`GET /api/companion` returns `{ companion }`.  
`PUT /api/companion` parses `companionProfileInputSchema`, updates singleton row `id = 1`, and returns `{ companion }`.  
Invalid input returns `INVALID_COMPANION_PROFILE`.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:run -- functions/_lib/repositories/companion-profile.test.ts`  
Expected: all profile repository tests pass.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/repositories/companion-profile.ts functions/_lib/repositories/companion-profile.test.ts functions/api/companion.ts
git commit -m "feat: expose companion profile API"
```

### Task 3: Apply the profile to chat context

**Files:**
- Modify: `functions/_lib/services/context.ts`
- Modify: `functions/_lib/services/context.test.ts`
- Modify: `functions/api/chat.ts`
- Modify: `config/persona.ts`

- [ ] **Step 1: Add a failing context test**

Assert that a profile named `Nova`, relationship `男友`, address `小天`, and a custom speaking style all appear in the system message, while the fixed safety rules remain.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- functions/_lib/services/context.test.ts`  
Expected: FAIL because `assembleContext` does not accept a companion profile.

- [ ] **Step 3: Implement dynamic persona composition**

Keep `LUNA_PERSONA` as immutable safety and behavior rules. Add a separate profile section:

```text
当前伴侣档案：
- 名字：<displayName>
- 关系：<resolved relationship>
- 对用户的称呼：<userAddress or 未设置>
- 性格：<personality>
- 说话风格：<speakingStyle>
- 相处边界：<boundaries>
```

Load the profile in `functions/api/chat.ts` together with relationship state, memories, and summary.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:run -- functions/_lib/services/context.test.ts`  
Expected: all context tests pass.

- [ ] **Step 5: Commit**

```bash
git add config/persona.ts functions/_lib/services/context.ts functions/_lib/services/context.test.ts functions/api/chat.ts
git commit -m "feat: apply companion profile to chat"
```

### Task 4: Add “我的 AI 伴侣” without redesigning chat

**Files:**
- Create: `src/features/companion/CompanionPage.tsx`
- Create: `src/features/companion/CompanionPage.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/app/app.css`

- [ ] **Step 1: Write failing UI tests**

Test that the navigation exposes “我的 AI 伴侣”; the page loads Luna; relationship presets include 女友、男友、朋友、自定义; advanced fields use a collapsed `<details>` region; saving sends `PUT /api/companion`.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/features/companion/CompanionPage.test.tsx src/app/AppShell.test.tsx`  
Expected: FAIL because the route and page do not exist.

- [ ] **Step 3: Implement the minimal page**

Add `/companion` and a `Heart` navigation icon. Keep current layout classes. Use a compact header, avatar preview, basic fields, relationship chips/select, and `<details>` for speaking style and boundaries. Keep voice controls on the existing settings page.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:run -- src/features/companion/CompanionPage.test.tsx src/app/AppShell.test.tsx`  
Expected: all focused UI tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/companion src/app/App.tsx src/app/AppShell.tsx src/app/AppShell.test.tsx src/app/app.css
git commit -m "feat: add AI companion settings page"
```

### Task 5: Prepare the public repository and Stage 1 report

**Files:**
- Create: `LICENSE`
- Create: `ROADMAP.md`
- Create: `docs/reports/2026-07-25-stage-1-public-foundation.md`
- Modify: `.dev.vars.example`
- Modify: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Add documentation tests/checks**

Extend `scripts/check-secrets.mjs` expectations so real secrets, `.wrangler/state`, databases, model files, voice files, logs, and `.superpowers` are excluded or rejected.

- [ ] **Step 2: Verify the check detects a fixture secret and still passes the repository**

Run the script test if present, then `npm run check:secrets`.  
Expected: fixture assertion passes and repository scan reports no secret.

- [ ] **Step 3: Write public-facing documentation**

README feature order:

1. Local-first, optional cloud.
2. Custom AI companion.
3. Transparent long-term memory.
4. Streaming chat and history.
5. Optional voice.
6. Security and deployment.

`.dev.vars.example` contains names and safe placeholders only. `ROADMAP.md` lists future work outside the accepted scope. Add MIT License for project code and a third-party license notice.

- [ ] **Step 4: Run Stage 1 verification**

Run:

```powershell
npm run check:secrets
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run test:e2e
git diff --check
git status --short
```

Expected: every command exits 0; Playwright may skip only the intentionally inapplicable desktop/mobile case.

- [ ] **Step 5: Create the Stage 1 report and commit**

Record exact counts and remaining stages in `docs/reports/2026-07-25-stage-1-public-foundation.md`.

```bash
git add LICENSE ROADMAP.md README.md .dev.vars.example .gitignore scripts/check-secrets.mjs docs/reports/2026-07-25-stage-1-public-foundation.md
git commit -m "docs: prepare public companion release"
```

## Stage 2 — Local-First Text Agent

### Task 6: Introduce configurable OpenAI-compatible chat providers

**Files:**
- Create: `functions/_lib/clients/chat-provider.ts`
- Create: `functions/_lib/clients/openai-compatible.ts`
- Create: `functions/_lib/clients/openai-compatible.test.ts`
- Modify: `functions/_lib/clients/deepseek.ts`
- Modify: `functions/_lib/types.ts`
- Modify: `shared/env.ts`
- Modify: `config/models.ts`
- Modify: `functions/api/chat.ts`

- [ ] **Step 1: Write failing adapter tests**

Cover a DeepSeek configuration and an Ollama configuration:

```ts
expect(resolveChatConfig({ CHAT_PROVIDER: 'ollama', CHAT_BASE_URL: 'http://127.0.0.1:11434/v1', CHAT_MODEL: 'qwen3:4b' }))
  .toMatchObject({ requiresApiKey: false, model: 'qwen3:4b' })
```

Also verify CRLF SSE parsing and request cancellation remain intact.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- functions/_lib/clients/openai-compatible.test.ts`  
Expected: FAIL because provider resolution does not exist.

- [ ] **Step 3: Implement provider configuration**

Supported variables:

```dotenv
APP_MODE=local
CHAT_PROVIDER=ollama
CHAT_BASE_URL=http://127.0.0.1:11434/v1
CHAT_MODEL=qwen3:4b
CHAT_API_KEY=
```

Cloud defaults remain DeepSeek. API keys are optional only for explicitly local providers. Do not put provider-specific behavior in chat orchestration.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:run -- functions/_lib/clients/openai-compatible.test.ts functions/_lib/clients/clients.test.ts`  
Expected: all client tests pass.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/clients functions/_lib/types.ts shared/env.ts config/models.ts functions/api/chat.ts
git commit -m "feat: support local chat providers"
```

### Task 7: Add explicit local/cloud runtime status and safe fallback

**Files:**
- Create: `functions/api/runtime.ts`
- Create: `shared/runtime.ts`
- Create: `src/features/settings/RuntimePanel.tsx`
- Create: `src/features/settings/RuntimePanel.test.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `functions/api/chat.ts`

- [ ] **Step 1: Write failing runtime tests**

Test local runtime status, missing-model errors, local-service errors, and that a local failure never calls the cloud provider unless `providerOverride: 'cloud'` is explicitly present and confirmed.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/features/settings/RuntimePanel.test.tsx functions/api/chat.test.ts`  
Expected: FAIL because runtime status and override behavior are absent.

- [ ] **Step 3: Implement status and explicit override**

Expose sanitized runtime metadata only: mode, provider, model, configured, reachable. Add repair text for Ollama not running and model not installed. Never return base URLs containing credentials.

- [ ] **Step 4: Verify GREEN**

Run the focused tests.  
Expected: local diagnostics pass and the “no silent cloud fallback” assertion passes.

- [ ] **Step 5: Commit**

```bash
git add functions/api/runtime.ts shared/runtime.ts src/features/settings/RuntimePanel.tsx src/features/settings/RuntimePanel.test.tsx src/features/settings/SettingsPage.tsx functions/api/chat.ts
git commit -m "feat: expose safe runtime controls"
```

### Task 8: Add one-command local mode and Stage 2 report

**Files:**
- Create: `.dev.vars.local.example`
- Create: `scripts/check-local-runtime.mjs`
- Create: `docs/LOCAL_MODE.md`
- Create: `docs/reports/2026-07-25-stage-2-local-agent.md`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `README.md`

- [ ] **Step 1: Add a failing local runtime script test**

The checker must distinguish Ollama unreachable from model missing and print exact commands such as `ollama serve` and `ollama pull <configured-model>`.

- [ ] **Step 2: Verify RED**

Run: `node scripts/check-local-runtime.mjs` with a deliberately unreachable test port.  
Expected: non-zero exit with `LOCAL_PROVIDER_UNREACHABLE`.

- [ ] **Step 3: Implement scripts and documentation**

Add `dev:local`, `dev:cloud`, and `check:local` scripts. `dev:local` uses Wrangler local D1 state, so conversations and memories remain under ignored `.wrangler/state`.

- [ ] **Step 4: Run Stage 2 verification**

Run all static checks, unit tests, build, E2E, secret scan, and an optional Ollama smoke test when reachable.

- [ ] **Step 5: Write report and commit**

```bash
git add .dev.vars.local.example scripts/check-local-runtime.mjs docs/LOCAL_MODE.md docs/reports/2026-07-25-stage-2-local-agent.md package.json vite.config.ts README.md
git commit -m "docs: deliver local-first text mode"
```

## Stage 3 — Transparent and Privacy-Aware Memory

### Task 9: Extend memory metadata and privacy classification

**Files:**
- Create: `migrations/0003_memory_metadata.sql`
- Modify: `shared/memory.ts`
- Modify: `functions/_lib/repositories/types.ts`
- Modify: `functions/_lib/repositories/memories.ts`
- Modify: `functions/_lib/services/memory-extraction.ts`
- Modify: `functions/_lib/services/memory-extraction.test.ts`

- [ ] **Step 1: Write failing privacy and conflict tests**

Cover category, sensitivity, confidence, access count, last accessed time, intimate/health default blocking, identity/payment blocking, duplicate merge, and conflict replacement.

- [ ] **Step 2: Verify RED**

Run the focused memory tests.  
Expected: assertions fail because metadata and policies are missing.

- [ ] **Step 3: Implement metadata and policy**

Add fields for category, sensitivity, confidence, access count, last accessed time, and superseded memory ID. Preserve existing rows with safe defaults. Intimate and health candidates require explicit confirmation.

- [ ] **Step 4: Verify GREEN**

Run focused tests and local D1 migration.  
Expected: all memory tests and migration pass.

- [ ] **Step 5: Commit**

```bash
git add migrations/0003_memory_metadata.sql shared/memory.ts functions/_lib/repositories functions/_lib/services/memory-extraction.ts functions/_lib/services/memory-extraction.test.ts
git commit -m "feat: add privacy-aware memory metadata"
```

### Task 10: Add ranked retrieval and actual-use transparency

**Files:**
- Create: `functions/_lib/services/memory-retrieval.ts`
- Create: `functions/_lib/services/memory-retrieval.test.ts`
- Modify: `functions/_lib/services/context.ts`
- Modify: `functions/api/chat.ts`
- Modify: `shared/stream.ts`
- Modify: `src/features/chat/MessageBubble.tsx`
- Modify: `src/features/chat/chat.test.tsx`

- [ ] **Step 1: Write failing ranking and UI tests**

Assert deterministic ordering by relevance, importance, recency, and pending status. Assert that only IDs actually injected into context are emitted and displayed under a collapsed “本次使用的记忆”.

- [ ] **Step 2: Verify RED**

Run focused retrieval and chat UI tests.  
Expected: FAIL because ranking and used-memory metadata are absent.

- [ ] **Step 3: Implement retrieval and SSE metadata**

Keep retrieval bounded. Use local embeddings only when configured; always provide deterministic keyword/category fallback. Emit memory IDs and safe display text in a metadata event.

- [ ] **Step 4: Verify GREEN**

Run focused tests and the full test suite.  
Expected: all pass with no nondeterministic ordering.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/services/memory-retrieval.ts functions/_lib/services/memory-retrieval.test.ts functions/_lib/services/context.ts functions/api/chat.ts shared/stream.ts src/features/chat/MessageBubble.tsx src/features/chat/chat.test.tsx
git commit -m "feat: show memories used in replies"
```

### Task 11: Add memory export/restore and Stage 3 report

**Files:**
- Create: `functions/api/memories/export.ts`
- Create: `functions/api/memories/import.ts`
- Create: `shared/memory-backup.ts`
- Create: `shared/memory-backup.test.ts`
- Modify: `src/features/memories/MemoryPage.tsx`
- Modify: `src/features/memories/MemoryPage.test.tsx`
- Create: `docs/reports/2026-07-25-stage-3-transparent-memory.md`

- [ ] **Step 1: Write failing backup validation tests**

Test versioned JSON export, invalid schema rejection, duplicate-safe restore, and no sessions/API keys in backups.

- [ ] **Step 2: Verify RED**

Run focused backup tests.  
Expected: FAIL because the backup contract is missing.

- [ ] **Step 3: Implement export, restore, and collapsed advanced UI**

Use a versioned JSON document. Import requires an explicit confirmation and validates every entry before any write.

- [ ] **Step 4: Run Stage 3 verification**

Run migrations, static checks, full tests, build, E2E, and secret scan.

- [ ] **Step 5: Write report and commit**

```bash
git add functions/api/memories shared/memory-backup.ts shared/memory-backup.test.ts src/features/memories docs/reports/2026-07-25-stage-3-transparent-memory.md
git commit -m "feat: add memory backup and restore"
```

## Stage 4 — Voice Choice, Final Documentation, and GitHub Release

### Task 12: Add speech provider selection

**Files:**
- Create: `shared/speech-provider.ts`
- Create: `shared/speech-provider.test.ts`
- Modify: `functions/api/voices.ts`
- Modify: `functions/api/tts.ts`
- Modify: `src/lib/audioController.ts`
- Modify: `src/lib/audioController.test.ts`
- Modify: `src/features/settings/SettingsPage.tsx`

- [ ] **Step 1: Write failing provider tests**

Cover browser/system speech, local TTS endpoint, and MiniMax. Verify local/browser modes do not require `MINIMAX_API_KEY`.

- [ ] **Step 2: Verify RED**

Run focused speech tests.  
Expected: FAIL because provider selection is absent.

- [ ] **Step 3: Implement minimal adapters**

Use browser `speechSynthesis` as the zero-install default when available. Accept a configurable local TTS endpoint. Preserve MiniMax as optional cloud enhancement. Do not bundle voice files.

- [ ] **Step 4: Verify GREEN**

Run speech and audio controller tests.  
Expected: all provider paths pass.

- [ ] **Step 5: Commit**

```bash
git add shared/speech-provider.ts shared/speech-provider.test.ts functions/api/voices.ts functions/api/tts.ts src/lib/audioController.ts src/lib/audioController.test.ts src/features/settings/SettingsPage.tsx
git commit -m "feat: support selectable speech providers"
```

### Task 13: Complete release docs and final report

**Files:**
- Create: `docs/CLOUD_MODE.md`
- Create: `docs/SECURITY.md`
- Create: `docs/reports/2026-07-25-stage-4-release.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `docs/Luna-对接文档.md`

- [ ] **Step 1: Validate documentation commands**

Run every documented command that is safe locally. Check all links and variable names against code.

- [ ] **Step 2: Perform repository and history secret scans**

Run `npm run check:secrets` plus a history scan for common API key patterns. Never print matching secret values; report only file/commit identifiers.

- [ ] **Step 3: Run final verification**

```powershell
npm ci
npm run db:migrate:local
npm run check:secrets
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run test:e2e
git diff --check
git status -sb
```

Expected: all required checks exit 0 with exact counts recorded in the report.

- [ ] **Step 4: Create the final report**

Document completed scope, verification, remaining optional roadmap items, licenses, and known hardware-dependent limitations.

- [ ] **Step 5: Commit**

```bash
git add README.md ROADMAP.md docs/CLOUD_MODE.md docs/SECURITY.md docs/Luna-对接文档.md docs/reports/2026-07-25-stage-4-release.md
git commit -m "docs: finalize hybrid companion release"
```

### Task 14: Publish safely to GitHub

**Files:** no product files unless a final documentation correction is required.

- [ ] **Step 1: Confirm clean intended scope**

Run `git status -sb`, inspect the full diff from the base commit, and confirm no unrelated files.

- [ ] **Step 2: Create or connect the public repository**

Create `Xiaotian69/luna-ai-companion` only if it does not already exist. Configure `origin` and do not overwrite an unrelated repository.

- [ ] **Step 3: Push the feature branch**

Push with tracking and verify the remote commit SHA.

- [ ] **Step 4: Open a draft pull request**

Use the GitHub app where possible. PR body must summarize local mode, companion customization, memory privacy/transparency, voice providers, validation, and remaining roadmap.

- [ ] **Step 5: Report the repository and PR links**

Include the public repository URL, branch, commit, validation counts, and final stage report link.

## Plan Self-Review

- Every accepted design requirement maps to at least one task.
- Existing UI preservation is explicit in Task 4 and Task 10.
- Local-first execution reuses Wrangler/Miniflare and local D1 instead of introducing a second unrelated web stack.
- No task requires committing user credentials, databases, model weights, voice files, or logs.
- Commercial providers remain optional and user-configured.
- Each stage ends with a durable report and verification checkpoint.
