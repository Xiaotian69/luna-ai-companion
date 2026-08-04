# Xiaotian69 GitHub 作品集包装设计规格

## 1. 背景

Xiaotian69 账号当前有 8 个公开仓库。多数仓库已经具备可运行产品、学习工具或资料价值，但 README、仓库元信息、视觉素材和账号级叙事不一致，导致访问者难以快速理解项目价值，也不利于 GitHub 搜索、社交分享和作品集展示。

本次工作把账号定位为：

> **AI Product Builder & Full-Stack Indie Developer**

作品集需要同时证明两件事：作者能够定义有清晰用户价值的 AI 产品，也能够独立完成前端、后端、模型接入、部署、测试和安全边界。

## 2. 目标

1. 完善 7 个现有仓库的产品定位、README、真实截图、GitHub 元信息和分享素材。
2. 新建 `Xiaotian69/Xiaotian69` 个人主页仓库，把分散项目组织成清晰的账号级作品集。
3. 让访问者先理解产品价值，再验证工程可信度，最后快速找到运行、部署或使用入口。
4. 提升 GitHub 搜索可发现性，同时确保 Description、Topics、截图和功能描述与当前代码一致。
5. 为代码型项目补充 MIT License；对包含第三方考试资料的仓库保留独立版权和下架机制，不错误授予第三方内容许可。

## 3. 范围

### 3.1 纳入范围

- `Xiaotian69/luna-ai-companion`
- `Xiaotian69/study-bench`
- `Xiaotian69/modelingbridge`
- `Xiaotian69/mystic-destiny`
- `Xiaotian69/python-exam-practice`
- `Xiaotian69/shanxi-caijing-exams`
- `Xiaotian69/U-ai-`，先重命名为 `Xiaotian69/unipus-popup-clicker`
- 新建 `Xiaotian69/Xiaotian69` 个人主页仓库

### 3.2 明确排除

`Xiaotian69/anker-ai-native-product-lab` 不修改 README、文件、仓库元信息、Topics、Homepage、Social Preview、分支或发布状态，也不在个人主页精选项目中展示。

### 3.3 非目标

- 不为了包装而新增产品功能或重构应用代码。
- 不把规划中、未部署或未验证的功能写成已实现能力。
- 不伪造用户数量、性能指标、比赛成绩、用户评价或第三方背书。
- 不为考试资料仓库添加 MIT 等可能被误解为重新授权资料内容的许可证。
- 不创建 Issue 模板、行为准则、贡献者治理或版本发布体系；这些内容等项目产生真实社区活动后再补充。
- 不修改 Anker 项目，也不在本轮处理其比赛结果或归档状态。

## 4. 作品集分层

### 4.1 旗舰项目

#### 个人主页

定位：AI 产品构建者与全栈独立开发者的作品集入口。

首页精选 `Luna`、`Study Bench`、`ModelingBridge`、`Mystic Destiny` 四项；`Python Exam Practice`、`Shanxi Caijing Exams` 和 `Unipus Popup Clicker` 放入 `More Projects`。个人主页采用英文主叙事与中文补充，保持简洁，不使用夸张统计徽章或自动生成的活动噪声。

#### Luna

定位：有边界、可自托管、记忆透明可控的中文 AI 伴侣。

默认 `README.md` 使用英文，`README.zh-CN.md` 使用中文。当前 `main` 已实现的 Cloudflare 版本是正文主体；“本地优先 + 混合提供商”只出现在 `Roadmap`，不得写成当前能力。

核心主张：

> A private AI companion that remembers what matters.

#### Study Bench

定位：把教材学习组织为“讲解—提问—练习—反馈”的 AI 学习工作台。

默认英文 README，单独提供中文 README。重点展示课程结构、学习循环、在线体验和 AI 辅导边界，不能仅以“AI Math Tutor”概括整个产品。

#### ModelingBridge

定位：面向数学建模初学者的 AI 引导式学习平台，帮助用户从题目理解走向可验证模型。

默认英文 README，单独提供中文 README。删除当前面向本机作者的交接式表达、绝对路径和“你提供的文档”等上下文，改为公共项目说明；保留清晰的小白运行指南，但放在 Quick Start 之后。

### 4.2 完整产品

#### Mystic Destiny

定位：东方命理、塔罗与现代 AI 交互结合的沉浸式 H5 实验。

保留中文主 README，在顶部增加英文摘要和语言锚点。突出在线体验、视觉交互和本地数据边界；同时明确占卜内容用于娱乐和自我反思，不构成医疗、法律、财务或现实决策建议。AI 接入和 Worker 配置说明必须经过安全检查，不展示作者私有服务端点或密钥。

#### Python Exam Practice

定位：包含 151 道题和浏览器内代码练习的 Python 真题冲刺练习台。

保留中文主 README，在顶部增加英文摘要。现有 README 中引用的 `site/`、`scripts/` 和 `tests/` 路径与当前仓库根目录不一致，实施时必须以真实目录为准修正文档，不得保留无法执行的命令。若 GitHub Pages 已启用且可访问，则设置 Homepage 并把在线练习放在首屏；否则只提供经过验证的本地启动方式。

### 4.3 实用资源与工具

#### Shanxi Caijing Exams

定位：山西财经大学期末资料的可检索公开索引，强调分类、清单和校验哈希，而不是将资料包装成作者原创内容。

README 使用中文，增加简短英文摘要。展示 121 份资料、分类入口、`INDEX.md`、`MANIFEST.csv` 和哈希用途；补充资料贡献、纠错、隐私与下架流程。仓库不添加 MIT License；README 明确仓库结构和整理工作不改变原资料权利归属，也不鼓励商业传播。

#### Unipus Popup Clicker

将 `U-ai-` 重命名为 `unipus-popup-clicker`。GitHub 会重定向旧 URL，但实施后需要检查 README、徽章和个人主页中所有链接均使用新名称。

定位：本地运行的 Playwright 通知弹窗自动处理工具。完整包装可包括英文摘要、中文使用说明、演示 GIF 或真实截图、参数表、隐私说明和故障排查。文案只描述自动检测并确认常规通知弹窗的实际能力，不宣称绕过学习、考勤、访问控制或平台限制，也不暗示与 Unipus 官方有关联。

## 5. README 共同信息架构

旗舰项目采用以下顺序：

1. 品牌横幅、核心主张、语言切换和状态徽章。
2. 两至三句产品说明，回答“为谁解决什么问题”。
3. 主界面真实截图与在线体验或 Quick Start 入口。
4. `Why`：产品差异和设计边界。
5. `Highlights`：面向用户的能力，而不是依赖清单。
6. `Screenshots`：主流程、关键管理页和移动端。
7. `How it works`：简洁架构图或学习流程图。
8. `Quick Start`：最短可执行路径。
9. `Configuration`、`Security`、`Testing` 和必要的部署说明。
10. `Roadmap`：只列明确未完成的方向。
11. `License` 与相关声明。

完整产品、资源和小工具使用同一逻辑但缩短篇幅：不为简单项目堆叠空洞章节，也不复制统一模板中的无关内容。

## 6. 视觉系统

### 6.1 共同规则

- Social Preview 使用 1280×640 比例。
- 固定构图为左上项目名、两行核心主张、简短说明和三枚能力标签。
- 各项目使用独立色彩和符号，但保持相同排版家族，形成账号级作者辨识度。
- 品牌横幅可使用设计化界面构图；功能截图必须来自真实运行版本。
- 不使用通用 AI 女性头像，不使用无法证明版权来源的图片，不把概念稿伪装成产品截图。
- 横幅尽量使用短英文主张，使英文和中文 README 共用素材；正文负责完整本地化说明。

### 6.2 项目视觉方向

- 个人主页：深蓝黑 + 青绿，符号 `XT`，强调产品、设计、工程的交叉能力。
- Luna：月夜紫 + 暖玫瑰，符号月相，强调陪伴、记忆和边界。
- Study Bench：学习蓝，符号 `∑`，强调结构化学习循环。
- ModelingBridge：建模青，符号 `M`，强调从问题到模型的桥梁。
- Mystic Destiny：深紫 + 金，符号星芒，延续现有东方神秘视觉。
- Python Exam Practice：Python 蓝 + 黄，符号 `Py`，强调题量和浏览器练习。
- Shanxi Caijing Exams：纸张棕 + 印章红，符号“卷”，强调资料索引而非商业产品。
- Unipus Popup Clicker：工具灰蓝 + 紫，符号勾选，强调本地自动化。

### 6.3 素材位置

各仓库优先使用：

```text
docs/assets/
├── hero.png
├── social-preview.png
└── screenshots/
```

已有稳定素材目录的仓库可以沿用原结构，避免无价值搬迁。README 使用相对路径，图片文件名使用小写英文和连字符。

GitHub Description、Topics 和 Homepage 通过 GitHub API 或 `gh` 更新。Social Preview 图片生成并提交到仓库；若当前 GitHub 工具不支持上传 Social Preview，则交付明确文件路径和一次性手动上传步骤，不伪称已经上传。

## 7. GitHub 元信息设计

### 7.1 Description 原则

- 使用一条完整、可搜索的产品句，不使用“awesome”“revolutionary”等空泛形容词。
- 英文优先覆盖全球搜索；中文专有项目可保留中英文组合。
- Description 只能描述当前可用能力。

建议文案：

- Luna：`Self-hostable Chinese AI companion with streaming chat, transparent long-term memory, and natural voice`
- Study Bench：`AI learning workbench that turns textbooks into guided lessons, questions, practice, and feedback`
- ModelingBridge：`AI-guided learning platform for mathematical modeling beginners — from problem framing to model validation`
- Mystic Destiny：`Immersive Chinese astrology and tarot H5 experience with optional DeepSeek-powered interpretations`
- Python Exam Practice：`Browser-based Python exam practice with 151 questions and Pyodide code exercises`
- Shanxi Caijing Exams：`山西财经大学历年期末真题与复习资料的可检索公开索引`
- Unipus Popup Clicker：`Local Playwright utility that watches for routine notification dialogs and confirms them automatically`

实施时若代码审计发现描述与现状不一致，应收窄文案，不得扩大能力。

### 7.2 Topics 原则

每个仓库使用 6–10 个精准 Topics，由以下三类组成：

- 用途：`ai-companion`、`edtech`、`exam-practice`、`browser-automation`
- 技术：`react`、`typescript`、`fastapi`、`cloudflare-pages`、`playwright`、`pyodide`
- 特性或受众：`self-hosted`、`long-term-memory`、`mathematical-modeling`、`chinese`

不添加与代码无关的热门词，不把 Roadmap 技术写入 Topics。

### 7.3 Homepage 原则

- 已有并经过 HTTP 与实际界面验证的在线站点才设置 Homepage。
- Luna 当前没有公开体验地址，保持 Homepage 为空。
- Study Bench、ModelingBridge 和 Mystic Destiny 验证现有地址后设置。
- Python Exam Practice 仅在确认 GitHub Pages 实际可访问后设置。
- 资料仓库和本地工具不虚构在线演示。

## 8. 许可证与权利边界

以下代码仓库添加 MIT License：

- `luna-ai-companion`
- `study-bench`
- `modelingbridge`
- `mystic-destiny`
- `python-exam-practice`
- `unipus-popup-clicker`

`shanxi-caijing-exams` 不添加 MIT License。其 README 需要明确：资料仅供学习交流，原文件权利归各自权利人，仓库所有者接受纠错、隐私和下架请求，整理清单与哈希不构成对内容的重新授权。

## 9. 发布策略

所有现有仓库使用独立分支和独立 Pull Request，不直接提交到 `main`。建议分支统一使用 `codex/github-packaging`；若仓库已有同名分支，则使用带日期的唯一名称。

发布批次：

1. Luna。
2. Study Bench 与 ModelingBridge。
3. Mystic Destiny 与 Python Exam Practice。
4. Shanxi Caijing Exams 与 Unipus Popup Clicker。
5. 所有项目 URL 和素材稳定后，创建个人主页仓库并直接提交首个 `main` 版本。

每个 PR 只包含对应仓库的包装、许可证、元信息配套文件和必要的文档纠错。若验证发现应用代码缺陷，只在 PR 描述中记录，不在本轮顺带修复，除非该缺陷仅是文档路径或静态素材引用错误。

## 10. 验证与质量门

每个仓库在创建 PR 前完成：

1. 读取真实目录、配置和当前分支，核对 README 的文件路径、命令和功能表述。
2. 运行仓库已有的最低成本质量命令；至少包含构建或静态页面启动验证，存在测试时运行相关测试。
3. 通过本地或已部署站点获取真实截图，检查截图不含密钥、账号、私人数据或登录状态。
4. 检查所有 README 相对链接、语言切换、图片路径和外部 URL。
5. 检查 Social Preview 尺寸为 1280×640，并在缩小预览下保持主标题可读。
6. 检查 `git diff`，确保没有构建产物、缓存、环境文件、凭据或无关用户改动。
7. 对双语 README 核对章节和事实一致性；中文和英文可以自然表达，不要求逐句机械翻译。
8. 对 GitHub Description、Topics、Homepage 的远程更新读取回验。
9. 创建独立 PR，并在 PR 描述中列出定位、主要文件、验证命令、截图来源和仍需手动完成的 GitHub 设置。

## 11. 风险与处理

### 11.1 过度包装

所有主张必须能被当前代码、在线站点、截图或仓库数据验证。没有公开 Demo 的项目不放“Live Demo”徽章，未来功能进入 Roadmap。

### 11.2 第三方权利

考试资料不重新授权；Mystic Destiny 的命理内容增加娱乐与反思用途说明；Unipus Popup Clicker 不暗示官方合作，也不宣传规避平台规则。

### 11.3 远程状态变化

每个仓库开始实施前重新读取默认分支、开放 PR、最新提交和工作树状态。若远程已有新改动，基于最新默认分支创建包装分支，不覆盖他人工作。

### 11.4 维护成本

只有旗舰项目维护双文件双语 README。其他项目采用中文主文档加英文摘要，避免简单项目承担不必要的双份同步成本。

## 12. 验收标准

- 7 个纳入范围的现有仓库各有一个独立、可审核的包装 PR。
- `U-ai-` 已按批准重命名为 `unipus-popup-clicker`，旧链接重定向有效。
- 6 个代码项目包含 MIT License；考试资料仓库没有错误授权。
- 旗舰项目拥有准确的双语 README、真实截图、架构或流程说明和 Roadmap 边界。
- 其他项目拥有与规模匹配的 README、真实入口、视觉素材和清晰使用说明。
- GitHub Description、Topics、Homepage 读取回验与 README 一致。
- Social Preview 文件全部生成；可调用的上传流程完成，不可调用的上传项有明确手动步骤。
- 新建 `Xiaotian69/Xiaotian69` 个人主页仓库，准确展示账号定位和精选项目。
- Anker 仓库没有任何文件或远程元信息变化。
