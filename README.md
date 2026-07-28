# Luna AI Companion

Luna 是一个本地优先、可自托管、单用户、中文优先的 AI 伴侣网页。Luna 只是默认示例：使用者可以在网页内自由设置名字、头像、关系、称呼、性格、说话风格和相处边界。

文本聊天默认可通过本机 Ollama 运行，不需要商业聊天 API Key；DeepSeek 云端文本与 MiniMax 云端语音是可选能力。本地模式不会在 Ollama 故障时静默回退到云端。完整设置和隐私边界见 [本地文本模式指南](./docs/LOCAL_MODE.md)。

## 功能特色

### 自定义 AI 伴侣

- 默认示例名为 Luna，可自由改名。
- 支持女友、男友、朋友和自定义关系。
- 支持头像 URL、用户称呼、性格、说话风格与相处边界。
- 角色档案保存在 D1，并在每轮聊天中参与上下文组装。
- 保持 AI 身份透明，不编造现实身体、经历或行动。

### 长期记忆

- 从对话中提取未来仍有价值的稳定记忆。
- 根据当前话题召回相关记忆，而不是把全部历史塞给模型。
- 长对话自动生成结构化摘要，保留事件、情绪、回应和待续事项。
- 记忆可以查看、编辑、启用、停用、删除和全部清空。
- 自动过滤密码、验证码、证件号、银行卡等不必要敏感信息。
- 关系状态记录熟悉度、当前情绪和近期事件。

后续阶段会增加记忆分类、冲突更新、召回透明度、敏感内容确认和本地备份恢复。

### 对话与语音

- DeepSeek SSE 流式回复、停止生成和重新生成。
- 对话历史、消息持久化、复制、朗读和删除。
- MiniMax 动态音色、试听、语速、音高、音量与自动朗读。
- 相同文本和语音参数使用浏览器缓存，减少重复费用。

### 安全与质量

- 模型请求只从服务端发起，API Key 不进入浏览器构建。
- 单用户密码、签名 `HttpOnly; Secure; SameSite=Strict` Cookie 和 D1 会话。
- 登录、聊天和语音分别限流，并有每日配额。
- 严格 TypeScript、Zod、Vitest、Miniflare、Playwright 和仓库密钥扫描。
- 公开仓库不包含聊天数据库、模型权重、音色文件或真实密钥。

## 快速开始

要求 Node.js 24+ 和 Ollama。下面是本地优先路径；完整安装与故障排查见 [docs/LOCAL_MODE.md](./docs/LOCAL_MODE.md)。

```powershell
npm ci
Copy-Item .dev.vars.local.example .dev.vars.local
# 在另一个终端运行：ollama serve
ollama pull qwen3:4b
npm run check:local
npm run db:migrate:local
npm run dev:local
```

先按上方注释在另一个终端运行 `ollama serve`。编辑 `.dev.vars.local`，替换本地登录密码和会话密钥；本地文本不需要 DeepSeek Key：

```dotenv
APP_MODE=local
CHAT_PROVIDER=ollama
CHAT_BASE_URL=http://127.0.0.1:11434/v1
CHAT_MODEL=qwen3:4b
APP_PASSWORD=至少 8 位的本地登录密码
SESSION_SECRET=至少 32 位随机字符串
ENVIRONMENT=development
```

打开 Wrangler 输出的地址，通常为 [http://127.0.0.1:8788](http://127.0.0.1:8788)，使用 `APP_PASSWORD` 登录。

`.dev.vars.local` 和 `.wrangler/state` 已被 Git 忽略。对话与记忆保存在本机 `.wrangler/state`。不要把模型密钥放进任何 `VITE_*` 变量，因为 `VITE_*` 会进入浏览器包。

如需 DeepSeek 云端开发，复制 `.dev.vars.example` 为 `.dev.vars`、填写自己的 Key，然后运行 `npm run dev:cloud`。这不会改变本地模式“失败即明确报错”的行为。

## 常用命令

```powershell
npm run dev             # 仅启动 Vite 前端
npm run dev:full        # 构建并启动本地 Pages Functions 与 D1
npm run dev:local       # 检查 Ollama，并以本地文本模式启动
npm run dev:cloud       # 使用 .dev.vars 的 DeepSeek 云端开发模式
npm run check:local     # 检查本地端点与配置模型
npm run db:migrate:local
npm run check:secrets
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

测试不会调用付费 API。真实 API 烟雾测试应使用短消息和短试听句。

## 部署到 Cloudflare Pages

1. 创建 D1：

   ```powershell
   npx wrangler login
   npx wrangler d1 create luna-db
   ```

2. 将返回的 `database_id` 写入 `wrangler.toml`。
3. 应用远程迁移：

   ```powershell
   npx wrangler d1 migrations apply luna-db --remote
   ```

4. 在 Cloudflare Pages 中将构建命令设为 `npm run build`，输出目录设为 `dist`。
5. 绑定变量名为 `DB` 的 D1 数据库。
6. 在加密 Secrets 中配置：

   - `DEEPSEEK_API_KEY`
   - `MINIMAX_API_KEY`
   - `APP_PASSWORD`
   - `SESSION_SECRET`

7. 不要创建 `VITE_DEEPSEEK_*` 或 `VITE_MINIMAX_*`。

## API Key 与官方链接

仓库只提供变量名和申请入口，不提供项目所有者的密钥：

- [DeepSeek 开放平台](https://platform.deepseek.com/)
- [DeepSeek Chat Completion 文档](https://api-docs.deepseek.com/api/create-chat-completion)
- [MiniMax 开放平台](https://platform.minimaxi.com/)
- [MiniMax T2A 文档](https://platform.minimaxi.com/docs/api-reference/speech-t2a-http)
- [MiniMax 音色管理文档](https://platform.minimaxi.com/docs/api-reference/voice-management-get)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)

## 项目结构

- `src/`：React 前端、聊天、伴侣、记忆、语音和用量页面。
- `functions/api/`：Cloudflare Pages Functions API。
- `functions/_lib/`：模型客户端、仓储和智能体服务。
- `shared/`：前后端共享 Schema 与类型。
- `migrations/`：D1 数据库迁移。
- `config/`：模型、限制与基础人格安全规则。
- `docs/superpowers/`：已确认设计与实施计划。

## 许可

原创代码使用 [MIT License](./LICENSE)。依赖、模型、音色和托管服务保留各自许可证，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
