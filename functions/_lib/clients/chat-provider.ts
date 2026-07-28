import { CHAT_PROVIDER_DEFAULTS, MODELS } from '../../../config/models'
import type { ModelMessage } from '../../../shared/stream'
import { OpenAICompatibleClient } from './openai-compatible'

export type ChatProviderName = keyof typeof CHAT_PROVIDER_DEFAULTS

export interface ChatProviderEnv {
  APP_MODE?: string
  CHAT_PROVIDER?: string
  CHAT_BASE_URL?: string
  CHAT_MODEL?: string
  CHAT_API_KEY?: string
  DEEPSEEK_API_KEY?: string
}

export interface ChatConfig {
  provider: ChatProviderName
  baseUrl: string
  endpoint: string
  model: string
  apiKey?: string
  requiresApiKey: boolean
  temperature: number
  maxTokens: number
  extraBody?: Record<string, unknown>
  errorPrefix: string
}

export interface ChatProvider {
  stream(messages: ModelMessage[], signal?: AbortSignal): Promise<AsyncGenerator<string>>
  complete(messages: ModelMessage[], signal?: AbortSignal): Promise<string>
}

function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

export function resolveChatConfig(env: ChatProviderEnv): ChatConfig {
  const provider = env.CHAT_PROVIDER?.trim() || 'deepseek'
  if (!(provider in CHAT_PROVIDER_DEFAULTS)) throw new Error('CHAT_PROVIDER_UNSUPPORTED')
  const name = provider as ChatProviderName
  const defaults = CHAT_PROVIDER_DEFAULTS[name]
  const apiKey = optionalValue(env.CHAT_API_KEY) ?? (name === 'deepseek' ? optionalValue(env.DEEPSEEK_API_KEY) : undefined)
  if (defaults.requiresApiKey && !apiKey) throw new Error('CHAT_API_KEY_REQUIRED')
  return {
    provider: name,
    baseUrl: optionalValue(env.CHAT_BASE_URL)?.replace(/\/+$/, '') ?? defaults.baseUrl,
    endpoint: MODELS.chat.endpoint,
    model: optionalValue(env.CHAT_MODEL) ?? defaults.model,
    apiKey,
    requiresApiKey: defaults.requiresApiKey,
    temperature: MODELS.chat.temperature,
    maxTokens: MODELS.chat.maxTokens,
    extraBody: name === 'deepseek' ? { thinking: { type: 'disabled' } } : undefined,
    errorPrefix: name.toUpperCase(),
  }
}

export function createChatProvider(env: ChatProviderEnv, fetcher: typeof fetch = globalThis.fetch): OpenAICompatibleClient {
  return new OpenAICompatibleClient(resolveChatConfig(env), fetcher)
}
