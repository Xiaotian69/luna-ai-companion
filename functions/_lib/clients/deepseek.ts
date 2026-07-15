import { MODELS } from '../../../config/models'
import { parseDeepSeekStream, type ModelMessage } from '../../../shared/stream'

export class DeepSeekClient {
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {}
  async stream(messages: ModelMessage[], signal?: AbortSignal): Promise<AsyncGenerator<string>> {
    const response = await this.fetcher(`${MODELS.chat.baseUrl}${MODELS.chat.endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODELS.chat.model, messages, stream: true, temperature: MODELS.chat.temperature, max_tokens: MODELS.chat.maxTokens, thinking: { type: 'disabled' } }), signal })
    if (!response.ok || !response.body) throw new Error(`DEEPSEEK_${response.status}`)
    return parseDeepSeekStream(response.body)
  }
  async complete(messages: ModelMessage[], signal?: AbortSignal): Promise<string> {
    const response = await this.fetcher(`${MODELS.chat.baseUrl}${MODELS.chat.endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODELS.chat.model, messages, stream: false, temperature: 0.2, max_tokens: 1_200, thinking: { type: 'disabled' } }), signal })
    if (!response.ok) throw new Error(`DEEPSEEK_${response.status}`)
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = body.choices?.[0]?.message?.content
    if (!content) throw new Error('DEEPSEEK_EMPTY')
    return content
  }
}
