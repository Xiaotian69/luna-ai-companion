# Luna

Luna 是一个单用户中文 AI 陪伴聊天网页。它使用 React + Vite + TypeScript、Cloudflare Pages Functions 与 D1，文字模型为 DeepSeek `deepseek-v4-flash`，语音模型为 MiniMax `speech-2.8-turbo`。

## 已实现

- DeepSeek SSE 流式聊天、停止与重新生成
- 新建/查看历史对话、复制与删除消息、刷新后持久化
- D1 上下文摘要、长期记忆提取和记忆管理
- MiniMax 动态系统音色、试听、参数设置、自动朗读和浏览器音频缓存
- 单用户密码、签名 HttpOnly/Secure/SameSite Cookie、D1 会话、请求限流和每日配额
- B 方案极简图标栏、历史抽屉、深浅主题、移动端安全区
- 严格 TypeScript、Zod 输入校验、Vitest/Miniflare、Playwright 和密钥扫描

## 本地开发

需要 Node.js 24+。安装依赖：

```bash
npm install
```

复制 `.dev.vars.example` 为 `.dev.vars`，设置：

```dotenv
DEEPSEEK_API_KEY=你的 DeepSeek Key
MINIMAX_API_KEY=你的 MiniMax Key
APP_PASSWORD=至少 8 位的本地登录密码
SESSION_SECRET=至少 32 位随机字符串
ENVIRONMENT=development
```

`.dev.vars`、`.env`、私钥文件均已被 `.gitignore` 排除。不要把真实值复制到 `VITE_*` 变量：任何 `VITE_*` 值都会进入浏览器包。

创建本地 D1 并迁移：

```bash
npm run db:migrate:local
```

构建并同时启动 Pages 静态资源与 Functions：

```bash
npm run dev:full
```

打开 Wrangler 输出的地址（通常为 `http://localhost:8788`），使用 `.dev.vars` 中的 `APP_PASSWORD` 登录。单独运行 `npm run dev` 只启动前端；此时 API 会代理到 `http://localhost:8788`。

## 质量检查

```bash
npm run check:secrets
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

测试不会调用付费 API。真实 API 烟雾测试应只使用短消息和短试听句，避免意外费用。

## 创建 Cloudflare D1

登录 Wrangler 后创建数据库：

```bash
npx wrangler login
npx wrangler d1 create luna-db
```

把返回的 `database_id` 写入 `wrangler.toml`，然后执行生产迁移：

```bash
npx wrangler d1 migrations apply luna-db --remote
```

数据库包含 `conversations`、`messages`、`conversation_summaries`、`memories`、`relationship_state`、`sessions`、`usage_daily` 和 `rate_limits`。建议定期用 Wrangler 导出 D1，并在高风险变更前备份。

## 部署到 Cloudflare Pages

1. 在 Cloudflare Dashboard 创建 Pages 项目并连接 GitHub 仓库。
2. 构建命令设置为 `npm run build`，输出目录设置为 `dist`。
3. 为 Pages 项目绑定 D1，变量名必须是 `DB`，数据库选择 `luna-db`。
4. 在 Pages 的 Settings → Variables and Secrets 中添加四个加密 Secret：`DEEPSEEK_API_KEY`、`MINIMAX_API_KEY`、`APP_PASSWORD`、`SESSION_SECRET`。
5. 不要创建任何 `VITE_DEEPSEEK_*` 或 `VITE_MINIMAX_*` 变量。
6. 首次部署前执行远程 D1 迁移；随后推送 `main` 即由 Pages Git 集成自动部署。

GitHub Actions 只运行静态检查、测试与构建，不需要也不应配置模型 Key。Cloudflare Pages Git 集成负责线上部署。

## 配置位置

- `config/models.ts`：模型、API 地址与主要参数
- `config/limits.ts`：上下文阈值、输入限制、速率与每日配额
- `config/persona.ts`：Luna 的完整可编辑人物设定
- `migrations/0001_initial.sql`：D1 初始迁移

## 安全与费用

- 所有模型请求仅由 Pages Functions 发起；浏览器包不包含 API Key。
- Cookie 设置 `HttpOnly; Secure; SameSite=Strict`，会话只以 SHA-256 哈希写入 D1。
- 登录、聊天和 TTS 分别限流；聊天和语音有每日调用上限。
- 自动朗读关闭时不会自动请求 TTS；相同文本与参数使用浏览器 Cache API。
- 若 Key 曾粘贴到公开位置或提交历史，应立即在 DeepSeek/MiniMax 控制台轮换，而不只是删除文件。

## 官方接口参考

- [DeepSeek Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion)
- [MiniMax 中国区 T2A HTTP](https://platform.minimaxi.com/docs/api-reference/speech-t2a-http)
- [MiniMax 中国区 Get Voice](https://platform.minimaxi.com/docs/api-reference/voice-management-get)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
