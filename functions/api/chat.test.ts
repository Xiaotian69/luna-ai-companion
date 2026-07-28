import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestGet as getRuntime } from './runtime'
import { onRequestPost as postChat } from './chat'

const companionRow = {
  display_name: 'Luna',
  avatar_url: '',
  relationship_preset: 'friend',
  custom_relationship: '',
  user_address: '',
  personality: 'Kind',
  speaking_style: 'Natural',
  boundaries: 'Honest',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function localEnv(overrides: Record<string, unknown> = {}) {
  return {
    APP_MODE: 'local',
    CHAT_PROVIDER: 'ollama',
    CHAT_BASE_URL: 'http://127.0.0.1:11434/v1',
    CHAT_MODEL: 'qwen3:4b',
    DEEPSEEK_API_KEY: 'cloud-secret',
    DB: createDb(),
    ...overrides,
  }
}

function createDb() {
  return {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        run: vi.fn(async () => ({ meta: { changes: 1 } })),
        first: vi.fn(async () => {
          if (sql.includes('rate_limits')) return { request_count: 1 }
          if (sql.includes('FROM conversations')) return { id: 'c1', title: 'Chat', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }
          if (sql.includes('companion_profile')) return companionRow
          return null
        }),
        all: vi.fn(async () => ({ results: [] })),
      }
      return statement
    }),
  }
}

async function runtime(env = localEnv()) {
  const response = await getRuntime({ env } as never) as Response
  return { response, body: await response.json() as Record<string, unknown> }
}

async function chat(body: Record<string, unknown>, env = localEnv()) {
  const pending: Promise<unknown>[] = []
  const response = await postChat({
    request: new Request('https://example.test/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: 'c1', content: 'hello', ...body }),
    }),
    env,
    waitUntil: (promise: Promise<unknown>) => pending.push(promise),
  } as never) as Response
  const text = await response.text()
  await Promise.allSettled(pending)
  return { response, text }
}

describe('GET /api/runtime', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns only sanitized local runtime status', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'qwen3:4b' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)

    const { response, body } = await runtime()

    expect(response.status).toBe(200)
    expect(body).toEqual({ mode: 'local', provider: 'ollama', model: 'qwen3:4b', configured: true, reachable: true })
    expect(JSON.stringify(body)).not.toContain('cloud-secret')
    expect(JSON.stringify(body)).not.toContain('127.0.0.1')
  })

  it('reports a reachable Ollama service with a missing model', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'llama3.2' }] }), { status: 200 })))

    const { body } = await runtime()

    expect(body).toMatchObject({ configured: false, reachable: true, model: 'qwen3:4b' })
  })

  it('reports an unavailable local service without leaking its error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connect ECONNREFUSED http://user:pass@127.0.0.1') }))

    const { body } = await runtime()

    expect(body).toMatchObject({ configured: false, reachable: false })
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED')
    expect(JSON.stringify(body)).not.toContain('user:pass')
  })

  it('rejects credential-bearing runtime URLs without returning or contacting them', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)

    const { body } = await runtime(localEnv({ CHAT_BASE_URL: 'http://user:pass@127.0.0.1:11434/v1?token=secret#fragment' }))

    expect(body).toEqual({ mode: 'local', provider: 'ollama', model: 'qwen3:4b', configured: false, reachable: false })
    expect(fetcher).not.toHaveBeenCalled()
    expect(JSON.stringify(body)).not.toContain('secret')
  })
})

describe('POST /api/chat provider override', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    {},
    { providerOverride: 'cloud' },
    { providerOverride: 'cloud', confirmCloudOverride: false },
  ] as Array<Record<string, unknown>>)('does not silently call cloud after a local failure for request %o', async (override) => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      void init
      return new Response('local unavailable', { status: 503 })
    })
    vi.stubGlobal('fetch', fetcher)

    const { text } = await chat(override)

    expect(text).toContain('UPSTREAM_ERROR')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0][0])).toBe('http://127.0.0.1:11434/v1/chat/completions')
  })

  it('uses cloud only when the override is explicitly confirmed', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      void init
      return new Response(
        'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n',
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      )
    })
    vi.stubGlobal('fetch', fetcher)

    const { text } = await chat({ providerOverride: 'cloud', confirmCloudOverride: true })

    expect(text).toContain('event: done')
    expect(fetcher).toHaveBeenCalled()
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith('https://api.deepseek.com/'))).toBe(true)
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer cloud-secret')
  })
})
