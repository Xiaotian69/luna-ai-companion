# 本地文本模式

本地模式使用 Ollama 的 OpenAI 兼容接口生成文本，并把对话、记忆、会话和伴侣设置保存在本机 Wrangler D1 状态目录 `.wrangler/state`。文本聊天不需要 DeepSeek 或其他商业聊天 API Key。

## 安装

要求 Node.js 24+。Windows 可以通过 WinGet 安装 Ollama：

```powershell
winget install --id Ollama.Ollama -e
npm ci
Copy-Item .dev.vars.local.example .dev.vars.local
```

macOS/Linux 请先使用 [Ollama 官方下载页](https://ollama.com/download) 的对应安装方式，再运行：

```sh
npm ci
cp .dev.vars.local.example .dev.vars.local
```

编辑未被 Git 跟踪的 `.dev.vars.local`，至少替换 `APP_PASSWORD` 和 `SESSION_SECRET`。若修改 `CHAT_MODEL`，后续命令中的模型名也要一致。不要把任何密钥写入 `VITE_*`；这些变量会进入浏览器构建。

## 启动、检查、迁移和运行

在一个终端启动 Ollama：

```powershell
ollama serve
```

在另一个终端安装默认模型，然后检查端点和模型。检查器明确读取 `.dev.vars.local` 中的 `CHAT_BASE_URL` 与 `CHAT_MODEL`，文件值优先于同名 shell 环境变量，与 Wrangler 启动时使用的配置保持一致：

```powershell
ollama pull qwen3:4b
npm run check:local
```

首次运行或新增数据库迁移后，应用本地迁移：

```powershell
npm run db:migrate:local
```

然后用一个命令检查 Ollama、构建前端并启动 Pages Functions 与 D1：

```powershell
npm run dev:local
```

打开 Wrangler 输出的地址，通常是 [http://127.0.0.1:8788](http://127.0.0.1:8788)，使用 `.dev.vars.local` 中的 `APP_PASSWORD` 登录。

`dev:local` 使用经 Wrangler 4.111 本机帮助验证的 `pages dev dist --persist-to .wrangler/state --env-file .dev.vars.local` 参数。`db:migrate:local` 使用 `d1 migrations apply luna-db --local --persist-to .wrangler/state`。因此重启开发服务器后，对话和记忆仍保留在 `.wrangler/state`；删除该目录会删除本地开发数据。该目录已被 Git 忽略，但它不是加密保险箱，仍应按私密数据保护和备份。

## 隐私边界

- 本地模式的文本请求只发送到 `CHAT_BASE_URL`，默认是本机 `http://127.0.0.1:11434/v1`。
- 本地 D1 数据只写入 `.wrangler/state`，不会由这些本地命令上传到 Cloudflare。
- 本地 provider 不可达或模型缺失时，请求会明确失败；系统不会静默回退到 DeepSeek。只有同时显式请求并确认云端覆盖时，应用层才允许切换到云端。
- MiniMax 语音仍是可选云服务。若要保持完全离线，不要启用或调用云语音功能。

## 可选云端开发

云端文本模式继续使用 `.dev.vars` 中的 DeepSeek 配置：

```powershell
Copy-Item .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入自己的 DeepSeek/MiniMax Key、APP_PASSWORD 和 SESSION_SECRET
npm run db:migrate:local
npm run dev:cloud
```

macOS/Linux 的复制命令为：

```sh
cp .dev.vars.example .dev.vars
```

`dev:cloud` 与本地模式共用 `.wrangler/state` D1。若不希望两种模式看到同一份本地开发数据，请在切换前自行备份并使用独立工作副本；不要把数据库复制进仓库。

## 故障排查

`LOCAL_PROVIDER_UNREACHABLE` 表示 Ollama 端点无法访问。执行检查器给出的精确修复命令：

```powershell
ollama serve
```

`LOCAL_MODEL_MISSING` 表示端点可访问，但 `CHAT_MODEL` 不在模型列表中。以默认模型为例：

```powershell
ollama pull qwen3:4b
```

如果配置了其他模型，请执行检查器输出的 `ollama pull <配置的模型名>`。随后重新运行：

```powershell
npm run check:local
```

其他稳定诊断不会建议错误的 `serve` 或 `pull` 操作：

- `LOCAL_CONFIGURATION_INVALID`：`.dev.vars.local` 缺失、无法解析，或 URL 不是无凭据、无查询/片段的 HTTP(S) 地址。先从示例文件重新复制并检查配置；诊断不会回显原始 URL。
- `LOCAL_PROVIDER_REJECTED`：服务可访问，但 `/models` 返回 401、500 等 HTTP 错误。检查端点、代理或服务日志。
- `LOCAL_PROVIDER_INCOMPATIBLE`：服务可访问，但没有返回 OpenAI 兼容的模型列表。确认 `CHAT_BASE_URL` 指向兼容接口的根路径，默认应以 `/v1` 结尾。
- `LOCAL_PROVIDER_TIMEOUT`：服务已连接但请求或响应体超时。检查本机模型服务负载后重试。

若 D1 数据库表不存在，重新运行 `npm run db:migrate:local`。若修改了 `.dev.vars.local`，停止并重新启动 `npm run dev:local`，Wrangler 才会重新加载变量。
