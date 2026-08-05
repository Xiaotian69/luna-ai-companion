# Luna GitHub Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Luna's engineering-heavy repository page into an accurate bilingual product presentation with real screenshots, a coherent brand system, an MIT license, and searchable GitHub metadata.

**Architecture:** Keep application behavior unchanged. Build documentation from current `main` capabilities, capture the real local Cloudflare Pages experience, generate deterministic brand assets under `docs/assets/`, and isolate future hybrid/local-first work in Roadmap. Repository files ship in the existing `codex/github-portfolio-packaging` branch and one PR.

**Tech Stack:** React/Vite/TypeScript, Cloudflare Pages Functions and D1, Markdown, Mermaid, Playwright, HTML/CSS-to-PNG rendering, GitHub CLI.

---

### Task 1: Reconcile the branch with current remote state

**Files:**
- Read: `README.md`
- Read: `package.json`
- Read: `config/models.ts`
- Read: `config/persona.ts`
- Read: `docs/superpowers/specs/2026-07-25-hybrid-ai-companion-design.md`

- [ ] **Step 1: Fetch the current remote default branch**

Run:

```powershell
git fetch origin main
git status --short --branch
git log --oneline --decorate -5 origin/main
```

Expected: the working tree is clean and the only local commits ahead of `origin/main` are the approved design/plan commits.

- [ ] **Step 2: Verify current product claims against code**

Confirm these implemented capabilities in the listed files: SSE streaming, conversation persistence, D1 summaries, long-term memories, MiniMax speech, password authentication, quotas, dark mode, and responsive navigation. Confirm hybrid/local-first provider work exists only in design/plan documents and not on the current implementation branch.

- [ ] **Step 3: Record the documentation truth boundary**

Use this exact rule while writing: current Cloudflare + DeepSeek + MiniMax behavior appears under Features; hybrid/local-first architecture appears only under Roadmap with the label `In development` / `开发中`.

### Task 2: Capture real product screenshots

**Files:**
- Create: `docs/assets/screenshots/chat.png`
- Create: `docs/assets/screenshots/memory.png`
- Create: `docs/assets/screenshots/voice-settings.png`
- Create: `docs/assets/screenshots/mobile-chat.png`
- Create temporary ignored file: `work/readme-seed.sql`

- [ ] **Step 1: Install and validate the local application**

Run:

```powershell
npm ci
npm run db:migrate:local
npm run build
```

Expected: all commands exit 0. Never print `.dev.vars` or secret values.

- [ ] **Step 2: Start the full local stack without exposing a visible helper window**

Run `npm run dev:full` through a hidden background process and capture its PID and output under the ignored `work/` directory. Verify `http://localhost:8788` returns 200.

- [ ] **Step 3: Create deterministic screenshot state without paid API calls**

Create ignored `work/readme-seed.sql` with this exact local-only seed:

```sql
DELETE FROM memories WHERE id = 'readme-memory';
DELETE FROM messages WHERE conversation_id = 'readme-demo';
DELETE FROM conversations WHERE id = 'readme-demo';
INSERT INTO conversations (id, title, created_at, updated_at)
VALUES ('readme-demo', '重新开始跑步', '2026-08-05T08:00:00.000Z', '2026-08-05T08:02:00.000Z');
INSERT INTO messages (id, conversation_id, role, content, created_at, token_estimate, status)
VALUES
  ('readme-user', 'readme-demo', 'user', '最近准备重新开始跑步，想从每周两次开始。', '2026-08-05T08:00:00.000Z', 22, 'complete'),
  ('readme-assistant', 'readme-demo', 'assistant', '可以从轻松、能持续的节奏开始。先把“每周两次”当成稳定习惯，而不是成绩目标。', '2026-08-05T08:02:00.000Z', 40, 'complete');
INSERT INTO memories (id, memory_type, content, importance, source_conversation_id, source_message_id, created_at, updated_at, is_active)
VALUES ('readme-memory', 'preference', '正在重新开始跑步，计划先保持每周两次。', 0.82, 'readme-demo', 'readme-user', '2026-08-05T08:03:00.000Z', '2026-08-05T08:03:00.000Z', 1);
```

Apply it with:

```powershell
npx wrangler d1 execute luna-db --local --persist-to .wrangler/state --file work/readme-seed.sql
```

Use the configured local password to sign in through Playwright without writing it to source or logs. Open the seeded conversation and memory through the real UI. Do not send a chat or TTS request, so screenshot capture incurs no paid model call.

- [ ] **Step 4: Capture desktop feature screenshots**

Use a 1440×1000 viewport. Capture the chat screen, memory management screen, and persona/voice settings screen as PNG files at the exact paths above. Crop browser chrome and preserve the full relevant app panel.

- [ ] **Step 5: Capture the mobile chat screenshot**

Use a 390×844 viewport and save `mobile-chat.png`. Verify the bottom navigation and safe-area spacing are visible.

- [ ] **Step 6: Inspect every screenshot**

Open each PNG at original detail. Expected: text is readable, no secret/private data is present, and every shown control exists in current code.

### Task 3: Generate Luna brand assets

**Files:**
- Create: `docs/assets/hero-source.html`
- Create: `docs/assets/hero.png`
- Create: `docs/assets/social-preview-source.html`
- Create: `docs/assets/social-preview.png`

- [ ] **Step 1: Build the README hero source**

Create a self-contained HTML/CSS composition using Luna's existing colors (`#171921`, `#6f739b`, `#a56e76`, `#f3f3f7`), a moon symbol, the real chat screenshot, and this exact copy:

```text
MEET YOUR AI COMPANION
She remembers what matters.
Transparent memory · Natural voice · Self-hostable
```

Do not use a generated human portrait.

- [ ] **Step 2: Render the hero image**

Render `hero-source.html` with Playwright at 1600×720 and save `hero.png`. Verify its dimensions programmatically and inspect the image.

- [ ] **Step 3: Build and render the Social Preview**

Create a 1280×640 composition with the exact title `A private AI companion that remembers what matters.` and capability line `Streaming chat · Transparent memory · Natural voice · Self-hostable`. Render it to `social-preview.png`.

- [ ] **Step 4: Verify image dimensions and readability**

Use Pillow or ImageMagick to assert:

```text
social-preview.png = 1280 × 640
hero.png = 1600 × 720
```

Inspect both at full size and at 25% scale.

### Task 4: Write the bilingual README pair and license

**Files:**
- Modify: `README.md`
- Create: `README.zh-CN.md`
- Create: `LICENSE`

- [ ] **Step 1: Rewrite the English README**

Use this exact section order:

```markdown
# Luna
[hero image]
[English | 简体中文]
[CI, React, TypeScript, Cloudflare, License badges]

## A companion with memory—and boundaries
## Highlights
## Screenshots
## How it works
## Quick start
## Configuration
## Security and cost controls
## Quality checks
## Roadmap
## License
```

The opening paragraph must identify Luna as a single-user Chinese AI companion. Link the hero and real screenshots with relative paths. Use a Mermaid diagram for Browser → Pages Functions → DeepSeek/MiniMax/D1. Do not add a Live Demo badge because no public demo exists.

- [ ] **Step 2: Write the Chinese README**

Mirror the same facts and section order in natural Chinese. Link back to `README.md`. Preserve the existing accurate deployment details, but move long operational explanations below Quick Start.

- [ ] **Step 3: Add the MIT license**

Create the standard MIT License text with year `2026` and copyright holder `Xiaotian69`.

- [ ] **Step 4: Check bilingual parity and links**

Confirm both files mention the same implemented features, requirements, environment variables, quality commands, Roadmap boundary, screenshots, and license. Run a Markdown link check over both files.

### Task 5: Validate repository content

**Files:**
- Verify all changed README, license, and asset files

- [ ] **Step 1: Run the repository quality suite**

Run:

```powershell
npm run check:secrets
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Expected: every command exits 0. Documentation and static assets must not change application test results.

- [ ] **Step 2: Run documentation-specific checks**

Verify image dimensions, Markdown links, `git diff --check`, and a secret scan over changed files. Expected: no broken relative link, placeholder, or credential-like value.

- [ ] **Step 3: Review the full diff**

Run `git diff -- README.md README.zh-CN.md LICENSE docs/assets`. Confirm no application source file changed.

- [ ] **Step 4: Commit the packaging changes**

Run:

```powershell
git add README.md README.zh-CN.md LICENSE docs/assets
git commit -m "docs: present Luna as a bilingual product"
```

Expected: one focused documentation commit in addition to the approved design/plan commit.

### Task 6: Publish the branch, PR, and GitHub metadata

**Files:**
- Remote repository metadata: `Xiaotian69/luna-ai-companion`

- [ ] **Step 1: Push the branch**

Run:

```powershell
git push -u origin codex/github-portfolio-packaging
```

- [ ] **Step 2: Create a draft PR**

Create a draft PR titled `docs: package Luna for GitHub discovery`. The body must summarize the product positioning, bilingual docs, real screenshots, license, validation commands, and the fact that hybrid/local-first work remains Roadmap-only.

- [ ] **Step 3: Update repository Description and Topics**

Set Description to:

```text
Self-hostable Chinese AI companion with streaming chat, transparent long-term memory, and natural voice
```

Set Topics to:

```text
ai-companion, chinese-ai, self-hosted, react, typescript, cloudflare-pages, cloudflare-d1, deepseek, text-to-speech, long-term-memory
```

Keep Homepage empty.

Run:

```powershell
gh repo edit Xiaotian69/luna-ai-companion --description "Self-hostable Chinese AI companion with streaming chat, transparent long-term memory, and natural voice"
gh api --method PUT -H "Accept: application/vnd.github+json" repos/Xiaotian69/luna-ai-companion/topics -f "names[]=ai-companion" -f "names[]=chinese-ai" -f "names[]=self-hosted" -f "names[]=react" -f "names[]=typescript" -f "names[]=cloudflare-pages" -f "names[]=cloudflare-d1" -f "names[]=deepseek" -f "names[]=text-to-speech" -f "names[]=long-term-memory"
```

- [ ] **Step 4: Read back metadata**

Run:

```powershell
gh repo view Xiaotian69/luna-ai-companion --json description,homepageUrl,repositoryTopics,licenseInfo
```

Expected: Description and Topics match; Homepage is empty. `licenseInfo` may remain empty until the PR merges, so record that state accurately.

- [ ] **Step 5: Prepare Social Preview upload handoff**

If no authenticated API/tool supports repository Social Preview uploads, report `docs/assets/social-preview.png` as the exact file to upload through Settings → General → Social preview. Do not claim the preview was uploaded unless a readback or visible repository preview proves it.
