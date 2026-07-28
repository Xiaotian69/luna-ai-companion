import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type RequestListener, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const servers: Server[] = []
const temporaryDirectories: string[] = []

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

async function listen(handler: RequestListener) {
  const server = createServer(handler)
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_UNAVAILABLE')
  return `http://127.0.0.1:${address.port}/v1`
}

async function modelServer(models: string[]) {
  return listen((request, response) => {
    if (request.url !== '/v1/models') {
      response.writeHead(404).end()
      return
    }
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ data: models.map((id) => ({ id })) }))
  })
}

async function responseServer(status: number, body: string) {
  return listen((_request, response) => {
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(body)
  })
}

async function closedLoopbackUrl() {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_UNAVAILABLE')
  const url = `http://127.0.0.1:${address.port}/v1`
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return url
}

function envFile(values: Record<string, string>) {
  return envFileContent(Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n'))
}

function envFileContent(content: string) {
  const directory = mkdtempSync(join(tmpdir(), 'companion-local-runtime-'))
  temporaryDirectories.push(directory)
  const path = join(directory, '.dev.vars.local')
  writeFileSync(path, content)
  return path
}

async function check(options: {
  baseUrl?: string
  model?: string
  args?: string[]
  env?: NodeJS.ProcessEnv
  timeout?: number
} = {}) {
  const startedAt = Date.now()
  try {
    const result = await execFileAsync(process.execPath, ['scripts/check-local-runtime.mjs', '--', ...(options.args ?? [])], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        APP_MODE: 'local',
        CHAT_PROVIDER: 'ollama',
        CHAT_BASE_URL: options.baseUrl,
        CHAT_MODEL: options.model ?? 'qwen3:4b',
        ...options.env,
      },
      timeout: options.timeout ?? 8_000,
    })
    return { code: 0, stdout: result.stdout, stderr: result.stderr, signal: null, duration: Date.now() - startedAt }
  } catch (error) {
    const failed = error as Error & { code?: number; stdout?: string; stderr?: string; signal?: string }
    return {
      code: failed.code ?? 1,
      stdout: failed.stdout ?? '',
      stderr: failed.stderr ?? '',
      signal: failed.signal ?? null,
      duration: Date.now() - startedAt,
    }
  }
}

function expectNoRepairCommand(result: Awaited<ReturnType<typeof check>>) {
  expect(result.stdout).not.toContain('ollama serve')
  expect(result.stdout).not.toContain('ollama pull')
}

describe('local runtime checker CLI', () => {
  it('reports an unreachable Ollama endpoint with the exact repair command', async () => {
    const result = await check({ baseUrl: await closedLoopbackUrl() })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_PROVIDER_UNREACHABLE')
    expect(result.stdout.split(/\r?\n/)).toContain('Repair: ollama serve')
  })

  it('reports a missing configured model with the exact pull command', async () => {
    const result = await check({ baseUrl: await modelServer(['llama3.2:3b']) })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_MODEL_MISSING')
    expect(result.stdout.split(/\r?\n/)).toContain('Repair: ollama pull qwen3:4b')
  })

  it('succeeds when the configured model is available', async () => {
    const result = await check({ baseUrl: await modelServer(['qwen3:4b']) })

    expect(result).toMatchObject({ code: 0, stderr: '' })
    expect(result.stdout).toContain('LOCAL_RUNTIME_READY')
  })

  it.each([
    ['credentials', 'http://fake-user:fake-password@127.0.0.1:9/v1', ['fake-user', 'fake-password']],
    ['query', 'http://127.0.0.1:9/v1?fake-query-token', ['fake-query-token']],
    ['bare query', 'http://127.0.0.1:9/v1?', []],
    ['fragment', 'http://127.0.0.1:9/v1#fake-fragment-token', ['fake-fragment-token']],
    ['bare fragment', 'http://127.0.0.1:9/v1#', []],
    ['protocol', 'ftp://127.0.0.1/v1', []],
  ])('rejects an invalid %s URL without echoing its sensitive parts', async (_kind, baseUrl, secrets) => {
    const result = await check({ baseUrl })
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.code).not.toBe(0)
    expect(output).toContain('LOCAL_CONFIGURATION_INVALID')
    for (const secret of secrets) expect(output).not.toContain(secret)
    expectNoRepairCommand(result)
  })

  it('loads file values after inherited values so the preflight matches Wrangler', async () => {
    const baseUrl = await modelServer(['file-model'])
    const path = envFile({
      APP_MODE: 'local',
      CHAT_PROVIDER: 'ollama',
      CHAT_BASE_URL: baseUrl,
      CHAT_MODEL: 'file-model',
    })

    const result = await check({
      baseUrl: 'http://127.0.0.1:9/v1',
      model: 'inherited-model',
      args: ['--env-file', path],
    })

    expect(result.code).toBe(0)
    expect(result.stdout).toContain('LOCAL_RUNTIME_READY')
    expect(result.stdout).toContain('file-model')
    expect(result.stdout).not.toContain('inherited-model')
  })

  it('does not inherit required settings into an explicitly empty environment file', async () => {
    const result = await check({
      baseUrl: await modelServer(['qwen3:4b']),
      args: ['--env-file', envFile({})],
    })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_CONFIGURATION_INVALID')
    expect(result.stdout).not.toContain('LOCAL_RUNTIME_READY')
    expectNoRepairCommand(result)
  })

  it('does not fill a partial environment file from conflicting inherited settings', async () => {
    const baseUrl = await modelServer(['qwen3:4b'])
    const result = await check({
      baseUrl,
      args: ['--env-file', envFile({ APP_MODE: 'local', CHAT_BASE_URL: baseUrl, CHAT_MODEL: 'qwen3:4b' })],
      env: { CHAT_PROVIDER: 'ollama' },
    })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_CONFIGURATION_INVALID')
    expect(result.stdout).not.toContain('LOCAL_RUNTIME_READY')
    expectNoRepairCommand(result)
  })

  it.each([
    ['APP_MODE', 'cloud'],
    ['CHAT_PROVIDER', 'deepseek'],
  ])('requires the local env file to declare the expected %s marker', async (key, value) => {
    const baseUrl = await modelServer(['qwen3:4b'])
    const result = await check({
      args: ['--env-file', envFile({
        APP_MODE: key === 'APP_MODE' ? value : 'local',
        CHAT_PROVIDER: key === 'CHAT_PROVIDER' ? value : 'ollama',
        CHAT_BASE_URL: baseUrl,
        CHAT_MODEL: 'qwen3:4b',
      })],
    })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_CONFIGURATION_INVALID')
    expectNoRepairCommand(result)
  })

  it('accepts the complete local example when pointed at a compatible provider', async () => {
    const baseUrl = await modelServer(['qwen3:4b'])
    const example = readFileSync('.dev.vars.local.example', 'utf8')
      .replace(/^CHAT_BASE_URL=.*$/m, `CHAT_BASE_URL=${baseUrl}`)
    const result = await check({
      args: ['--env-file', envFileContent(example)],
      env: {
        APP_MODE: 'cloud',
        CHAT_PROVIDER: 'deepseek',
        CHAT_BASE_URL: 'http://127.0.0.1:9/v1',
        CHAT_MODEL: 'inherited-model',
      },
    })

    expect(result.code).toBe(0)
    expect(result.stdout).toContain('LOCAL_RUNTIME_READY')
  })

  it('reports a missing requested environment file as invalid configuration', async () => {
    const result = await check({ args: ['--env-file', join(tmpdir(), 'missing-local-runtime.env')] })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_CONFIGURATION_INVALID')
    expect(result.stdout).toContain('Copy .dev.vars.local.example to .dev.vars.local')
    expectNoRepairCommand(result)
  })

  it('rejects an empty environment-file argument instead of falling back to inherited values', async () => {
    const result = await check({
      baseUrl: await modelServer(['qwen3:4b']),
      args: ['--env-file='],
    })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_CONFIGURATION_INVALID')
    expect(result.stdout).toContain('Copy .dev.vars.local.example to .dev.vars.local')
  })

  it.each([401, 500])('distinguishes a reachable HTTP %s response from an unreachable provider', async (status) => {
    const result = await check({ baseUrl: await responseServer(status, '{}') })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_PROVIDER_REJECTED')
    expect(result.stdout).toContain(String(status))
    expectNoRepairCommand(result)
  })

  it('cancels a stalled HTTP error body and exits promptly', async () => {
    const baseUrl = await listen((_request, response) => {
      response.writeHead(500, { 'content-type': 'application/json' })
      response.flushHeaders()
      response.write('{"error":"still streaming')
    })

    const result = await check({ baseUrl, timeout: 2_000 })

    expect(result.stdout).toContain('LOCAL_PROVIDER_REJECTED')
    expect(result.stdout).toContain('500')
    expectNoRepairCommand(result)
    expect(result.signal).toBeNull()
    expect(result.duration).toBeLessThan(1_500)
  })

  it.each([
    ['malformed JSON', '{'],
    ['missing data', '{}'],
    ['non-array data', '{"data":{}}'],
  ])('reports %s as an incompatible provider response', async (_kind, body) => {
    const result = await check({ baseUrl: await responseServer(200, body) })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_PROVIDER_INCOMPATIBLE')
    expectNoRepairCommand(result)
  })

  it('times out a stalled response body without recommending serve or pull', async () => {
    const baseUrl = await listen((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.write('{"data":[')
    })

    const result = await check({ baseUrl })

    expect(result.code).not.toBe(0)
    expect(result.stdout).toContain('LOCAL_PROVIDER_TIMEOUT')
    expectNoRepairCommand(result)
  }, 10_000)
})
