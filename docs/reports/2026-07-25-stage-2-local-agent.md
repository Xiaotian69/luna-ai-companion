# Stage 2 Report: Local-First Text Agent

## Completed

- Added a local-first Ollama text path using the existing OpenAI-compatible provider abstraction; local text does not require a DeepSeek or other commercial chat key.
- Added `.dev.vars.local.example` with only variable names and safe placeholders for Ollama, local authentication, optional speech, and development mode.
- Added `npm run check:local`, which requires and authoritatively reads `.dev.vars.local`, verifies its local-mode/provider markers, and checks the configured `CHAT_BASE_URL` and `CHAT_MODEL`.
- Added stable, actionable checker outcomes: `LOCAL_PROVIDER_UNREACHABLE` with `ollama serve`, `LOCAL_MODEL_MISSING` with `ollama pull <configured-model>`, and `LOCAL_RUNTIME_READY` on success.
- Added deterministic child-process tests backed by ephemeral loopback HTTP servers; required tests do not depend on a real Ollama installation.
- Added `npm run dev:local` to check Ollama, build the application, load `.dev.vars.local` through Wrangler, and persist local D1 state under ignored `.wrangler/state`.
- Added `npm run dev:cloud` to preserve the DeepSeek development path through `.dev.vars` and the same local D1 persistence directory.
- Bound standalone Vite development explicitly to loopback and kept its API proxy on loopback. No API key uses a `VITE_*` variable.
- Added a complete local-mode guide with exact install, start, check, migration, run, cloud-mode, and troubleshooting commands.
- Documented that local provider failures are explicit and never silently fall back to cloud; cloud override still requires the existing explicit request and confirmation pair.
- Extended the repository path scanner narrowly so named `.dev.vars.*.example` templates are allowed while real `.dev.vars.*` files remain forbidden.

## TDD Evidence

- Baseline before Task 8: 27 test files, 95 tests passed.
- RED: `npm test -- --run scripts/check-local-runtime.test.ts` failed 1 file and all 3 new tests because `scripts/check-local-runtime.mjs` did not yet exist. The direct unreachable-port invocation exited 1 and did not emit the required `LOCAL_PROVIDER_UNREACHABLE`, confirming the missing behavior before production implementation.
- Initial focused GREEN: checker plus secret-scanner tests passed 2 files and 6 tests; the standalone checker suite passed 1 file and 3 tests. This historical initial cycle is superseded by the post-remediation suite below.
- Manual deterministic unreachable probe exited 1 with `LOCAL_PROVIDER_UNREACHABLE` and the exact repair command `ollama serve`.

## Initial Stage 2 Candidate Verification (Superseded)

These counts describe the initial pre-commit candidate only. The post-remediation section below is the current code verification record.

- Pre-commit candidate secret scan on 2026-07-28: passed; 132 candidate repository files and 211 blobs reachable before the Stage 2 commit checked, zero findings. This time-anchored count is not a claim about later HEAD history.
- TypeScript: passed with zero errors.
- ESLint: passed with zero errors.
- Initial Vitest/Miniflare candidate: 28 test files, 98 tests passed, zero failed; superseded by the post-remediation count below.
- Initial deterministic checker candidate: 1 test file, 3 tests passed, zero failed; superseded by the post-remediation checker suite below.
- Production build: passed; 1,878 modules transformed.
- Playwright: 5 passed across desktop and mobile, 1 desktop-only mobile-layout assertion intentionally skipped, zero failed.
- `git diff --check`: passed.
- Installed CLI validation: Wrangler 4.111 help confirms Pages `--env-file` and `--persist-to`; D1 migrations confirms `--local` with `--persist-to`.
- Initial optional real Ollama smoke: unavailable on `http://127.0.0.1:11434/v1`; the initial candidate checker exited 1 with `LOCAL_PROVIDER_UNREACHABLE` and `ollama serve`. This historical external absence did not fail the required deterministic suite.

## Post-Remediation Verification — 2026-07-28

This section is anchored to code commit `04f834a364fd88e56bb3fbc697242d79a3f93756` (`fix: make local preflight authoritative`), before this report-only update.

- Explicit-file semantics: the checker uses Node 24's `parseEnv(readFileSync(path, 'utf8'))` result as the entire configuration source. It does not merge absent keys from `process.env`; only the checker's matching Ollama URL/model defaults remain available.
- Required markers: an explicit file must state `APP_MODE=local` and `CHAT_PROVIDER=ollama`. Empty, partial, cloud-mode, and DeepSeek files fail with sanitized `LOCAL_CONFIGURATION_INVALID`, even under conflicting valid inherited variables.
- Package invocation: `node scripts/check-local-runtime.mjs -- --env-file .dev.vars.local`. The `--` terminator prevents Node from consuming its native env-file option, so the script controls parsing and precedence while Wrangler independently receives the same file through its validated `--env-file .dev.vars.local` flag.
- Non-success responses: the checker aborts the request controller and cancels the response body before returning `LOCAL_PROVIDER_REJECTED`; a deliberately open-ended HTTP 500 body exits normally and promptly without a lingering child.
- Remediation TDD RED on `b94ada5`: 24 checker cases ran; 5 failed for empty/partial/wrong-marker files and the stalled HTTP 500 child. The stalled child printed the rejection but required the 2-second harness timeout and was killed with `SIGTERM`.
- Deterministic checker GREEN: 1 test file, 24 tests passed, zero failed.
- Full Vitest/Miniflare: 28 test files, 119 tests passed, zero failed.
- Post-code/pre-report-commit secret scan: passed; 132 current candidate files and 228 blobs reachable from code commit `04f834a364fd88e56bb3fbc697242d79a3f93756` checked, zero findings. The counts are deliberately anchored before this report-only commit.
- TypeScript and ESLint: passed with zero errors.
- Production build: passed; 1,878 modules transformed.
- Playwright: 5 passed across desktop and mobile, 1 desktop-only mobile-layout assertion intentionally skipped, zero failed.
- `git diff --check`: passed.

## Remaining Stages

- Stage 3: privacy-aware memory metadata, ranked retrieval transparency, export, restore, and associated review/reporting.
- Stage 4: selectable system/local/MiniMax speech providers, final documentation, public GitHub publication, and draft pull request.

## Limitations and Risks

- Real local generation was not smoke-tested because Ollama was not running on this machine during verification. The OpenAI-compatible protocol behavior is covered deterministically, but model-specific output quality and hardware performance remain machine-dependent.
- `.wrangler/state` is local and Git-ignored but not an encrypted vault. Users must protect and back up it as private conversation data; deleting it removes the local development database.
- MiniMax speech remains an optional cloud feature. Fully offline use requires avoiding cloud speech until Stage 4 adds local speech choices.
- Local and cloud development commands currently share `.wrangler/state`; users who require strict separation should use separate working copies and private backups.
- The existing dependency installation reports 6 high-severity advisories. This stage does not apply forced upgrades; remediation requires a separate compatibility review and must not use `npm audit fix --force` blindly.
