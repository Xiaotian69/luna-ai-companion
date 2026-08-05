# Mystic Destiny GitHub Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refocus Mystic Destiny's long feature inventory into a polished, trustworthy H5 product page with a verified live demo, real visual evidence, clear AI/privacy boundaries, an MIT license, and discoverable metadata.

**Architecture:** Preserve the existing single-file H5 application, Worker, mini-program reference code, and Pages workflows. Shorten and restructure the Chinese README, add an English executive summary rather than a second full README, capture the real deployed interface, and generate a product-specific purple/gold visual package.

**Tech Stack:** HTML5, CSS, JavaScript, inline SVG/Canvas, Cloudflare Worker, DeepSeek-compatible API, GitHub Pages, Markdown, Playwright, GitHub CLI.

---

### Task 1: Audit the published product and security claims

**Files:**
- Read: `README.md`
- Read: `index.html`
- Read: `worker.js`
- Read: `.github/workflows/deploy.yml`
- Read: `.github/workflows/static.yml`

- [ ] **Step 1: Create a clean packaging branch**

Run in `E:\Grace\.worktrees\portfolio-packaging\mystic-destiny`:

```powershell
git fetch origin main
git switch -c codex/github-packaging
git status --short --branch
```

- [ ] **Step 2: Verify the GitHub Pages deployment**

Request `https://xiaotian69.github.io/mystic-destiny/`, expect HTTP 200, and visually confirm the loaded interface is `命理星象`.

- [ ] **Step 3: Reconcile README claims with implemented tabs and data flow**

Verify the current H5 contains fortune, tarot, zodiac/analysis, AI conversation, calendar, profile/local storage, share card, achievement, and intro-animation behavior before retaining each claim. Verify which operations are local calculations and which require the Worker/AI provider.

- [ ] **Step 4: Perform a read-only secret and endpoint audit**

Search tracked files for key-shaped values and private credentials. Confirm `worker.js` reads secrets from environment bindings. Treat a public Worker URL as an endpoint, not as proof that an API key is exposed. The README examples must use `https://your-worker.workers.dev`, never the author's concrete endpoint.

### Task 2: Validate static assets and capture real screenshots

**Files:**
- Create: `docs/assets/screenshots/home-fortune.png`
- Create: `docs/assets/screenshots/tarot-reading.png`
- Create: `docs/assets/screenshots/fortune-calendar.png`
- Create: `docs/assets/screenshots/mobile-home.png`

- [ ] **Step 1: Run static syntax checks**

Run:

```powershell
node --check worker.js
node --check cloudfunctions/quickstartFunctions/index.js
```

Expected: both exit 0.

- [ ] **Step 2: Start a local static server**

Run `python -m http.server 8080` in a hidden background process and verify `http://localhost:8080` returns 200. Use the deployed Pages site only if the local file depends on production-only configuration.

- [ ] **Step 3: Capture real product views**

At 390×844, capture the home fortune screen, tarot reading flow using synthetic input, and calendar. At 1440×1000, capture one representative desktop view. Save the exact PNG paths above.

- [ ] **Step 4: Inspect screenshots and claims**

Confirm no real birth date, chat, account data, Worker secrets, or browser profile appears. Add a small README caption that generated readings are for entertainment and reflection.

### Task 3: Create Mystic Destiny brand assets

**Files:**
- Create: `docs/assets/hero-source.html`
- Create: `docs/assets/hero.png`
- Create: `docs/assets/social-preview-source.html`
- Create: `docs/assets/social-preview.png`

- [ ] **Step 1: Compose the hero**

Use the existing deep purple and gold visual language, a star/tarot geometry motif, and real H5 screenshots. Exact copy:

```text
MYSTIC DESTINY · 命理星象
Ancient symbols. Modern interaction.
Fortune · Tarot · Astrology · AI interpretation
```

- [ ] **Step 2: Render and validate assets**

Render `hero.png` at 1600×720 and `social-preview.png` at 1280×640. Inspect at full and reduced size; the design must not resemble a financial, medical, or certainty claim.

### Task 4: Restructure README and add license

**Files:**
- Modify: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Write a concise bilingual opening**

Keep Chinese as the main language. Start with the hero, live demo, badges, a two-sentence English summary, then the Chinese product overview. Use these sections:

```markdown
# 命理星象 · Mystic Destiny
## Live experience / 在线体验
## What it is / 项目简介
## Highlights / 核心体验
## Screenshots / 界面展示
## How it works / 工作方式
## Local use / 本地运行
## Optional AI setup / 可选 AI 接入
## Privacy, safety, and limitations / 隐私、安全与边界
## Project structure / 项目结构
## License
```

- [ ] **Step 2: Replace the exhaustive feature catalog with grouped highlights**

Keep only verified high-signal capabilities. Move implementation details such as rpx conversion and mini-program tag mappings out of the product narrative; retain them only if they materially help contributors.

- [ ] **Step 3: Add safety and independence statements**

State that readings are for entertainment and self-reflection, not medical/legal/financial advice or guaranteed prediction. State that the project is independent and not affiliated with DeepSeek or other named providers.

- [ ] **Step 4: Add MIT License**

Create standard MIT text with year `2026` and holder `Xiaotian69`. Clarify in README that third-party trademarks and platform names remain with their owners.

### Task 5: Verify, commit, and publish

**Files:**
- Verify README, license, and assets

- [ ] **Step 1: Re-run static validation and link checks**

Run JavaScript syntax checks, request the live demo, validate Markdown links, assert image dimensions, scan changed files for secrets, and run `git diff --check`.

- [ ] **Step 2: Confirm diff scope**

Expected changed paths: `README.md`, `LICENSE`, and `docs/assets/` only. No H5, Worker, mini-program, or workflow file changes.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add README.md LICENSE docs/assets
git commit -m "docs: package Mystic Destiny as an H5 experience"
git push -u origin codex/github-packaging
```

- [ ] **Step 4: Create a draft PR**

Title: `docs: package Mystic Destiny for GitHub discovery`. Include demo verification, static checks, screenshot provenance, and the safety statement.

- [ ] **Step 5: Update and read back metadata**

Set Description:

```text
Immersive Chinese astrology and tarot H5 experience with optional DeepSeek-powered interpretations
```

Set Homepage `https://xiaotian69.github.io/mystic-destiny/` and Topics:

```text
h5, tarot, chinese-astrology, generative-ui, deepseek, cloudflare-workers, github-pages, vanilla-javascript
```

Run:

```powershell
gh repo edit Xiaotian69/mystic-destiny --description "Immersive Chinese astrology and tarot H5 experience with optional DeepSeek-powered interpretations" --homepage "https://xiaotian69.github.io/mystic-destiny/"
gh api --method PUT -H "Accept: application/vnd.github+json" repos/Xiaotian69/mystic-destiny/topics -f "names[]=h5" -f "names[]=tarot" -f "names[]=chinese-astrology" -f "names[]=generative-ui" -f "names[]=deepseek" -f "names[]=cloudflare-workers" -f "names[]=github-pages" -f "names[]=vanilla-javascript"
```

Read back metadata and report the Social Preview upload state accurately.
