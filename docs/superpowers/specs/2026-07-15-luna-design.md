# Luna AI 陪伴聊天网页设计

## 目标与范围

Luna 是一个仅供单用户使用的中文 AI 陪伴聊天网页。首版交付完整的文字聊天、历史记录、上下文压缩、长期记忆、MiniMax 语音、单用户访问保护、用量限制和响应式界面，不包含注册、多智能体、数字人、视频通话、主动推送或语音克隆。

成功标准：项目可在本地通过 Wrangler 启动，所有密钥只存在于服务端变量，核心流程有自动化测试，D1 迁移可重复执行，并具备 Cloudflare Pages 与 GitHub 部署说明。

## 技术方案

采用单仓库全栈架构：React、Vite、TypeScript 严格模式与 Tailwind CSS 构建 SPA；Cloudflare Pages Functions 提供同源 API；Cloudflare D1 持久化数据。前后端共享 API 类型和运行时校验规则，但 UI、业务服务、外部 API 客户端和数据库访问层保持独立。

不拆分独立 Worker 服务，避免单用户 MVP 引入跨域、双部署和重复配置。开发阶段使用 Wrangler 的本地 D1；浏览器 localStorage 只保存主题、语音偏好和未发送草稿，不作为聊天记录的权威来源。

## 目录与模块边界

- `src/features/auth`：登录状态与登录页。
- `src/features/chat`：对话列表、消息流、输入、流式状态与消息操作。
- `src/features/memories`：记忆查看、编辑、启停、删除与清空。
- `src/features/settings`：人物展示、音色获取、试听和语音参数。
- `src/features/usage`：每日调用与 Token 用量。
- `src/lib`：前端 API、SSE 解析、音频队列与缓存、主题持久化。
- `functions/api`：Pages Functions 路由，仅处理 HTTP 适配与调用服务。
- `functions/_lib/repositories`：所有 D1 SQL 与行映射。
- `functions/_lib/services`：认证、聊天、上下文、摘要、记忆、语音和用量业务逻辑。
- `functions/_lib/clients`：DeepSeek 与 MiniMax HTTP 客户端。
- `shared`：前后端共享 DTO、枚举和 Zod schema。
- `config`：模型地址、模型参数、配额、上下文阈值和 Luna 人物设定。
- `migrations`：D1 数据库迁移。

每个路由都依赖窄接口服务；业务服务通过接口依赖 repository 和外部客户端，测试可注入内存替身，不在业务代码中散落 SQL 或 `fetch`。

## 数据模型

按需求建立 `conversations`、`messages`、`conversation_summaries`、`memories` 和单行 `relationship_state`。另增加：

- `sessions`：仅保存会话 ID 哈希、过期时间与创建时间，不保存原始 Cookie。
- `usage_daily`：按日期累计聊天调用、TTS 调用、输入 Token 估算与输出 Token 估算。
- `rate_limits`：短窗口请求计数，适配无状态 Pages Functions。

主键使用 `crypto.randomUUID()` 生成的文本 ID；时间统一保存 ISO 8601 UTC 字符串。消息删除采用物理删除；删除对话级联删除消息与摘要。记忆可通过 `is_active` 临时停用。

## 认证与安全

登录接口读取服务端 `APP_PASSWORD`，使用 SHA-256 后常量时间比较，成功后创建随机会话并在 D1 中保存其哈希。Cookie 使用 `HttpOnly; Secure; SameSite=Strict; Path=/`，生产环境和 Wrangler HTTPS 使用 Secure；测试环境通过显式配置允许非 Secure Cookie。

受保护 API 统一验证会话。登录、聊天与 TTS 分别限流；聊天输入有字符上限；`usage_daily` 强制每日调用数及 Token 预算。API 使用 Zod 校验 JSON、路径参数和查询参数。错误响应只返回稳定错误码与用户可读消息，不泄露 Key、上游响应体或堆栈。

真实密钥只写入被 Git 忽略的 `.dev.vars`。仓库包含无真实值的 `.dev.vars.example`，并提供密钥模式扫描脚本和 CI 检查。

## 聊天与流式数据流

1. 前端提交消息并显示“发送中”。
2. Function 验证会话、输入、限流和配额，创建或读取对话并保存用户消息。
3. 上下文服务按固定顺序组装 Luna 人物设定、关系状态、相关启用记忆、当前摘要、最近 24 条未覆盖消息和本次输入；本次输入只出现一次。
4. DeepSeek 客户端调用 `deepseek-v4-flash` 非思考模式，通过 SSE 流式返回增量文本。
5. 前端切换为“生成中”并逐段渲染；停止按钮中止浏览器请求，服务端尽力中止上游请求。
6. 正常完成后保存 assistant 消息并记录用量；流被中止时保存已生成的非空部分并标记为中断，以便历史一致。
7. 完成后触发受时限约束的摘要检查和记忆提取；失败只记录安全日志，不撤销已完成的文字回复。

重新生成会删除目标 assistant 消息及其后续同轮产物，然后以最后一条用户消息重新执行生成。删除单条消息后重新计算对话更新时间；复制只发生在浏览器。

## 上下文压缩与长期记忆

配置文件定义最近消息数 24、未压缩 Token 估算阈值 12,000、摘要批次最少 12 条。达到阈值时，选择摘要覆盖点之后且不属于最近窗口的早期消息，要求 DeepSeek 输出结构化 JSON，包括事件、用户想法与情绪、Luna 回应、未决问题、必须记住和不应反复提及的内容。校验后以可读 Markdown 保存摘要并推进 `covered_until_message_id`；原始消息不删除。

记忆提取是独立的结构化输出调用，只分析本轮用户内容与必要上下文。仅接受明确、稳定、未来有用且非不必要敏感的信息；输出经 schema 校验并按规范化内容去重。相关记忆首版使用简单关键词重叠和重要度排序，避免引入向量数据库；没有明显关键词时仅取最高重要度的少量记忆。

## 语音

服务端通过 MiniMax `POST /v1/get_voice` 动态获取系统音色，按中文、女性及 Mature Woman、Intellectual Girl、Wise Women、Warm Bestie、Soft Girl、Laid-back Girl 等描述关键词排序。若上游暂时不可用，界面展示上次成功缓存或少量经过验证的兜底音色，并明确标记。

TTS 使用 `speech-2.8-turbo` 与 `/v1/t2a_v2`。默认 speed 0.92、pitch -1、volume 1.0、emotion calm，不添加混响。前端先展示完整文字；仅在主动播放或开启自动朗读后请求 TTS。朗读预处理移除 Markdown 标记、代码、URL 和不可读符号，并按自然段及句末切分。

浏览器使用 Cache API，以文本哈希、voice ID、模型和参数组成缓存键。音频控制器保证同一时间只播放一个音频，支持暂停、继续、从头重播；切换对话、删除消息或卸载页面时中止请求、暂停音频并释放对象 URL。任何 TTS 失败只影响对应播放控件。

## 界面设计

桌面端采用极简图标栏加中央聊天的布局：左侧只保留 Luna 标识及历史、记忆、设置、用量图标，点击历史后以临时抽屉/面板展开对话列表；设置、记忆和用量在中央内容区切换。移动端复用抽屉逻辑，聊天输入使用 `position: sticky/fixed` 与 `env(safe-area-inset-bottom)`，保持底部可用。

视觉使用低饱和靛蓝与雾紫，暖灰背景，半透明面板和细边框；玻璃模糊仅用于导航与输入容器，消息正文保持实色高对比背景。深浅主题遵循系统并允许手动切换。动画只用于抽屉、流式光标和短暂状态过渡，并尊重 `prefers-reduced-motion`。

## 错误处理与可恢复性

前端区分认证失效、配额耗尽、限流、上游不可用和网络中断，提供重试或重新登录动作。乐观创建的用户消息若发送失败会保留并标记失败，允许再次发送。D1 写入发生在调用上游前后明确的步骤中，避免把未成功发送的请求显示为完整回复。

摘要、记忆和 TTS 属于非关键路径，可失败并稍后重试。外部请求均有超时和 AbortSignal；日志只包含请求 ID、错误类别与状态码，不记录密码、Cookie、Authorization、完整聊天正文或上游原始错误体。

## 测试与验收

- Vitest：配置、上下文选择、摘要覆盖、记忆校验/去重、朗读预处理、SSE 解析、配额与认证工具。
- React Testing Library：登录、发送/停止/重生成、移动导航、记忆操作、语音设置与错误状态。
- Pages Functions 集成测试：使用 Miniflare/D1 迁移验证登录保护、CRUD、流式响应和安全响应头。
- Playwright：桌面与移动关键旅程，控制台无未处理错误，并检查浅色/深色截图。
- 质量门：`typecheck`、`lint`、`test`、`build`、密钥扫描和本地 Wrangler 烟雾测试全部通过。

真实 API 烟雾测试严格限制为一次短聊天、一次音色列表与一次短句 TTS，并在执行前确认 Key 只从 `.dev.vars` 注入。若外部账户余额、区域或权限导致失败，项目仍须通过所有使用协议级替身的本地测试，并在报告中给出精确外部阻塞信息。

## 部署

README 说明 Node 版本、依赖安装、`.dev.vars`、本地 D1 迁移与 Wrangler 启动。`wrangler.toml` 定义 Pages 项目、D1 binding 和兼容日期；生产 Key 通过 Cloudflare Pages Secrets 配置。GitHub Actions 在 PR/推送运行质量门，Cloudflare Pages Git 集成负责构建部署；迁移在首次部署前通过 Wrangler 明确执行，避免隐式生产数据库变更。
