# Cloudflare 云端模式部署

本指南从空 Cloudflare 账号部署 Pages + D1。云端文本默认使用 DeepSeek；MiniMax 与外部 TTS 都是可选项。生产环境不会读取本机 `.dev.vars*`。

## 1. 准备配置

要求 Node.js 24+。安装锁定依赖并登录 Cloudflare：

```powershell
npm ci
npx wrangler login
```

创建 D1：

```powershell
npx wrangler d1 create luna-db
```

把命令返回的 `database_id` 写入 `wrangler.toml` 的 `[[d1_databases]]`；保持 `binding = "DB"`、`database_name = "luna-db"` 和 `migrations_dir = "migrations"`。占位 UUID 不能用于生产。

创建 Pages 项目（若已在控制台创建同名项目则跳过）：

```powershell
npx wrangler pages project create luna-ai-companion --production-branch main
```

## 2. 应用远程迁移

确认账号和数据库名称后执行：

```powershell
npx wrangler d1 migrations apply luna-db --remote
```

这是远程写操作，不要用本地 `db:migrate:local` 代替。首次部署及每次新增 migration 后都要执行，并保留 Cloudflare 的迁移输出。

## 3. 配置变量和 Secrets

无论选择哪个提供方，以下两项都是必需的服务端 Secret：

- `APP_PASSWORD`：至少 8 字符的单用户登录密码。
- `SESSION_SECRET`：至少 32 字符的随机签名密钥，且不能与登录密码相同。

在 Pages 项目的 Settings → Variables and Secrets 中为 Production（需要时也为 Preview）配置：

| 名称 | 建议值/条件 |
| --- | --- |
| `APP_MODE` | `cloud` |
| `CHAT_PROVIDER` | DeepSeek 使用 `deepseek` |
| `DEEPSEEK_API_KEY` | `CHAT_PROVIDER=deepseek` 时必需；也可按实现契约使用 `CHAT_API_KEY` |
| `CHAT_BASE_URL` / `CHAT_MODEL` | 只有覆盖默认 DeepSeek 端点或模型时设置 |
| `MINIMAX_API_KEY` | 只有选择 MiniMax 云语音时设置 |
| `LOCAL_TTS_ENDPOINT` | 只有使用部署者控制的外部 TTS 时设置，规则见下文 |
| `ENVIRONMENT` | 生产设置为 `production` |

Wrangler CLI 也可逐项交互写入 Secret（不要把值写在命令行、脚本或 shell 历史中）：

```powershell
npx wrangler pages secret put APP_PASSWORD --project-name luna-ai-companion
npx wrangler pages secret put SESSION_SECRET --project-name luna-ai-companion
npx wrangler pages secret put DEEPSEEK_API_KEY --project-name luna-ai-companion
```

第三条只在使用 DeepSeek 时执行；MiniMax 同理。绝不要创建 `VITE_DEEPSEEK_API_KEY`、`VITE_MINIMAX_API_KEY`、`VITE_SESSION_SECRET` 或其他 `VITE_*` 凭据，因为 Vite 会把它们放进浏览器包。

### 云端 `LOCAL_TTS_ENDPOINT` 信任边界

虽然变量名保留 `LOCAL`，在 `APP_MODE=cloud` 时它必须是无用户名密码、无查询/片段的外部 `https://` 公共 FQDN，例如部署者自有的 TTS 网关；localhost、IP 地址和特殊用途域名会被拒绝。端点接收 `POST` JSON（`text`、`voiceId`、`speed`、`pitch`、`volume`），必须直接返回不超过 10 MiB 的 `audio/*`，重定向会失败。

这项语法检查不是 DNS 授权或网络隔离。只有能修改部署环境的管理员可以设置该端点；管理员及其 DNS/TTS 服务控制者能看到发送的朗读文本。Cloudflare 运行时还必须能从公网访问该地址。若无法承担此信任边界，请保留默认浏览器语音或使用 MiniMax。

本机 embedding 只接受回环地址，不适合 Cloudflare 生产运行时；云端不配置 `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL` 时会稳定使用关键词/分类回退。

## 4. 构建与部署

先在最终配置对应的提交上运行本地质量检查和生产构建：

```powershell
npm run check:secrets
npm run typecheck
npm run lint
npm run test:run
npm run build
```

部署 `dist`：

```powershell
npx wrangler pages deploy dist --project-name luna-ai-companion
```

若使用 Cloudflare 的 Git 集成，将构建命令设为 `npm run build`，输出目录设为 `dist`；仍需在 Pages 项目中确认 `DB` D1 Binding 和环境级变量/Secrets。CLI 直传会读取已更新的 `wrangler.toml` 绑定。

## 5. 上线检查

在生产 URL 逐项检查登录/注销、自定义伴侣、流式聊天、停止生成、记忆增删改与“本次使用的记忆”、备份导出/确认恢复、所选语音提供方和用量页面。浏览器开发者工具中不得出现模型密钥；本地聊天数据不会自动迁移到云端 D1。

真实 DeepSeek、MiniMax、外部 TTS 和域名/DNS 均是外部依赖，先用短文本做小流量烟雾测试。异常时不要为了“可用”而在本地失败后启用静默云回退。
