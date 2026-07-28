import { describe, expect, it } from 'vitest'
import { MODELS } from '../../../config/models'
import { parseEnv } from '../../../shared/env'
import { createChatProvider, resolveChatConfig } from './chat-provider'
import { OpenAICompatibleClient } from './openai-compatible'

describe('OpenAI-compatible chat providers', () => {
  it('keeps DeepSeek as the cloud default', () => {
    expect(resolveChatConfig({ DEEPSEEK_API_KEY: 'deepseek-test' })).toMatchObject({
      provider: 'deepseek',
      baseUrl: MODELS.chat.baseUrl,
      model: MODELS.chat.model,
      apiKey: 'deepseek-test',
      requiresApiKey: true,
    })
  })

  it('resolves an explicitly local Ollama provider without an API key', () => {
    expect(resolveChatConfig({
      CHAT_PROVIDER: 'ollama',
      CHAT_BASE_URL: 'http://127.0.0.1:11434/v1',
      CHAT_MODEL: 'qwen3:4b',
    })).toMatchObject({
      provider: 'ollama',
      baseUrl: 'http://127.0.0.1:11434/v1',
      requiresApiKey: false,
      model: 'qwen3:4b',
    })
  })

  it('requires an API key for the default cloud provider', () => {
    expect(() => resolveChatConfig({})).toThrow('CHAT_API_KEY_MISSING')
    expect(() => parseEnv({
      MINIMAX_API_KEY: 'minimax-test',
      APP_PASSWORD: 'strong-password',
      SESSION_SECRET: 'x'.repeat(32),
      DB: {},
    })).toThrow()
  })

  it('accepts a keyless explicitly local provider environment', () => {
    expect(parseEnv({
      APP_MODE: 'local',
      CHAT_PROVIDER: 'ollama',
      CHAT_BASE_URL: 'http://127.0.0.1:11434/v1',
      CHAT_MODEL: 'qwen3:4b',
      CHAT_API_KEY: '',
      MINIMAX_API_KEY: 'minimax-test',
      APP_PASSWORD: 'strong-password',
      SESSION_SECRET: 'x'.repeat(32),
      DB: {},
    })).toMatchObject({ APP_MODE: 'local', CHAT_PROVIDER: 'ollama', CHAT_API_KEY: '' })
  })

  it.each([
    'ftp://127.0.0.1:11434/v1',
    'not a URL',
  ])('rejects invalid provider base URL %s at the runtime resolver', (baseUrl) => {
    expect(() => resolveChatConfig({
      CHAT_PROVIDER: 'ollama',
      CHAT_BASE_URL: baseUrl,
      CHAT_MODEL: 'qwen3:4b',
    })).toThrow()
  })

  it('rejects a blank explicitly configured model at the runtime resolver', () => {
    expect(() => resolveChatConfig({
      CHAT_PROVIDER: 'ollama',
      CHAT_MODEL: '   ',
    })).toThrow()
  })

  it('rejects an invalid app mode at the runtime resolver', () => {
    expect(() => resolveChatConfig({
      APP_MODE: 'staging',
      CHAT_PROVIDER: 'ollama',
    })).toThrow()
  })

  it('rejects inherited object property names as providers', () => {
    expect(() => resolveChatConfig({
      CHAT_PROVIDER: 'toString',
    })).toThrow('CHAT_PROVIDER_UNSUPPORTED')
  })

  it('sends the OpenAI-compatible Ollama request without authorization', async () => {
    let requestUrl = ''
    let requestInit: RequestInit | undefined
    const fetcher = ((input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = String(input)
      requestInit = init
      return Promise.resolve(new Response('data: [DONE]\n\n', { status: 200 }))
    }) as typeof fetch
    const client = createChatProvider({
      CHAT_PROVIDER: 'ollama',
      CHAT_BASE_URL: 'http://127.0.0.1:11434/v1',
      CHAT_MODEL: 'qwen3:4b',
    }, fetcher)

    await client.stream([{ role: 'user', content: 'hi' }])

    expect(requestUrl).toBe('http://127.0.0.1:11434/v1/chat/completions')
    expect(new Headers(requestInit?.headers).has('Authorization')).toBe(false)
    const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>
    expect(body).toMatchObject({
      model: 'qwen3:4b',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    })
    expect(body).not.toHaveProperty('thinking')
  })

  it('preserves the legacy DeepSeek request and error contract', async () => {
    let requestUrl = ''
    let requestInit: RequestInit | undefined
    const fetcher = ((input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = String(input)
      requestInit = init
      return Promise.resolve(new Response(null, { status: 429 }))
    }) as typeof fetch
    const client = createChatProvider({ DEEPSEEK_API_KEY: 'legacy-key' }, fetcher)

    await expect(client.complete([{ role: 'user', content: 'hi' }])).rejects.toThrow('DEEPSEEK_429')
    expect(requestUrl).toBe(`${MODELS.chat.baseUrl}${MODELS.chat.endpoint}`)
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe('Bearer legacy-key')
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      model: MODELS.chat.model,
      messages: [{ role: 'user', content: 'hi' }],
      stream: false,
      thinking: { type: 'disabled' },
    })
  })

  it('parses CRLF-delimited SSE responses', async () => {
    const fetcher = (() => Promise.resolve(new Response(
      'data: {"choices":[{"delta":{"content":"hello"}}]}\r\n\r\ndata: [DONE]\r\n\r\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    ))) as typeof fetch
    const client = new OpenAICompatibleClient(resolveChatConfig({
      CHAT_PROVIDER: 'ollama',
      CHAT_BASE_URL: 'http://127.0.0.1:11434/v1',
      CHAT_MODEL: 'qwen3:4b',
    }), fetcher)

    const chunks = await client.stream([{ role: 'user', content: 'hi' }])

    const values: string[] = []
    for await (const chunk of chunks) values.push(chunk)
    expect(values).toEqual(['hello'])
  })

  it('forwards request cancellation to the provider', async () => {
    const controller = new AbortController()
    let receivedSignal: AbortSignal | null | undefined
    const fetcher = ((_input: RequestInfo | URL, init?: RequestInit) => {
      receivedSignal = init?.signal
      return Promise.reject(new DOMException('Aborted', 'AbortError'))
    }) as typeof fetch
    const client = createChatProvider({
      CHAT_PROVIDER: 'ollama',
      CHAT_BASE_URL: 'http://127.0.0.1:11434/v1',
      CHAT_MODEL: 'qwen3:4b',
    }, fetcher)

    controller.abort()

    await expect(client.stream([{ role: 'user', content: 'hi' }], controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(receivedSignal).toBe(controller.signal)
  })
})
