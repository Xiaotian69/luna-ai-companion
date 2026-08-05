# Shanxi Caijing Exams GitHub Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the exam-material repository into a clear, searchable, rights-aware public index that foregrounds its manifest, statistics, correction path, and takedown process without claiming ownership of source materials.

**Architecture:** Make no changes to exam files. Derive counts and categories from `MANIFEST.csv` and `INDEX.md`, rewrite the README around discovery and stewardship, generate non-document visual assets from aggregate statistics only, and update metadata without adding a software license or public demo.

**Tech Stack:** Markdown, CSV, SHA hashes, PowerShell validation, deterministic HTML/CSS-to-PNG rendering, GitHub CLI.

---

### Task 1: Verify inventory and rights boundary

**Files:**
- Read: `README.md`
- Read: `INDEX.md`
- Read: `MANIFEST.csv`
- Read: `政治经济学-历年真题/README.md`
- Do not modify: `全部资料/**`
- Do not modify: `政治经济学-历年真题/*.{pdf,doc,docx}`

- [ ] **Step 1: Create a clean packaging branch**

Run in `E:\Grace\.worktrees\portfolio-packaging\shanxi-caijing-exams`:

```powershell
git fetch origin main
git switch -c codex/github-packaging
git status --short --branch
```

- [ ] **Step 2: Compute inventory statistics from tracked data**

Run:

```powershell
$manifest = Import-Csv -Encoding UTF8 MANIFEST.csv
$manifest.Count
$manifest | Group-Object MaterialType | Sort-Object Count -Descending | Select-Object Name,Count
$manifest | Group-Object Subject | Sort-Object Count -Descending | Select-Object Name,Count
```

Expected headers are `SourcePeriod`, `OriginalRelativePath`, `OrganizedRelativePath`, `PoliticalEconomyExamPath`, `Subject`, `MaterialType`, `Extension`, `SizeBytes`, and `SHA256`. Record total files, material types, and subject counts from these columns rather than copying stale README values.

- [ ] **Step 3: Verify manifest hashes without rewriting source files**

Sample at least five rows across PDF, image, DOC, and DOCX extensions. Resolve each file from `OrganizedRelativePath`, recompute it with `Get-FileHash -Algorithm SHA256`, and compare the uppercase hash with the row's `SHA256`. Expected: every sampled hash matches.

- [ ] **Step 4: Freeze the source-material diff**

Run before edits:

```powershell
git diff --name-only origin/main...HEAD -- '全部资料/**' '政治经济学-历年真题/**'
```

Expected: no output.

### Task 2: Create aggregate-only visual assets

**Files:**
- Create: `docs/assets/hero-source.html`
- Create: `docs/assets/hero.png`
- Create: `docs/assets/social-preview-source.html`
- Create: `docs/assets/social-preview.png`

- [ ] **Step 1: Compose the resource hero**

Use paper brown, muted stamp red, a catalog/grid motif, and aggregate statistics only. Exact primary copy:

```text
山西财经大学期末资料索引
可检索 · 有清单 · 可校验
```

Show the verified file count, `INDEX.md`, `MANIFEST.csv`, and hash availability. Do not embed or thumbnail exam pages.

- [ ] **Step 2: Render and verify assets**

Render hero at 1600×720 and Social Preview at 1280×640. Inspect for readable Chinese and confirm no source document content or personal information is reproduced.

### Task 3: Rewrite the rights-aware README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a concise English summary and Chinese navigation**

Start with the hero and this English summary:

```text
A searchable public index of final-exam and study materials for Shanxi University of Finance and Economics, organized with a manifest and integrity hashes.
```

- [ ] **Step 2: Use this section order**

```markdown
# 山西财经大学期末资料索引
## 快速查找
## 资料统计
## 仓库结构
## 如何使用 INDEX 与 MANIFEST
## 提交资料与纠错
## 隐私、版权与下架
## 完整性说明
```

Link directly to `INDEX.md`, `MANIFEST.csv`, and the political-economy subset. Use computed counts.

- [ ] **Step 3: Add contribution and correction instructions inside README**

Require contributors to provide subject, academic year, material type, source/permission context, and removal of names/student IDs before submission. Direct correction or takedown requests to a GitHub Issue without promising a fixed response time.

- [ ] **Step 4: Add the rights statement**

State explicitly: repository organization, indexes, and hashes do not transfer or relicense rights in the underlying files; materials are for learning exchange; rights holders may request removal; commercial redistribution is not authorized by this repository.

- [ ] **Step 5: Confirm no license file is created**

Run `Test-Path LICENSE`. Expected: `False`. Do not add an MIT or Creative Commons badge.

### Task 4: Verify, commit, and publish

**Files:**
- Verify: `README.md`, `docs/assets/`

- [ ] **Step 1: Recompute README statistics**

Compare every numeric README claim with `MANIFEST.csv` and `INDEX.md`. Expected: exact agreement.

- [ ] **Step 2: Validate links, images, and source-file immutability**

Run Markdown link checks, image dimension checks, `git diff --check`, and:

```powershell
git diff --name-only origin/main...HEAD -- '全部资料/**' '政治经济学-历年真题/*.*'
```

Expected: no source exam/document files changed.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add README.md docs/assets
git commit -m "docs: turn the exam archive into a searchable index"
git push -u origin codex/github-packaging
```

- [ ] **Step 4: Create a draft PR**

Title: `docs: improve discovery and rights guidance`. Include computed counts, hash sample results, and explicit confirmation that no source material or license changed.

- [ ] **Step 5: Update and read back metadata**

Set Description:

```text
山西财经大学历年期末真题与复习资料的可检索公开索引
```

Keep Homepage empty. Set Topics:

```text
sxufe, shanxi-caijing-university, exam-papers, final-exams, study-materials, open-index, manifest
```

Run:

```powershell
gh repo edit Xiaotian69/shanxi-caijing-exams --description "山西财经大学历年期末真题与复习资料的可检索公开索引"
gh api --method PUT -H "Accept: application/vnd.github+json" repos/Xiaotian69/shanxi-caijing-exams/topics -f "names[]=sxufe" -f "names[]=shanxi-caijing-university" -f "names[]=exam-papers" -f "names[]=final-exams" -f "names[]=study-materials" -f "names[]=open-index" -f "names[]=manifest"
```

Read back metadata and confirm `licenseInfo` remains empty. Report the Social Preview upload state.
