# Luna AI Companion

Luna 是一个本地优先、可自托管、单用户、中文优先的 AI 伴侣网页。Luna 只是默认角色；名字、头像、关系、称呼、性格、说话风格和相处边界都可以在设置中修改。

## 已实现

- 自定义伴侣档案会保存在 D1，并参与每轮上下文；角色始终明确自己是 AI。
- 文本可选本机 Ollama 或云端 DeepSeek。本地模式失败会明确报错，绝不静默上传到云端；云端覆盖必须显式请求并确认。
- 长期记忆包含分类、敏感度、置信度、访问与冲突替换元数据。凭据、身份、支付、健康与亲密信息当前都不会自动保存；服务层保留可信确认能力，但聊天 API 和界面尚未提供这项确认流程。
- 记忆按关键词/分类、待续状态、重要度、时效和使用情况确定性排序；可选本机 embedding，失败时仍有确定性回退。回复只展示真正注入上下文的“本次使用的记忆”。
- 记忆可查看、编辑、启停、删除、清空，并可导出/恢复严格版本化 JSON 备份。
- 语音默认使用浏览器系统语音；可选部署者配置的本地 TTS 端点或 MiniMax。MiniMax 不是运行必需项。
- 支持 SSE 流式回复、停止/重新生成、对话历史、结构化摘要、D1 持久化、用量限制与响应式界面。

详细边界见 [本地模式](./docs/LOCAL_MODE.md)、[云端部署](./docs/CLOUD_MODE.md)和[安全说明](./docs/SECURITY.md)。

## 快速开始：本地 Ollama

要求 Node.js 24+、Ollama。先在一个终端启动 Ollama，再在项目目录执行：

```powershell
npm ci
Copy-Item .dev.vars.local.example .dev.vars.local
ollama pull qwen3:4b
npm run check:local
npm run db:migrate:local
npm run dev:local
```

编辑不会被 Git 跟踪的 `.dev.vars.local`，至少替换 `APP_PASSWORD`（8 字符以上）与 `SESSION_SECRET`（32 字符以上）。默认聊天配置为：

```dotenv
APP_MODE=local
CHAT_PROVIDER=ollama
CHAT_BASE_URL=http://127.0.0.1:11434/v1
CHAT_MODEL=qwen3:4b
```

打开 Wrangler 输出的地址（通常是 `http://127.0.0.1:8788`），使用 `APP_PASSWORD` 登录。完整安装、macOS/Linux 命令和故障代码见 [docs/LOCAL_MODE.md](./docs/LOCAL_MODE.md)。

## 提供方与环境变量

所有凭据都只能放在 Wrangler/Cloudflare 的服务端环境；不要创建任何 `VITE_*` 密钥变量。

| 变量 | 是否必需 | 用途 |
| --- | --- | --- |
| `APP_PASSWORD` | 是 | 单用户登录密码，至少 8 字符 |
| `SESSION_SECRET` | 是 | Cookie 签名密钥，至少 32 字符 |
| `APP_MODE` | 建议显式设置 | `local` 或 `cloud`；默认 `cloud` |
| `CHAT_PROVIDER` | 可选 | `ollama` 或 `deepseek`；默认 `deepseek` |
| `CHAT_BASE_URL` / `CHAT_MODEL` | Ollama 或自定义聊天配置时 | OpenAI 兼容端点与模型 |
| `CHAT_API_KEY` | 云聊天时可选 | 通用服务端密钥；可替代 `DEEPSEEK_API_KEY` 供当前 DeepSeek provider 使用 |
| `DEEPSEEK_API_KEY` | DeepSeek 聊天时 | DeepSeek 服务端密钥 |
| `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL` | 可选 | 仅接受回环地址的本机 OpenAI 兼容 embedding；两项需同时配置 |
| `LOCAL_TTS_ENDPOINT` | 可选 | 本地模式仅回环 HTTP(S)；云端模式仅外部 HTTPS 公共 FQDN |
| `MINIMAX_API_KEY` | 可选 | MiniMax 云语音；浏览器语音不需要 |
| `ENVIRONMENT` | 可选 | `development`、`test` 或 `production` |

示例见 [`.dev.vars.local.example`](./.dev.vars.local.example) 与 [`.dev.vars.example`](./.dev.vars.example)。云端所需值和信任边界见 [docs/CLOUD_MODE.md](./docs/CLOUD_MODE.md)。

## 常用命令

```powershell
npm run dev             # 仅启动 Vite 前端
npm run dev:full        # 构建并启动本地 Pages Functions 与 D1
npm run dev:local       # 校验 Ollama 后使用 .dev.vars.local 启动
npm run dev:cloud       # 使用 .dev.vars 启动云聊天开发模式
npm run check:local
npm run db:migrate:local
npm run check:secrets
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

测试不会调用付费 API。Ollama 模型下载、真实模型质量、真实 MiniMax 与外部 TTS 应另做小流量烟雾测试。

## 项目结构

- `src/`：React 前端、聊天、伴侣、记忆、语音和用量页面。
- `functions/api/`：Cloudflare Pages Functions API。
- `functions/_lib/`：提供方客户端、仓储与服务。
- `shared/`：前后端共享 Schema、SSE 与备份格式。
- `migrations/`：D1 数据库迁移。
- `config/`：模型、限制与基础人格安全规则。

## 许可与官方链接

原创代码使用 [MIT License](./LICENSE)，第三方依赖、模型、音色与服务许可见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。服务入口：[DeepSeek](https://platform.deepseek.com/)、[MiniMax](https://platform.minimaxi.com/)、[Ollama](https://ollama.com/)、[Cloudflare D1](https://developers.cloudflare.com/d1/) 和 [Pages Functions](https://developers.cloudflare.com/pages/functions/)。
