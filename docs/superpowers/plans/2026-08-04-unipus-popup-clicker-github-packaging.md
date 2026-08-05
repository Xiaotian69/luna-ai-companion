# Unipus Popup Clicker GitHub Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `U-ai-` to `unipus-popup-clicker` and present it as a transparent local Playwright utility with verified behavior, a safe synthetic demo, bilingual guidance, an MIT license, and accurate GitHub metadata.

**Architecture:** Perform the approved repository rename first, then clone the new slug and keep runtime code unchanged. Demonstrate the existing button-detection behavior against a local synthetic page, document local profile/log handling and intended-use boundaries, and ship repository files through a dedicated PR.

**Tech Stack:** Python 3.10+, Playwright, pytest, Windows batch helpers, Markdown, local HTML demo fixture, deterministic GIF/PNG capture, GitHub CLI.

---

### Task 1: Rename the remote repository safely

**Files:**
- Remote repository: `Xiaotian69/U-ai-`
- New remote repository: `Xiaotian69/unipus-popup-clicker`

- [ ] **Step 1: Capture pre-rename metadata**

Run:

```powershell
gh repo view Xiaotian69/U-ai- --json nameWithOwner,url,defaultBranchRef,description
```

Expected: current repository name is `Xiaotian69/U-ai-` and default branch is `main`.

- [ ] **Step 2: Execute the approved rename**

Run:

```powershell
gh repo rename unipus-popup-clicker --repo Xiaotian69/U-ai- --yes
```

Expected: command exits 0.

- [ ] **Step 3: Verify new URL and old redirect**

Run:

```powershell
gh repo view Xiaotian69/unipus-popup-clicker --json nameWithOwner,url,defaultBranchRef
Invoke-WebRequest -UseBasicParsing 'https://github.com/Xiaotian69/U-ai-' -MaximumRedirection 5 | Select-Object StatusCode,BaseResponse
```

Expected: the new repository resolves; the old public URL redirects to it.

### Task 2: Clone, branch, and validate existing behavior

**Files:**
- Read: `popup_clicker.py`
- Read: `tests/test_popup_clicker.py`
- Read: `requirements.txt`
- Read: `setup_windows.bat`
- Read: `run_windows.bat`

- [ ] **Step 1: Clone the renamed repository and create the branch**

Run:

```powershell
gh repo clone Xiaotian69/unipus-popup-clicker 'E:\Grace\.worktrees\portfolio-packaging\unipus-popup-clicker'
Set-Location 'E:\Grace\.worktrees\portfolio-packaging\unipus-popup-clicker'
git switch -c codex/github-packaging
```

- [ ] **Step 2: Install and run tests in an isolated environment**

Run:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Expected: all current tests pass; `.venv/` remains ignored.

- [ ] **Step 3: Verify CLI help and defaults**

Run:

```powershell
.\.venv\Scripts\python.exe popup_clicker.py --help
```

Confirm documented arguments exactly match `--url`, `--button-text`, `--poll-seconds`, `--profile-dir`, `--log-dir`, and `--headless`.

### Task 3: Build a safe local demonstration

**Files:**
- Create: `docs/assets/demo/notification-fixture.html`
- Create: `docs/assets/demo/demo.gif`
- Create: `docs/assets/screenshots/terminal-and-browser.png`

- [ ] **Step 1: Create the synthetic notification fixture**

Create a local HTML page titled `Notification Demo` with explanatory text and one visible `<button>确定</button>`. It must contain no Unipus branding, copied course content, login form, analytics, or network request.

- [ ] **Step 2: Run the existing utility against the local fixture**

Serve the fixture from localhost and run:

```powershell
.\.venv\Scripts\python.exe popup_clicker.py --url 'http://localhost:8765/docs/assets/demo/notification-fixture.html' --poll-seconds 1
```

Expected: the existing utility opens the page and clicks the visible confirmation button. Stop with Ctrl+C after the click is logged.

- [ ] **Step 3: Capture the synthetic demo**

Record a short, loopable GIF showing the notification appearing and being confirmed, plus a PNG showing the local browser and redacted/synthetic log output. Do not use a real account, real course page, or `.browser-profile/`.

- [ ] **Step 4: Verify demo assets**

Inspect the GIF and PNG. Confirm no user name, profile path outside the repository, cookie, course identifier, or external service UI is visible.

### Task 4: Create brand assets and README

**Files:**
- Create: `docs/assets/hero-source.html`
- Create: `docs/assets/hero.png`
- Create: `docs/assets/social-preview-source.html`
- Create: `docs/assets/social-preview.png`
- Modify: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Compose and render brand assets**

Use tool gray-blue and purple, a checkmark motif, and the synthetic demo. Exact copy:

```text
UNIPUS POPUP CLICKER
Routine dialogs, handled locally.
Python · Playwright · Local browser profile
```

Render hero at 1600×720 and Social Preview at 1280×640; assert dimensions.

- [ ] **Step 2: Rewrite README with bilingual opening**

Use sections:

```markdown
# Unipus Popup Clicker
## What it does / 功能说明
## Demo / 演示
## Safety and intended use / 安全与使用边界
## Windows quick start / Windows 快速开始
## Command-line usage / 命令行使用
## Options / 参数
## Local data and privacy / 本地数据与隐私
## Testing / 测试
## Troubleshooting / 常见问题
## License
```

State clearly that it clicks matching routine notification buttons on a user-provided page, requires the user to authenticate manually when needed, stores browser state only in the ignored local profile directory, and is not affiliated with Unipus.

- [ ] **Step 3: Add intended-use boundaries**

State that users are responsible for platform rules and course requirements. Do not advertise bypassing attendance, learning time, assessments, access controls, or anti-bot measures.

- [ ] **Step 4: Add MIT License**

Use standard MIT text, year `2026`, holder `Xiaotian69`.

### Task 5: Verify, commit, and publish

**Files:**
- Verify README, license, demo, brand assets

- [ ] **Step 1: Run final checks**

Run:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe popup_clicker.py --help
git diff --check
```

Also validate Markdown links, image dimensions, and changed-file secret scan.

- [ ] **Step 2: Confirm runtime code is unchanged**

Run:

```powershell
git diff --exit-code origin/main -- popup_clicker.py tests requirements.txt run_windows.bat setup_windows.bat
```

Expected: exit 0.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add README.md LICENSE docs/assets
git commit -m "docs: package the popup automation utility"
git push -u origin codex/github-packaging
```

- [ ] **Step 4: Create a draft PR**

Title: `docs: package Unipus Popup Clicker for discovery`. Include rename verification, pytest output, synthetic-demo provenance, and intended-use boundary.

- [ ] **Step 5: Update and read back metadata**

Set Description:

```text
Local Playwright utility that watches for routine notification dialogs and confirms them automatically
```

Keep Homepage empty. Set Topics:

```text
python, playwright, browser-automation, desktop-utility, notification, local-first, windows
```

Run:

```powershell
gh repo edit Xiaotian69/unipus-popup-clicker --description "Local Playwright utility that watches for routine notification dialogs and confirms them automatically"
gh api --method PUT -H "Accept: application/vnd.github+json" repos/Xiaotian69/unipus-popup-clicker/topics -f "names[]=python" -f "names[]=playwright" -f "names[]=browser-automation" -f "names[]=desktop-utility" -f "names[]=notification" -f "names[]=local-first" -f "names[]=windows"
```

Read back repository name, Description, Topics, Homepage, and license state. Report the Social Preview upload state accurately.
