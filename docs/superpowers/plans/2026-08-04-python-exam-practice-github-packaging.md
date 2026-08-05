# Python Exam Practice GitHub Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present Python Exam Practice as a verified 151-question browser learning product, correct its stale repository paths, add real screenshots and an MIT license, and expose the working GitHub Pages experience.

**Architecture:** Keep the static application and question data unchanged. Validate the current root-level layout, JSON counts, JavaScript syntax, Pyodide flow, and published Pages site; then rewrite the Chinese README with an English summary and deterministic visual assets.

**Tech Stack:** HTML, CSS, JavaScript, JSON question bank, Pyodide, GitHub Pages, Markdown, Playwright, GitHub CLI.

---

### Task 1: Audit and correct the documentation model

**Files:**
- Read: `README.md`
- Read: `index.html`
- Read: `src/app.js`
- Read: `src/questions.js`
- Read: `src/runner.js`
- Read: `data/questions.json`
- Read: `data/exam_objective_questions.json`

- [ ] **Step 1: Create a clean packaging branch**

Run in `E:\Grace\.worktrees\portfolio-packaging\python-exam-practice`:

```powershell
git fetch origin main
git switch -c codex/github-packaging
git status --short --branch
```

- [ ] **Step 2: Verify the Pages deployment**

Request `https://xiaotian69.github.io/python-exam-practice/`, expect HTTP 200, and visually verify the title `Python 真题冲刺练习`.

- [ ] **Step 3: Prove the actual question counts**

Run a Node.js script that loads `data/questions.json`, groups records by type/source, and prints total counts. Expected: the output supports or corrects the README's claim of 151 questions, including objective, code, and supplemental categories. Use the computed values; do not preserve stale counts if data differs.

- [ ] **Step 4: Identify stale paths**

Confirm that `site/`, `scripts/build_question_data.py`, and `tests/` do not exist on current `main`. The replacement README must use root-level `index.html`, `data/`, `src/`, and `styles.css` only.

### Task 2: Validate the static app and capture screenshots

**Files:**
- Create: `docs/assets/screenshots/question.png`
- Create: `docs/assets/screenshots/code-runner.png`
- Create: `docs/assets/screenshots/progress.png`
- Create: `docs/assets/screenshots/mobile-practice.png`

- [ ] **Step 1: Run JavaScript and JSON checks**

Run:

```powershell
Get-ChildItem src -Filter *.js | ForEach-Object { node --check $_.FullName }
Get-Content -Raw data/questions.json | ConvertFrom-Json | Out-Null
Get-Content -Raw data/exam_objective_questions.json | ConvertFrom-Json | Out-Null
Get-Content -Raw data/sources.json | ConvertFrom-Json | Out-Null
```

Expected: all commands exit 0.

- [ ] **Step 2: Start the static app**

Run `python -m http.server 8000` from repository root in a hidden background process. Verify `http://localhost:8000` returns 200 and question JSON requests succeed.

- [ ] **Step 3: Capture real practice states**

At 1440×1000, capture a representative objective question, a code exercise after Pyodide loads, and progress/results. At 390×844, capture the primary practice flow. Use synthetic answers and reset local storage before capture.

- [ ] **Step 4: Inspect screenshots**

Verify readable questions, no copyrighted full-paper reproduction in the hero, no browser account data, and no console/error overlays.

### Task 3: Generate product assets

**Files:**
- Create: `docs/assets/hero-source.html`
- Create: `docs/assets/hero.png`
- Create: `docs/assets/social-preview-source.html`
- Create: `docs/assets/social-preview.png`

- [ ] **Step 1: Compose the hero and Social Preview**

Use Python blue/yellow, a lightweight code-grid motif, and a real practice screenshot. Exact copy:

```text
PYTHON EXAM PRACTICE
151 questions. One browser tab.
Objective questions · Code exercises · Progress tracking
```

If the verified data count differs, replace `151` everywhere with the verified total.

- [ ] **Step 2: Render and verify images**

Render hero at 1600×720 and Social Preview at 1280×640. Assert dimensions and inspect both scales.

### Task 4: Rewrite README and add license

**Files:**
- Modify: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Write the bilingual top section**

Keep Chinese primary and add a concise English summary. Include hero, live demo badge, question-count badge, Pyodide badge, and MIT badge.

- [ ] **Step 2: Use this exact section order**

```markdown
# Python 真题冲刺练习台
## Try it online / 在线练习
## What is included / 题库构成
## Features / 功能亮点
## Screenshots / 界面展示
## How code exercises work / 代码题运行方式
## Local preview / 本地预览
## Repository structure / 仓库结构
## Data sources and learning-use notice / 数据来源与学习用途
## License
```

Document `python -m http.server 8000` from repository root. Remove all `site/`, missing script, and missing test references.

- [ ] **Step 3: Add MIT License**

Use standard MIT text, year `2026`, holder `Xiaotian69`. Add a README note that the license covers project code and original presentation, not third-party exam/source content where applicable.

- [ ] **Step 4: Validate all README commands and links**

Execute the documented local preview command, open every relative link, and verify the live URL.

### Task 5: Verify, commit, and publish

**Files:**
- Verify: README, license, assets

- [ ] **Step 1: Re-run static and documentation checks**

Run JavaScript syntax checks, JSON parsing, verified count script, Markdown link checks, image dimension checks, and `git diff --check`.

- [ ] **Step 2: Confirm diff scope**

Expected: `README.md`, `LICENSE`, and `docs/assets/` only. No question data or application source changes.

- [ ] **Step 3: Commit, push, and open a draft PR**

Run:

```powershell
git add README.md LICENSE docs/assets
git commit -m "docs: package the Python exam practice experience"
git push -u origin codex/github-packaging
```

Create draft PR `docs: package Python Exam Practice for discovery` with question-count evidence and validation output.

- [ ] **Step 4: Update and read back metadata**

Set Description:

```text
Browser-based Python exam practice with 151 questions and Pyodide code exercises
```

Use the verified count if different. Set Homepage `https://xiaotian69.github.io/python-exam-practice/` and Topics:

```text
python, exam-practice, pyodide, javascript, github-pages, coding-exercises, learning-tool, browser-based
```

After substituting the verified count into `$verifiedDescription`, run:

```powershell
$verifiedDescription = "Browser-based Python exam practice with 151 questions and Pyodide code exercises"
gh repo edit Xiaotian69/python-exam-practice --description $verifiedDescription --homepage "https://xiaotian69.github.io/python-exam-practice/"
gh api --method PUT -H "Accept: application/vnd.github+json" repos/Xiaotian69/python-exam-practice/topics -f "names[]=python" -f "names[]=exam-practice" -f "names[]=pyodide" -f "names[]=javascript" -f "names[]=github-pages" -f "names[]=coding-exercises" -f "names[]=learning-tool" -f "names[]=browser-based"
```

Read back the metadata and report the Social Preview upload state.
