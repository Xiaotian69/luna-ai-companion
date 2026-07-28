import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestGet as getVoices } from './voices'
import { onRequestPost as postTts } from './tts'

function db() {
  return {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        run: vi.fn(async () => ({ meta: { changes: 1 } })),
        first: vi.fn(async () => sql.includes('rate_limits') ? { request_count: 1 } : null),
      }
      return statement
    }),
  }
}

function tts(body: unknown, env: Record<string, unknown>) {
  return postTts({
    request: new Request('https://example.test/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    env: { DB: db(), APP_MODE: 'local', ...env },
  } as never) as Promise<Response>
}

describe('GET /api/voices', () => {
  it('does not require MiniMax for browser or local provider status', async () => {
    const browser = await getVoices({ request: new Request('https://example.test/api/voices?provider=browser'), env: {} } as never) as Response
    const local = await getVoices({ request: new Request('https://example.test/api/voices?provider=local'), env: { LOCAL_TTS_ENDPOINT: 'http://127.0.0.1:8000/tts', APP_MODE: 'local' } } as never) as Response
    expect(await browser.json()).toMatchObject({ provider: 'browser', configured: true })
    expect(await local.json()).toMatchObject({ provider: 'local', configured: true })
  })

  it('does not describe an unsafe local endpoint as configured', async () => {
    const response = await getVoices({ request: new Request('https://example.test/api/voices?provider=local'), env: { LOCAL_TTS_ENDPOINT: 'http://169.254.169.254/latest', APP_MODE: 'local' } } as never) as Response
    expect(await response.json()).toMatchObject({ provider: 'local', configured: false, voices: [] })
  })

  it('reports MiniMax as unavailable without exposing configuration', async () => {
    const response = await getVoices({ request: new Request('https://example.test/api/voices?provider=minimax'), env: {} } as never) as Response
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('API_KEY')
  })

  it('strictly rejects an unknown provider', async () => {
    const response = await getVoices({ request: new Request('https://example.test/api/voices?provider=other'), env: {} } as never) as Response
    expect(response.status).toBe(400)
  })
})

describe('POST /api/tts', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('calls a configured local endpoint without a MiniMax key', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      void init
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/wav' } })
    })
    vi.stubGlobal('fetch', fetcher)
    const response = await tts({ provider: 'local', text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 }, { LOCAL_TTS_ENDPOINT: 'http://127.0.0.1:8000/tts' })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('audio/wav')
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8000/tts', expect.objectContaining({ method: 'POST', redirect: 'error' }))
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 })
  })

  it('rejects unsafe local endpoints without contacting them or leaking the URL', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const response = await tts({ provider: 'local', text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 }, { LOCAL_TTS_ENDPOINT: 'http://169.254.169.254/latest' })
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('169.254')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('requires MiniMax configuration only for MiniMax requests', async () => {
    const response = await tts({ provider: 'minimax', text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 }, {})
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('TTS_PROVIDER_UNAVAILABLE')
  })

  it('rejects non-audio and oversized local responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not audio', { headers: { 'Content-Type': 'text/plain' } })))
    const response = await tts({ provider: 'local', text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 }, { LOCAL_TTS_ENDPOINT: 'http://localhost:8000/tts' })
    expect(response.status).toBe(502)
  })

  it('cancels an unbounded audio stream once the size limit is exceeded', async () => {
    let pulls = 0
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1
        if (pulls > 20) controller.close()
        else controller.enqueue(new Uint8Array(1024 * 1024))
      },
      cancel() { cancelled = true },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, { headers: { 'Content-Type': 'audio/wav' } })))
    const response = await tts({ provider: 'local', text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 }, { LOCAL_TTS_ENDPOINT: 'http://localhost:8000/tts' })
    expect(response.status).toBe(502)
    expect(cancelled).toBe(true)
    expect(pulls).toBeLessThanOrEqual(12)
  })

  it('propagates client cancellation to the local provider request', async () => {
    vi.useFakeTimers()
    let providerSignal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      providerSignal = init?.signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => providerSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
    }))
    const controller = new AbortController()
    const pending = postTts({
      request: new Request('https://example.test/api/tts', {
        method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'local', text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 }),
      }),
      env: { DB: db(), APP_MODE: 'local', LOCAL_TTS_ENDPOINT: 'http://localhost:8000/tts' },
    } as never) as Promise<Response>
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect(providerSignal?.aborted).toBe(true)
    expect((await pending).status).toBe(502)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('aborts a local request that exceeds the timeout', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      })
    }))
    const pending = tts({ provider: 'local', text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 }, { LOCAL_TTS_ENDPOINT: 'http://localhost:8000/tts' })
    await vi.advanceTimersByTimeAsync(10_000)
    const response = await pending
    expect(response.status).toBe(502)
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('strictly rejects a browser request because it never belongs on the server', async () => {
    const response = await tts({ provider: 'browser', text: 'hello', voiceId: 'default', speed: 1, pitch: 0, volume: 1 }, {})
    expect(response.status).toBe(400)
  })
})
