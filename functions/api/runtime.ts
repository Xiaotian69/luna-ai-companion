import { CHAT_PROVIDER_DEFAULTS } from '../../config/models'
import type { RuntimeMode, RuntimeProvider, RuntimeStatus } from '../../shared/runtime'
import { resolveChatConfig, type ChatProviderEnv } from '../_lib/clients/chat-provider'
import type { LunaPagesFunction } from '../_lib/types'

function fallbackStatus(env: ChatProviderEnv): RuntimeStatus {
  const provider: RuntimeProvider = env.CHAT_PROVIDER === 'ollama' ? 'ollama' : 'deepseek'
  const mode: RuntimeMode = env.APP_MODE === 'local' ? 'local' : 'cloud'
  return {
    mode,
    provider,
    model: env.CHAT_MODEL?.trim() || CHAT_PROVIDER_DEFAULTS[provider].model,
    configured: false,
    reachable: false,
  }
}

export async function inspectRuntime(env: ChatProviderEnv, fetcher: typeof fetch = globalThis.fetch): Promise<RuntimeStatus> {
  const fallback = fallbackStatus(env)
  let config
  try {
    config = resolveChatConfig(env)
  } catch {
    return fallback
  }

  try {
    const headers = new Headers()
    if (config.apiKey) headers.set('Authorization', `Bearer ${config.apiKey}`)
    const response = await fetcher.call(globalThis, `${config.baseUrl}/models`, { headers })
    if (!response.ok) return fallback
    const body = await response.json() as { data?: Array<{ id?: string }> }
    return {
      mode: fallback.mode,
      provider: config.provider,
      model: config.model,
      configured: body.data?.some((model) => model.id === config.model) ?? false,
      reachable: true,
    }
  } catch {
    return fallback
  }
}

export const onRequestGet: LunaPagesFunction = async ({ env }) => Response.json(
  await inspectRuntime(env),
  { headers: { 'Cache-Control': 'no-store' } },
)
