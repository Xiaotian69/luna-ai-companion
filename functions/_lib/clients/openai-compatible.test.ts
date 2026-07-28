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
