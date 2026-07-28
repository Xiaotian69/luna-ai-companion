import { parseDeepSeekStream, type ModelMessage } from '../../../shared/stream'
import type { ChatConfig, ChatProvider } from './chat-provider'

export class OpenAICompatibleClient implements ChatProvider {
  private readonly fetcher: typeof fetch

  constructor(private readonly config: ChatConfig, fetcher: typeof fetch = globalThis.fetch) {
    this.fetcher = (input, init) => fetcher.call(globalThis, input, init)
  }

  async stream(messages: ModelMessage[], signal?: AbortSignal): Promise<AsyncGenerator<string>> {
    const response = await this.request(messages, true, this.config.temperature, this.config.maxTokens, signal)
    if (!response.body) throw new Error(`${this.config.errorPrefix}_${response.status}`)
    return parseDeepSeekStream(response.body)
  }

  async complete(messages: ModelMessage[], signal?: AbortSignal): Promise<string> {
    const response = await this.request(messages, false, 0.2, 1_200, signal)
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = body.choices?.[0]?.message?.content
    if (!content) throw new Error(`${this.config.errorPrefix}_EMPTY`)
    return content
  }

  private async request(messages: ModelMessage[], stream: boolean, temperature: number, maxTokens: number, signal?: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`
    const response = await this.fetcher(`${this.config.baseUrl}${this.config.endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream,
        temperature,
        max_tokens: maxTokens,
        ...this.config.extraBody,
      }),
      signal,
    })
    if (!response.ok) throw new Error(`${this.config.errorPrefix}_${response.status}`)
    return response
  }
}
