# Stage 4 Release Report

## Release scope

The release candidate delivers the four planned stages:

- Public single-user foundation: customizable companion identity and boundaries, authenticated Pages Functions, D1 persistence, responsive chat, summaries, limits, secret scanning, CI, MIT licensing, and third-party notices.
- Hybrid local/cloud text: Ollama local mode and DeepSeek cloud mode use explicit provider configuration. Local failures are visible and never trigger silent cloud fallback; a cloud override requires a paired provider request and confirmation.
- Privacy-aware memory: category, sensitivity, confidence, access and supersession metadata; deterministic sensitive-data blocking and trusted confirmation; race-safe normalization/deduplication/conflict handling; bounded deterministic retrieval with optional loopback embeddings.
- Actual-use transparency and backup: only memories injected into the model context appear under the collapsed `本次使用的记忆` disclosure. Schema-v1 JSON export/restore is strict, confirmation-gated, duplicate-safe, limited to 1,000 items and a 2 MiB import envelope, and excludes sessions, credentials, conversations and messages.
- Selectable speech: browser speech is the zero-configuration default. A deployment-configured local/external TTS endpoint and MiniMax are optional; server routes reject browser TTS, unsafe endpoint shapes, redirects, non-audio and oversized responses.
- Release documentation: README and Chinese handoff now match current commands, providers, variables and API schema. Dedicated local, cloud and security guides document deployment and trust boundaries.

## Documentation audit and review fixes

Before editing, the documentation was compared with `package.json`, both `.dev.vars*.example` files, `wrangler.toml`, `shared/env.ts`, `shared/chat.ts`, `shared/speech*.ts`, `shared/stream.ts`, `functions/_lib/types.ts`, provider/retrieval code and current API routes.

The audit found and fixed these stale claims:

- README and ROADMAP still described memory metadata, retrieval transparency, backup/restore, local text and selectable speech as future work.
- README described only DeepSeek SSE and MiniMax voice, made optional cloud keys appear universally required, and lacked embedding/local-TTS rules.
- The handoff pinned an obsolete local path, branch, commit, test count and DeepSeek-only architecture. It omitted companion/runtime/backup APIs, chat override fields, `usedMemories`, memory metadata and the speech `provider` field.
- The old deployment checklist did not distinguish required authentication secrets from conditional chat and speech secrets, or explain the cloud TTS DNS/deployer boundary.

Review remediation added the non-transactional restore/retry boundary, 2 MiB/1,000-item limits, server-only URL rule, cloud redirect/audio/size controls, exact public-fixture allowlist behavior, log/database/model/voice exclusions, and a private vulnerability-reporting path.

## Documentation command and link validation

- Every relative Markdown link in the repository was resolved against its source file: zero missing targets.
- Seven unique external URLs parsed as absolute HTTP(S) URLs. Network HEAD status was not made a release gate because supplier sites can block automation or be temporarily unavailable.
- `.dev.vars.example` and `.dev.vars.local.example` exist. Documented environment names were reconciled with shared schemas and Pages bindings; the documented limitation that `DAILY_*` values do not currently override `UsageGuard` is explicit.
- `npx wrangler d1 migrations apply --help`, `pages project create --help`, `pages secret put --help`, and `pages deploy --help` confirmed the documented Wrangler 4.111 command shapes without changing Cloudflare state.
- Safe finite commands (`npm ci`, migration, scanners, static checks, tests and build) were executed as listed below.
- `Copy-Item` sources were checked but no private `.dev.vars*` destination was created or overwritten. The POSIX `cp` duplicates were not run on Windows.
- `npm run dev*` and `ollama serve` were skipped because they intentionally start persistent servers. `winget install` was skipped because it changes the system; `ollama pull` was skipped because it downloads model weights. Ollama was not installed on this verification machine, so `check:local` and real generation/embedding smokes were not run.
- Cloudflare login/project creation/remote migration/secret/deploy commands were not executed because they change external account state. No paid DeepSeek or MiniMax call and no external TTS request was made.

## Fresh final verification — 2026-07-28

All commands ran in the isolated release worktree after documentation changes:

- `npm ci`: passed; 259 packages installed and 260 audited. npm reported **6 high-severity advisories**. No `npm audit fix --force` was run; compatibility-preserving remediation remains separate work.
- `npm run db:migrate:local`: passed; Wrangler 4.111.0 reported no pending migrations.
- `npm run check:secrets`: passed on the final pre-commit candidate; **151 current files** and **345 reachable history blobs**, zero findings.
- Independent common credential-pattern history scan: **0 findings** across **53 commits** and **345 unique commit/blob-path pairs**. The scanner printed no matched values and would report only commit/file identifiers.
- `npm run typecheck`: passed with zero TypeScript errors.
- `npm run lint`: passed with zero ESLint errors.
- `npm run test:run`: **35 test files, 309 tests passed**, zero failed.
- `npm run build`: passed; Vite 8.1.4 transformed **1,881 modules**.
- `npm run test:e2e`: **5 passed, 1 intentionally skipped**, zero failed. The skip is the mobile-only composer assertion in the desktop project.
- Repository Markdown relative-link scan, external-link syntax scan, environment/command audit and `git diff --check`: passed.

The history count above describes the final tree before this documentation commit, as required for a report that is itself part of that commit. The post-commit scanner is run again before publication and may count additional reachable documentation blobs.

## Licenses and repository exclusions

Original code is distributed under [`LICENSE`](../../LICENSE) (MIT). Dependency, model, voice and hosted-service rights remain with their owners and are summarized in [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md). The repository does not grant rights to redistribute third-party model weights or cloned voices.

Secrets, `.dev.vars`, `.env`, Wrangler/D1 state, SQLite/database files, logs, private keys, model weights, and generated audio/voice files are excluded and scanner-enforced. Backup JSON is deliberately not a secrets backup, but it contains private long-term-memory text and must be protected accordingly.

## Known limits and optional roadmap

- No Ollama generation-quality, local embedding, download-size, latency, memory/GPU, DeepSeek, MiniMax, external TTS, DNS or live Cloudflare deployment smoke ran on this machine. Those results depend on hardware, provider accounts and deployment ownership.
- A D1 restore validates the full backup before writes and is retry-safe, but it is not one global transaction; a late batch failure can leave an earlier valid subset imported.
- Browser speech privacy depends on the browser/operating-system implementation. Cloud TTS public-FQDN syntax validation does not prove DNS ownership or destination trust.
- Six npm high-severity advisories require a compatibility review; forced upgrades were intentionally avoided.
- Remaining optional work is limited to [`ROADMAP.md`](../../ROADMAP.md): multi-role/multimodal support, richer relationship timelines, hardware benchmarking, encrypted sync/native apps, permissioned tools, explainable retrieval, plugins, dependency upgrades, observability and deployed end-to-end smokes.
