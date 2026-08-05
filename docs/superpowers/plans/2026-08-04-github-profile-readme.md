# Xiaotian69 GitHub Profile README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `Xiaotian69/Xiaotian69` profile repository as a concise bilingual portfolio that positions Xiaotian69 as an AI product builder and full-stack indie developer and routes visitors to the strongest projects.

**Architecture:** Create the special public profile repository only after all existing project branches and PR URLs are stable. Use one maintainable README with English primary copy and concise Chinese equivalents, deterministic local assets, four featured projects, and a smaller More Projects section. The authorized initial commit goes directly to `main`.

**Tech Stack:** GitHub Profile README, Markdown, SVG/PNG assets, GitHub CLI.

---

### Task 1: Verify prerequisites and create the local repository

**Files:**
- Create workspace: `E:\Grace\.worktrees\portfolio-packaging\Xiaotian69`

- [ ] **Step 1: Confirm the profile repository is still absent**

Run:

```powershell
gh repo view Xiaotian69/Xiaotian69
```

Expected: repository-not-found response. If it exists, stop and inspect rather than overwriting it.

- [ ] **Step 2: Verify final project URLs**

Run `gh repo view` for Luna, Study Bench, ModelingBridge, Mystic Destiny, Python Exam Practice, Shanxi Caijing Exams, and Unipus Popup Clicker. Expected: every intended repository slug resolves and Anker is not needed.

- [ ] **Step 3: Initialize the local profile repository**

Run:

```powershell
New-Item -ItemType Directory -Force 'E:\Grace\.worktrees\portfolio-packaging\Xiaotian69' | Out-Null
Set-Location 'E:\Grace\.worktrees\portfolio-packaging\Xiaotian69'
git init -b main
```

### Task 2: Create profile visual assets

**Files:**
- Create: `assets/profile-hero-source.html`
- Create: `assets/profile-hero.png`
- Create: `assets/social-preview-source.html`
- Create: `assets/social-preview.png`

- [ ] **Step 1: Compose the profile hero**

Use deep blue-black, cyan/green accents, and the `XT` symbol. Exact copy:

```text
XIAOTIAN69
AI Product Builder. Full-Stack Maker.
Human-centered AI products · Learning tools · Practical experiments
```

Do not include star counts, contribution streaks, skill percentages, employer claims, or awards.

- [ ] **Step 2: Render and verify images**

Render `profile-hero.png` at 1600×600 and `social-preview.png` at 1280×640. Inspect at full and reduced scale and assert dimensions.

### Task 3: Write the bilingual profile README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the identity block**

Start with the hero and these paired statements:

```text
I design and build AI-native products from problem framing to working software.
我关注 AI 原生产品，也把产品定义、交互设计和完整工程实现连接起来。
```

Keep the tone factual and first-person.

- [ ] **Step 2: Add four featured project cards**

Feature only:

1. Luna — private/self-hostable Chinese AI companion with transparent memory.
2. Study Bench — guided textbook learning loop.
3. ModelingBridge — beginner-focused mathematical modeling workflow.
4. Mystic Destiny — immersive H5 interaction experiment.

Each card includes repository link, one-sentence value, three technologies, and live demo only when verified. Do not include Anker.

- [ ] **Step 3: Add More Projects**

List Python Exam Practice, Shanxi Caijing Exams, and Unipus Popup Clicker in a compact table with purpose and repository link.

- [ ] **Step 4: Add working style and stack**

Use concise sections:

```markdown
## What I build / 我在做什么
## Featured projects / 精选项目
## More projects / 更多项目
## How I work / 我的工作方式
## Stack / 技术栈
```

Describe evidence-backed product definition, real interfaces, privacy/security boundaries, testing, and deployment. List only technologies proven across the selected repositories: TypeScript, React/Next.js, Python/FastAPI, Cloudflare, Vercel, GitHub Actions, Playwright, Vitest/pytest.

- [ ] **Step 5: Validate links and claims**

Open every repository/demo link. Search the README for `Anker`, fake metrics, placeholders, and unverified employer/award claims. Expected: none.

### Task 4: Create and publish the special profile repository

**Files:**
- Publish: `README.md`, `assets/`

- [ ] **Step 1: Verify the local diff and commit**

Run:

```powershell
git add README.md assets
git diff --cached --check
git commit -m "docs: create Xiaotian69 GitHub portfolio"
```

Expected: one initial commit on `main`.

- [ ] **Step 2: Create the public GitHub repository and push**

Run:

```powershell
gh repo create Xiaotian69/Xiaotian69 --public --description "AI product builder and full-stack indie developer" --source . --remote origin --push
```

Expected: repository creation and push succeed. This direct initial `main` publication was explicitly approved in the design.

- [ ] **Step 3: Add Topics and read back metadata**

Set Topics:

```text
portfolio, profile-readme, ai-products, full-stack, indie-developer
```

Run:

```powershell
gh api --method PUT -H "Accept: application/vnd.github+json" repos/Xiaotian69/Xiaotian69/topics -f "names[]=portfolio" -f "names[]=profile-readme" -f "names[]=ai-products" -f "names[]=full-stack" -f "names[]=indie-developer"
```

Read back `nameWithOwner`, `description`, `repositoryTopics`, and default branch.

- [ ] **Step 4: Verify GitHub recognizes the profile README**

Run:

```powershell
gh api repos/Xiaotian69/Xiaotian69/readme --jq '{name,path,html_url}'
```

Then open `https://github.com/Xiaotian69` and visually confirm the README appears on the profile page.

- [ ] **Step 5: Report Social Preview status**

If upload automation is unavailable, provide `assets/social-preview.png` and the exact manual upload location for the repository preview. Do not claim it is active without visible confirmation.
