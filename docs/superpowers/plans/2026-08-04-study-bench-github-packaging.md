# Study Bench GitHub Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present Study Bench as a credible AI learning workbench with a clear learning loop, verified live experience, bilingual documentation, real screenshots, and searchable repository metadata.

**Architecture:** Keep the Next.js application and course content unchanged. Derive claims from the current learning workspace, validation scripts, and release checklist; capture real views from the deployed or local application; add documentation assets, English/Chinese READMEs, and an MIT license on a dedicated PR branch.

**Tech Stack:** Next.js 15, React 19, TypeScript, KaTeX, local progress state, provider-configurable AI tutor, Markdown, Playwright, GitHub CLI.

---

### Task 1: Audit current product truth and deployment

**Files:**
- Read: `README.md`
- Read: `package.json`
- Read: `docs/release-checklist.md`
- Read: `docs/ai/tutor-runtime-contract.md`
- Read: `app/page.tsx`
- Read: `components/course/`
- Read: `components/diagrams/`

- [ ] **Step 1: Create and verify the packaging branch**

Run in `E:\Grace\.worktrees\portfolio-packaging\study-bench`:

```powershell
git fetch origin main
git switch -c codex/github-packaging
git status --short --branch
```

Expected: a clean branch based on the latest `origin/main`.

- [ ] **Step 2: Verify the public deployment**

Run:

```powershell
$response = Invoke-WebRequest -UseBasicParsing 'https://study-bench.vercel.app'
$response.StatusCode
```

Expected: `200`. Open the page visually and confirm it is the current Study Bench product before using it for screenshots.

- [ ] **Step 3: Record verified product claims**

Confirm in source and docs: structured Math Analysis content, textbook-order navigation, KaTeX rendering, exercises and hints, text and image answer review, provider configuration, API-key handling, and local mastery progress. Exclude features that exist only in roadmap documents.

### Task 2: Validate the application and capture real screenshots

**Files:**
- Create: `docs/assets/screenshots/learning-workbench.png`
- Create: `docs/assets/screenshots/exercise-review.png`
- Create: `docs/assets/screenshots/ai-tutor-settings.png`
- Create: `docs/assets/screenshots/mobile-learning.png`

- [ ] **Step 1: Install dependencies and run the native validation suite**

Run:

```powershell
npm ci
npm run validate:all
```

Expected: the validation scripts and production build exit 0.

- [ ] **Step 2: Start the local app for deterministic capture**

Run `npm run dev -- -p 3000` in a hidden background process, store logs under an ignored temporary directory, and verify `http://localhost:3000` returns 200.

- [ ] **Step 3: Capture the main learning workbench**

At 1440×1000, show the course sidebar, the “数列极限” lesson, KaTeX content, exercise panel, and AI tutor panel. Save to `learning-workbench.png`.

- [ ] **Step 4: Capture exercise and tutor states**

Use synthetic answers only. Save an exercise/review state to `exercise-review.png` and the provider/settings panel without a real key to `ai-tutor-settings.png`. Mask or leave empty every credential field.

- [ ] **Step 5: Capture and inspect mobile state**

At 390×844, capture the primary lesson flow as `mobile-learning.png`. Inspect all four images at original size for private data, clipped content, and factual accuracy.

### Task 3: Create brand and share assets

**Files:**
- Create: `docs/assets/hero-source.html`
- Create: `docs/assets/hero.png`
- Create: `docs/assets/social-preview-source.html`
- Create: `docs/assets/social-preview.png`

- [ ] **Step 1: Compose the Study Bench hero**

Use learning blue, a subtle coordinate/sequence motif, and a crop of the real workbench. Use exact copy:

```text
STUDY BENCH
Turn textbooks into guided learning.
Lecture · Question · Practice · Feedback
```

- [ ] **Step 2: Render hero and Social Preview**

Render `hero.png` at 1600×720 and `social-preview.png` at 1280×640. The Social Preview title is `AI learning, organized around the way you study.`

- [ ] **Step 3: Verify the assets**

Assert pixel dimensions, inspect at 100% and 25% scale, and confirm the product screenshot—not a conceptual mockup—provides the interface evidence.

### Task 4: Replace the minimal README with bilingual product documentation

**Files:**
- Modify: `README.md`
- Create: `README.zh-CN.md`
- Create: `LICENSE`

- [ ] **Step 1: Write the English README**

Use this section order:

```markdown
# Study Bench
[hero, language switch, build/Next.js/TypeScript/license badges]

## Learn in a complete loop
## What you can do
## The learning workflow
## Screenshots
## AI tutor and privacy model
## Course content
## Quick start
## Validation
## Project structure
## Roadmap
## License
```

Explain that users bring their own provider key, that local progress is stored in the browser, and that textbook PDFs are not committed. Link the verified Vercel deployment as `Live Demo`.

- [ ] **Step 2: Write the Chinese README**

Mirror the English structure and facts in natural Chinese. Use the product name `Study Bench · 数学分析同步精读工作台` once near the top, then retain `Study Bench` consistently.

- [ ] **Step 3: Add MIT License**

Create standard MIT text with year `2026` and copyright holder `Xiaotian69`.

- [ ] **Step 4: Validate README links and bilingual parity**

Check every relative path, live URL, badge, image, and language switch. Confirm both versions describe the same provider/key flow and current content scope.

### Task 5: Verify, commit, and publish

**Files:**
- Verify: `README.md`, `README.zh-CN.md`, `LICENSE`, `docs/assets/`

- [ ] **Step 1: Run final native validation**

Run:

```powershell
npm run validate:all
git diff --check
```

Expected: exit 0 and no whitespace errors.

- [ ] **Step 2: Verify documentation assets and scope**

Run a Markdown link check and image dimension check. Review `git diff --stat`; only documentation, license, and asset files may change.

- [ ] **Step 3: Commit**

Run:

```powershell
git add README.md README.zh-CN.md LICENSE docs/assets
git commit -m "docs: present Study Bench as an AI learning workbench"
```

- [ ] **Step 4: Push and open a draft PR**

Push `codex/github-packaging` and create a draft PR titled `docs: package Study Bench for GitHub discovery`. Include validation output and screenshot provenance.

- [ ] **Step 5: Update and read back GitHub metadata**

Set Description:

```text
AI learning workbench that turns textbooks into guided lessons, questions, practice, and feedback
```

Set Homepage to `https://study-bench.vercel.app` and Topics to:

```text
ai-tutor, edtech, math-analysis, nextjs, react, typescript, katex, self-study, bring-your-own-key
```

Run:

```powershell
gh repo edit Xiaotian69/study-bench --description "AI learning workbench that turns textbooks into guided lessons, questions, practice, and feedback" --homepage "https://study-bench.vercel.app"
gh api --method PUT -H "Accept: application/vnd.github+json" repos/Xiaotian69/study-bench/topics -f "names[]=ai-tutor" -f "names[]=edtech" -f "names[]=math-analysis" -f "names[]=nextjs" -f "names[]=react" -f "names[]=typescript" -f "names[]=katex" -f "names[]=self-study" -f "names[]=bring-your-own-key"
```

Read back `description`, `homepageUrl`, `repositoryTopics`, and `licenseInfo`. Report the Social Preview file for manual upload if upload automation is unavailable.
