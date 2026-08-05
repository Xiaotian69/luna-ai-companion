# Xiaotian69 GitHub Portfolio Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a coherent GitHub portfolio across seven existing repositories and one new profile repository, with accurate product narratives, real visuals, licenses, metadata, and reviewable pull requests.

**Architecture:** Treat each repository as an independent delivery unit with its own plan, branch, verification evidence, and PR. Complete existing repositories in four batches, then create the profile repository only after final project URLs and asset paths are stable. Repository files are reviewable through PRs; GitHub Description, Topics, Homepage, and repository rename are verified remote mutations performed with `gh` after the relevant local package is ready.

**Tech Stack:** Git, GitHub CLI, GitHub repository settings, Markdown, HTML/CSS-rendered brand cards, Playwright screenshots, ImageMagick or bundled Python/Pillow for image verification, project-native Node.js/Python validation commands.

---

## Plan Map

| Order | Repository | Detailed plan |
| --- | --- | --- |
| 1 | `luna-ai-companion` | `docs/superpowers/plans/2026-08-04-luna-github-packaging.md` |
| 2 | `study-bench` | `docs/superpowers/plans/2026-08-04-study-bench-github-packaging.md` |
| 3 | `modelingbridge` | `docs/superpowers/plans/2026-08-04-modelingbridge-github-packaging.md` |
| 4 | `mystic-destiny` | `docs/superpowers/plans/2026-08-04-mystic-destiny-github-packaging.md` |
| 5 | `python-exam-practice` | `docs/superpowers/plans/2026-08-04-python-exam-practice-github-packaging.md` |
| 6 | `shanxi-caijing-exams` | `docs/superpowers/plans/2026-08-04-shanxi-caijing-exams-github-packaging.md` |
| 7 | rename then package `U-ai-` | `docs/superpowers/plans/2026-08-04-unipus-popup-clicker-github-packaging.md` |
| 8 | new `Xiaotian69/Xiaotian69` | `docs/superpowers/plans/2026-08-04-github-profile-readme.md` |

## Shared Workspace Layout

Use the existing Luna checkout at `E:\Grace`. Put temporary clones of the other repositories under the ignored directory:

```text
E:\Grace\.worktrees\portfolio-packaging\
├── study-bench\
├── modelingbridge\
├── mystic-destiny\
├── python-exam-practice\
├── shanxi-caijing-exams\
├── unipus-popup-clicker\
└── Xiaotian69\
```

Do not clone or modify `anker-ai-native-product-lab`.

### Task 1: Verify GitHub authority and freeze the repository inventory

**Files:**
- Read: `docs/superpowers/specs/2026-08-04-github-portfolio-packaging-design.md`
- Read: each detailed plan listed above

- [ ] **Step 1: Confirm GitHub authentication and account permissions**

Run:

```powershell
gh auth status
gh api users/Xiaotian69 --jq '{login,html_url,public_repos}'
```

Expected: `gh auth status` reports an authenticated GitHub account with `repo` access; the API reports `login` as `Xiaotian69`.

- [ ] **Step 2: Capture the pre-change repository inventory**

Run:

```powershell
gh repo list Xiaotian69 --limit 100 --source --json name,nameWithOwner,description,homepageUrl,isArchived,isPrivate,pushedAt
```

Expected: the seven in-scope existing repositories and the excluded Anker repository are visible; `Xiaotian69/Xiaotian69` does not yet exist.

- [ ] **Step 3: Verify the Anker exclusion before any write**

Run:

```powershell
gh repo view Xiaotian69/anker-ai-native-product-lab --json nameWithOwner,defaultBranchRef,description,homepageUrl
gh api repos/Xiaotian69/anker-ai-native-product-lab/commits/main --jq .sha
```

Save the returned metadata and commit SHA for the final no-change comparison. Do not run any mutation command against this repository.

### Task 2: Prepare isolated repository checkouts

**Files:**
- Create directory: `.worktrees/portfolio-packaging/`
- Create clones: the five non-Luna, non-Unipus repositories

- [ ] **Step 1: Read and follow the worktree isolation skill**

Invoke `superpowers:using-git-worktrees` before creating or switching implementation workspaces. Preserve existing user work and do not reuse a dirty checkout.

- [ ] **Step 2: Create the portfolio workspace directory**

Run from `E:\Grace`:

```powershell
New-Item -ItemType Directory -Force -Path 'E:\Grace\.worktrees\portfolio-packaging' | Out-Null
```

Expected: the directory exists inside the already ignored `.worktrees/` tree.

- [ ] **Step 3: Clone the five repositories that do not require a remote rename**

Run:

```powershell
gh repo clone Xiaotian69/study-bench 'E:\Grace\.worktrees\portfolio-packaging\study-bench'
gh repo clone Xiaotian69/modelingbridge 'E:\Grace\.worktrees\portfolio-packaging\modelingbridge'
gh repo clone Xiaotian69/mystic-destiny 'E:\Grace\.worktrees\portfolio-packaging\mystic-destiny'
gh repo clone Xiaotian69/python-exam-practice 'E:\Grace\.worktrees\portfolio-packaging\python-exam-practice'
gh repo clone Xiaotian69/shanxi-caijing-exams 'E:\Grace\.worktrees\portfolio-packaging\shanxi-caijing-exams'
```

Expected: each clone is on its default branch with a clean worktree.

The Unipus detailed plan owns its remote rename, redirect verification, clone, and branch creation so the rename cannot be accidentally repeated.

### Task 3: Execute the four repository batches

**Files:**
- Modify only files listed in each repository's detailed plan

- [ ] **Step 1: Complete Luna and create its PR**

Execute every checkbox in `2026-08-04-luna-github-packaging.md`. Stop if validation fails or if remote `main` moved in a way that conflicts with the current branch.

- [ ] **Step 2: Complete Study Bench and ModelingBridge**

Execute their detailed plans independently. Do not reuse screenshots, descriptions, or README prose between the two products.

- [ ] **Step 3: Complete Mystic Destiny and Python Exam Practice**

Execute their detailed plans. Treat published Pages URLs as claims that require a fresh HTTP 200 and visual check.

- [ ] **Step 4: Complete Shanxi Caijing Exams and Unipus Popup Clicker**

Execute their detailed plans. Do not add a software license to the exam-material repository.

### Task 4: Create the profile repository after project URLs stabilize

**Files:**
- Create through detailed plan: `Xiaotian69/Xiaotian69/README.md`
- Create through detailed plan: profile asset files

- [ ] **Step 1: Verify all seven project PR URLs and final repository slugs**

Run:

```powershell
gh pr list --repo Xiaotian69/luna-ai-companion --head codex/github-portfolio-packaging --json url,state
gh pr list --repo Xiaotian69/study-bench --head codex/github-packaging --json url,state
gh pr list --repo Xiaotian69/modelingbridge --head codex/github-packaging --json url,state
gh pr list --repo Xiaotian69/mystic-destiny --head codex/github-packaging --json url,state
gh pr list --repo Xiaotian69/python-exam-practice --head codex/github-packaging --json url,state
gh pr list --repo Xiaotian69/shanxi-caijing-exams --head codex/github-packaging --json url,state
gh pr list --repo Xiaotian69/unipus-popup-clicker --head codex/github-packaging --json url,state
```

Expected: one open PR URL per existing repository.

- [ ] **Step 2: Execute the profile README plan**

Complete `2026-08-04-github-profile-readme.md`, including the direct initial `main` commit authorized in the design.

### Task 5: Portfolio-wide verification and handoff

**Files:**
- Read: all PR diffs and final repository metadata

- [ ] **Step 1: Read back repository metadata**

Run `gh repo view` for every in-scope repository with:

```powershell
--json nameWithOwner,description,homepageUrl,repositoryTopics,licenseInfo,defaultBranchRef
```

Expected: descriptions, topics, homepages, and license states match the detailed plans. Luna's Homepage remains empty.

- [ ] **Step 2: Verify all public links from the profile and README files**

Use a link checker or a PowerShell `Invoke-WebRequest -Method Head` pass for GitHub, demo, documentation, and image URLs. For hosts that reject `HEAD`, retry with `GET`.

Expected: all intended public links return 2xx or a documented GitHub redirect.

- [ ] **Step 3: Verify the excluded repository is unchanged**

Read the Anker default-branch SHA and metadata again. Expected: they match the values captured in Task 1.

- [ ] **Step 4: Produce the final handoff table**

Report one row per repository containing branch, commit, PR URL, metadata status, Social Preview file path, automated verification commands, and any manual Social Preview upload still required.
