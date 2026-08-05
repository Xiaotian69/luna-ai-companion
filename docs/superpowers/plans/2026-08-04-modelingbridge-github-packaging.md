# ModelingBridge GitHub Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ModelingBridge's internal handoff-style README with a bilingual public product page that demonstrates its guided modeling workflow, runnable architecture, real interface, and beginner-focused value.

**Architecture:** Preserve the React/Vite frontend, FastAPI backend, cases, and AI/demo behavior. Audit current routes and deployment, capture the live or local product, create product-specific assets, and document a clean frontend/backend setup without personal absolute paths or historical author-to-agent instructions.

**Tech Stack:** React 18, Vite, TypeScript, FastAPI, Python, Vitest, pytest, Vercel, Render, Markdown, Mermaid, Playwright, GitHub CLI.

---

### Task 1: Establish current public product truth

**Files:**
- Read: `README.md`
- Read: `frontend/package.json`
- Read: `backend/requirements.txt`
- Read: `backend/app/main.py`
- Read: `frontend/src/App.tsx`
- Read: `frontend/src/pages/`
- Read: `docs/deploy-vercel-render.md`

- [ ] **Step 1: Create a clean packaging branch**

Run in `E:\Grace\.worktrees\portfolio-packaging\modelingbridge`:

```powershell
git fetch origin main
git switch -c codex/github-packaging
git status --short --branch
```

- [ ] **Step 2: Verify the public frontend**

Request `https://modelingbridge.vercel.app`, expect HTTP 200, and visually confirm the page title `模桥 ModelingBridge — AI 引导式数学建模学习`.

- [ ] **Step 3: Inventory implemented flows**

Verify in source: home, learning path, guided workbench, case library, tools/resources, records or local progress, compliance content, FastAPI health/case/workbench resources, optional LLM configuration, and demo fallback. Do not infer capabilities from `docs/trial/` alone.

- [ ] **Step 4: List public README content to remove**

Remove or rewrite these patterns from the public README: `e:\数模网站开发`, “你提供的文档”, “你的微信里的”, agent handoff instructions, and statements tied to one author's local folder. Preserve useful setup steps in repository-relative form.

### Task 2: Run frontend and backend validation

**Files:**
- Verify existing tests under `frontend/src/**/*.test.*`
- Verify: `backend/tests/test_resources.py`

- [ ] **Step 1: Validate the frontend**

Run from `frontend/`:

```powershell
npm ci
npm test
npm run build
```

Expected: Vitest and Vite build exit 0.

- [ ] **Step 2: Validate the backend in an isolated virtual environment**

Run from repository root:

```powershell
python -m venv backend/.venv
backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
backend\.venv\Scripts\python.exe -m pytest backend/tests -q
```

Expected: backend tests pass. The ignored `backend/.venv/` remains untracked.

- [ ] **Step 3: Start the local stack without model credentials**

Start FastAPI from `backend/` on port 8000 and Vite from `frontend/` on port 5173 in hidden background processes. Verify `/api/health` and the frontend return 200. Use the documented demo fallback; do not insert a real API key for screenshots.

### Task 3: Capture real screenshots and brand assets

**Files:**
- Create: `docs/assets/screenshots/home.png`
- Create: `docs/assets/screenshots/guided-workbench.png`
- Create: `docs/assets/screenshots/case-library.png`
- Create: `docs/assets/screenshots/mobile-path.png`
- Create: `docs/assets/hero-source.html`
- Create: `docs/assets/hero.png`
- Create: `docs/assets/social-preview-source.html`
- Create: `docs/assets/social-preview.png`

- [ ] **Step 1: Capture the primary product flow**

At 1440×1000, capture the home page, guided workbench using a repository-provided demo problem, and case library. At 390×844, capture the learning-path or quest flow. Use no personal records or model keys.

- [ ] **Step 2: Build the ModelingBridge hero**

Use modeling teal, a bridge/grid motif, and a real workbench crop. Use exact copy:

```text
MODELINGBRIDGE · 模桥
From a messy problem to a testable model.
Frame · Choose · Build · Validate
```

- [ ] **Step 3: Render and verify assets**

Render `hero.png` at 1600×720 and Social Preview at 1280×640. The Social Preview subtitle is `AI-guided mathematical modeling for beginners.` Inspect every image and assert dimensions.

### Task 4: Write public bilingual documentation and license

**Files:**
- Modify: `README.md`
- Create: `README.zh-CN.md`
- Create: `LICENSE`

- [ ] **Step 1: Write the English README**

Use sections:

```markdown
# ModelingBridge
[hero, language switch, live/build/React/FastAPI/license badges]

## Learn modeling as a process
## Guided workflow
## Features
## Screenshots
## Architecture
## Quick start
## Configuration
## Testing
## Deployment
## Responsible AI and learning boundaries
## Roadmap
## License
```

Include a Mermaid diagram for Browser → Vite frontend → FastAPI → case JSON / optional OpenAI-compatible provider. Describe demo fallback accurately.

- [ ] **Step 2: Write the Chinese README**

Mirror the same facts and links. Put the beginner-friendly Windows `.bat` option after the cross-platform Quick Start, not before product explanation.

- [ ] **Step 3: Add MIT License**

Use standard MIT text, year `2026`, holder `Xiaotian69`.

- [ ] **Step 4: Validate public language**

Search both README files for absolute drive paths, second-person handoff phrases, unfinished placeholder markers, fake metrics, and unimplemented claims. Expected: none remain.

### Task 5: Verify, commit, and publish

**Files:**
- Verify all documentation and asset changes

- [ ] **Step 1: Re-run the complete validation suite**

Run:

```powershell
Set-Location frontend
npm test
npm run build
Set-Location ..
backend\.venv\Scripts\python.exe -m pytest backend/tests -q
git diff --check
```

Expected: all exit 0.

- [ ] **Step 2: Validate links, image dimensions, and diff scope**

Expected: all README links resolve; hero is 1600×720; Social Preview is 1280×640; only `README.md`, `README.zh-CN.md`, `LICENSE`, and `docs/assets/` changed.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add README.md README.zh-CN.md LICENSE docs/assets
git commit -m "docs: present ModelingBridge as a guided learning platform"
git push -u origin codex/github-packaging
```

- [ ] **Step 4: Create a draft PR**

Title: `docs: package ModelingBridge for GitHub discovery`. Include frontend/backend validation results, live URL verification, and screenshot provenance.

- [ ] **Step 5: Update and read back GitHub metadata**

Set Description:

```text
AI-guided learning platform for mathematical modeling beginners — from problem framing to model validation
```

Set Homepage `https://modelingbridge.vercel.app` and Topics:

```text
mathematical-modeling, edtech, ai-tutor, react, typescript, vite, fastapi, python, beginner-friendly
```

Run:

```powershell
gh repo edit Xiaotian69/modelingbridge --description "AI-guided learning platform for mathematical modeling beginners — from problem framing to model validation" --homepage "https://modelingbridge.vercel.app"
gh api --method PUT -H "Accept: application/vnd.github+json" repos/Xiaotian69/modelingbridge/topics -f "names[]=mathematical-modeling" -f "names[]=edtech" -f "names[]=ai-tutor" -f "names[]=react" -f "names[]=typescript" -f "names[]=vite" -f "names[]=fastapi" -f "names[]=python" -f "names[]=beginner-friendly"
```

Read back all fields and report the Social Preview file/manual upload state accurately.
