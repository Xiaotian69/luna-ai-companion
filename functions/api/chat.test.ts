import { afterEach, describe, expect, it, vi } from 'vitest'
import { inspectRuntime, onRequestGet as getRuntime } from './runtime'
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

function cloudEnv(overrides: Record<string, unknown> = {}) {
  return {
    APP_MODE: 'cloud',
    CHAT_PROVIDER: 'deepseek',
    DEEPSEEK_API_KEY: 'cloud-secret',
    DB: createDb(),
    ...overrides,
  }
}

function createDb(memoryRows: Record<string, unknown>[] = []) {
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
        all: vi.fn(async () => ({ results: sql.startsWith('SELECT * FROM memories WHERE is_active = 1 ORDER BY') ? memoryRows : [] })),
      }
      return statement
    }),
  }
}

async function runtime(env: Record<string, unknown> = localEnv()) {
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
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

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

  it('reports malformed model data as reachable without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [null] }), { status: 200 })))

    const { body } = await runtime()

    expect(body).toMatchObject({ configured: false, reachable: true })
  })

  it('reports a missing cloud key as unconfigured and unreachable without probing', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)

    const { body } = await runtime(cloudEnv({ DEEPSEEK_API_KEY: undefined }))

    expect(body).toMatchObject({ mode: 'cloud', provider: 'deepseek', configured: false, reachable: false })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([401, 403])('reports cloud authentication rejection %s as reachable but unconfigured', async (status) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status })))

    const { body } = await runtime(cloudEnv())

    expect(body).toMatchObject({ configured: false, reachable: true })
  })

  it('keeps a rate-limited cloud provider configured but unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 429 })))

    const { body } = await runtime(cloudEnv())

    expect(body).toMatchObject({ configured: true, reachable: false })
  })

  it('does not report a cloud provider with invalid JSON as ready', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    const { body } = await runtime(cloudEnv())

    expect(body).toMatchObject({ configured: true, reachable: false })
  })

  it('does not report a cloud provider with malformed model data as ready', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [null] }), { status: 200 })))

    const { body } = await runtime(cloudEnv())

    expect(body).toMatchObject({ configured: true, reachable: false })
  })

  it('reports a configured cloud provider network failure as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network failed') }))

    const { body } = await runtime(cloudEnv())

    expect(body).toMatchObject({ configured: true, reachable: false })
  })

  it('reports a configured cloud provider 5xx response as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })))

    const { body } = await runtime(cloudEnv())

    expect(body).toMatchObject({ configured: true, reachable: false })
  })

  it('aborts a provider probe that does not settle before the timeout', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      })
    }) as unknown as typeof fetch

    const result = inspectRuntime(cloudEnv(), fetcher, 50)
    await vi.advanceTimersByTimeAsync(50)

    await expect(result).resolves.toMatchObject({ configured: true, reachable: false })
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('bounds model response parsing with the same timeout', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: () => new Promise(() => undefined),
    } as Response)) as unknown as typeof fetch

    const result = inspectRuntime(cloudEnv(), fetcher, 50)
    await vi.advanceTimersByTimeAsync(50)

    await expect(result).resolves.toMatchObject({ configured: true, reachable: false })
    expect(vi.getTimerCount()).toBe(0)
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

  it('does not claim or count memory use when the provider rejects before a stream exists', async () => {
    const db = createDb([{
      id: 'memory-1', memory_type: 'preference', content: '用户喜欢旅行', importance: 0.9,
      category: 'about_user', sensitivity: 'normal', confidence: 0.8, access_count: 0,
      last_accessed_at: null, superseded_memory_id: null, normalized_content: '用户喜欢旅行',
      source_conversation_id: null, source_message_id: null, created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z', is_active: 1,
    }])
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unavailable', { status: 503 })))

    const { text } = await chat({ content: '旅行' }, localEnv({ DB: db }))

    expect(text).not.toContain('usedMemories')
    expect(db.prepare.mock.calls.some(([sql]) => String(sql).includes('SET access_count = access_count + 1'))).toBe(false)
  })

  it('emits exactly the bounded memories injected into the model context', async () => {
    const memoryRows = Array.from({ length: 9 }, (_, index) => ({
      id: `memory-${index}`,
      memory_type: 'preference',
      content: `用户喜欢旅行路线 ${index}`,
      importance: 1 - (index / 10),
      category: 'about_user',
      sensitivity: 'normal',
      confidence: 0.8,
      access_count: 0,
      last_accessed_at: null,
      superseded_memory_id: null,
      normalized_content: `用户喜欢旅行路线${index}`,
      source_conversation_id: 'c1',
      source_message_id: 'source',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      is_active: 1,
    }))
    const providerRequests: Array<Array<{ content: string }>> = []
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages?: Array<{ content: string }> }
      if (body.messages) providerRequests.push(body.messages)
      return new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n', { status: 200 })
    })
    vi.stubGlobal('fetch', fetcher)

    const { text } = await chat({ content: '旅行路线' }, localEnv({ DB: createDb(memoryRows) }))
    const metaLine = text.split('\n').find((line) => line.startsWith('data:') && line.includes('usedMemories'))
    const meta = JSON.parse(metaLine?.slice(5).trim() ?? '{}') as { usedMemories: Array<{ id: string; displayText: string }> }
    const contextText = providerRequests.find((messages) => messages.some((message) => message.content.includes('用户喜欢旅行路线 0')))?.map((message) => message.content).join('\n') ?? ''

    expect(meta.usedMemories).toHaveLength(8)
    expect(meta.usedMemories.map((memory) => memory.id)).toEqual(Array.from({ length: 8 }, (_, index) => `memory-${index}`))
    for (const memory of meta.usedMemories) expect(contextText).toContain(memory.displayText)
    expect(contextText).not.toContain('用户喜欢旅行路线 8')
  })
})
