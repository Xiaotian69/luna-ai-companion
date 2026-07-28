import { execFile } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const servers: Server[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })))
})

async function listen(models: string[]) {
  const server = createServer((request, response) => {
    if (request.url !== '/v1/models') {
      response.writeHead(404).end()
      return
    }
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ data: models.map((id) => ({ id })) }))
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_UNAVAILABLE')
  return `http://127.0.0.1:${address.port}/v1`
}

async function closedLoopbackUrl() {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_UNAVAILABLE')
  const url = `http://127.0.0.1:${address.port}/v1`
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return url
}

async function check(baseUrl: string, model = 'qwen3:4b') {
  try {
    const result = await execFileAsync(process.execPath, ['scripts/check-local-runtime.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, CHAT_BASE_URL: baseUrl, CHAT_MODEL: model },
      timeout: 5_000,
    })
    return { code: 0, stdout: result.stdout, stderr: result.stderr }
  } catch (error) {
    const failed = error as Error & { code?: number; stdout?: string; stderr?: string }
    return { code: failed.code ?? 1, stdout: failed.stdout ?? '', stderr: failed.stderr ?? '' }
  }
}

describe('local runtime checker CLI', () => {
  it('reports an unreachable Ollama endpoint with the exact repair command', async () => {
    const result = await check(await closedLoopbackUrl())

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_PROVIDER_UNREACHABLE')
    expect(result.stdout).toContain('ollama serve')
  })

  it('reports a missing configured model with the exact pull command', async () => {
    const result = await check(await listen(['llama3.2:3b']))

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_MODEL_MISSING')
    expect(result.stdout).toContain('ollama pull qwen3:4b')
  })

  it('succeeds when the configured model is available', async () => {
    const result = await check(await listen(['qwen3:4b']))

    expect(result).toMatchObject({ code: 0, stderr: '' })
    expect(result.stdout).toContain('LOCAL_RUNTIME_READY')
  })
})
