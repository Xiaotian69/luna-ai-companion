import { resolveChatConfig } from './chat-provider'
import { OpenAICompatibleClient } from './openai-compatible'

export class DeepSeekClient extends OpenAICompatibleClient {
  constructor(apiKey: string, fetcher: typeof fetch = globalThis.fetch) {
    super(resolveChatConfig({ CHAT_PROVIDER: 'deepseek', CHAT_API_KEY: apiKey }), fetcher)
  }
}
