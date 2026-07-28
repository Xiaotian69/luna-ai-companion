# Stage 3 Report: Transparent, Privacy-Aware Memory

## Completed scope

- Task 9 added explicit memory category, sensitivity, confidence, access, last-accessed, and supersession metadata. Credential, identity, and payment candidates are rejected. Health and intimate candidates require a trusted service argument, but the current chat API/UI never supplies or exposes it, so those categories are also blocked from automatic chat extraction in this release. Duplicate reinforcement and conflict replacement use canonical content and repository-side guards.
- Task 10 added bounded, deterministic retrieval that combines keyword/category relevance, pending commitments, importance, recency, and prior use. A loopback-only local embedding endpoint is optional; deterministic fallback remains available when it is absent or fails.
- Task 10 emits only memories actually injected into the model context. The chat UI keeps their safe display text under the collapsed `本次使用的记忆` disclosure instead of claiming that all candidates were used.
- Task 11 added a strict, versioned memory backup document (`schemaVersion: 1`) and authenticated JSON download/restore endpoints.
- The backup contains only long-term-memory fields: type, content, importance, category, sensitivity, confidence, access metadata, timestamps, and active state. It excludes database IDs, source conversation/message IDs, supersession IDs, sessions, cookies, credentials, environment values, API-key fields, and conversation/message bodies.
- Restore validates the complete request and every item before the first database write, requires `confirmation: true`, canonicalizes and deduplicates the document, and reports `created`, `reinforced`, and `skipped` counts without echoing memory content.
- Export is capped at 1,000 memories. Import is capped at 2 MiB and 1,000 memories, with per-item limits enforced by the strict schema. Export measures the actual UTF-8 bytes of `JSON.stringify({ confirmation: true, backup })` against the same 2 MiB ceiling, so every successful export can pass the import envelope limit; oversized requests receive an explicit `413 MEMORY_BACKUP_TOO_LARGE` response before any restore write.
- Import rejects an oversized declared `Content-Length` before reading. For absent or inaccurate lengths it reads bounded stream chunks, initiates body-reader cancellation as soon as accumulated bytes exceed 2 MiB, and returns `413` without waiting on a stalled cancellation promise; it never buffers an unbounded request. The browser performs the same `File.size` check before `File.text()`, JSON parsing, confirmation, or an API write; server validation remains authoritative.
- Restore IDs are deterministic SHA-256-derived identifiers over canonical content. Each repository write also uses one duplicate-guarded `INSERT ... SELECT ... WHERE NOT EXISTS ... ON CONFLICT DO NOTHING`, so repeat and concurrent imports are retry-safe for the same document. Restored source conversation/message references are always `null`.
- Memory backup/restore is placed in a default-collapsed `高级操作` section. Selecting a file does not write anything; the restore button asks for explicit confirmation before sending the authoritative server request.

## Schema and migration state

- `0003_memory_metadata.sql`: category, sensitivity, confidence, access count, last-accessed time, and supersession metadata.
- `0004_memory_dedupe.sql`: canonical `normalized_content` plus a partial unique index for active memories.
- `0005_memory_retrieval_indexes.sql`: bounded active retrieval and legacy active-normalization repair indexes.
- Task 11 requires no new migration. `npm run db:migrate:local` reported `No migrations to apply!` against the persisted local D1 state.

## TDD evidence

- Backup contract RED: `npm test -- --run shared/memory-backup.test.ts` exited 1 because `./memory-backup` did not exist (one failed suite, zero collected tests).
- Repository restore RED: `npm test -- --run functions/_lib/repositories/memory-restore.test.ts` ran two tests and both failed with `restore is not a function`.
- Endpoint RED: `npm test -- --run functions/api/memories/backup.test.ts` exited 1 because the export/import modules did not exist.
- UI RED: `npm test -- --run src/features/memories/MemoryPage.test.tsx` ran four tests; the existing list test passed and all three new advanced backup/restore tests failed because `高级操作` was absent.
- Initial focused GREEN: the shared schema, repository restore, API, and UI suites passed four files and 17 tests, zero failed.
- Review-remediation RED: the repository/API/UI suites ran 14 tests; four failed for missing legacy-inactive canonical handling, missing explicit `413` limits, and missing UI refresh after restore.
- Specification-review RED: the repository and API suites ran 13 tests; five failed because restore did not prepare the active normalization invariant and the 1 MiB import ceiling rejected a 1,776,103-byte legal Chinese backup that export accepted. Export also accepted a schema-valid envelope above the shared byte ceiling.
- Quality-review RED: the repository suite ran five tests with three failures because single-item `run()` remained and `restoreMany` was absent; the API suite ran 11 tests with four failures because streamed overflow was not cancelled and the endpoint did not use `restoreMany`; the UI suite ran five tests with one failure because an oversized file was read before rejection. A follow-up API RED timed out as intended when cancellation returned a never-resolving promise, proving the response had incorrectly awaited cancellation.
- Final focused GREEN: the shared schema, repository restore, API, and UI suites passed four files and 28 tests, zero failed.
- Tests cover strict version/time/enum/score/count/content validation, unknown and forbidden structural fields, whole-document rejection before writes, explicit confirmation, canonical in-document active/inactive deduplication, active/inactive legacy-null handling, deterministic repeated-import IDs, duplicate-safe guarded batch statements, a 1,000-item restore resource bound, streamed overflow cancellation with absent or misleading `Content-Length`, browser pre-read size rejection, maximum-size Chinese export/import round-trip, actual UTF-8 envelope rejection, restricted export fields, safe download naming, default-collapsed UI, download behavior, and confirmation-gated restore.

## Fresh Stage 3 candidate verification — 2026-07-28

These results were recorded after the Task 11 code, tests, review remediation, and report update, before the Task 11 commit.

- `npm run typecheck`: passed with zero TypeScript errors.
- `npm run lint`: passed with zero ESLint errors.
- `npm test -- --run`: 32 test files and 226 tests passed; zero failed.
- `npm run build`: passed; Vite transformed 1,880 modules.
- `npm run db:migrate:local`: passed; no migrations remained to apply.
- `npm run test:e2e`: 5 passed across desktop and mobile, 1 desktop-only mobile-layout assertion intentionally skipped, zero failed.
- `npm run check:secrets`: passed; 144 current candidate files and 300 reachable history blobs checked, zero findings.
- `git diff --check`: passed; only line-ending notices were emitted.

## Privacy and transactional boundaries

- A backup is private because it contains the user's long-term memory text. It should be stored and transferred with the same care as private conversation data even though unrelated tables and secret-bearing configuration are excluded.
- Pages Functions do not wrap the whole multi-item restore in one D1 transaction. The complete document is validated and deduplicated before writes begin. `restoreMany` performs one normalization repair, one remaining-legacy scan, and at most 50 guarded inserts per D1 batch (20 batches for 1,000 entries); it never issues 1,000 individual `run()` calls or repeated full scans. An unexpected later-batch failure can leave an earlier subset imported, but every item is deterministic and duplicate-safe, so retrying the same document completes the restore without multiplying those entries.
- Before restore, the repository runs the active normalization invariant repair, so active legacy rows receive canonical values and become subject to the partial unique index. It then canonical-scans every remaining row whose `normalized_content` is still `NULL`, including both active and inactive legacy rows, before the duplicate-guarded insert. Concurrent imports of the same document remain protected by deterministic IDs and database conflicts.

## Environment and hardware limitations

- Stage 3 required tests do not depend on Ollama or model hardware. Retrieval always has a deterministic keyword/category fallback, and its optional local embedding client is covered with deterministic loopback mocks.
- No real local embedding model or generation-quality/hardware-performance smoke test was run during this Task 11 verification. Ollama was not available during the preceding local-mode verification; model download size, latency, memory use, and output quality therefore remain machine-dependent.
- The existing dependency installation still reports six high-severity advisories. This stage does not apply forced dependency upgrades; remediation needs a separate compatibility review and must not use `npm audit fix --force` blindly.
