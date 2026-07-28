import { CHAT_PROVIDER_DEFAULTS } from '../../config/models'
import type { RuntimeMode, RuntimeProvider, RuntimeStatus } from '../../shared/runtime'
import { resolveChatConfig, type ChatProviderEnv } from '../_lib/clients/chat-provider'
import type { LunaPagesFunction } from '../_lib/types'

const RUNTIME_TIMEOUT_MS = 3_000

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

function modelIds(value: unknown): string[] | null {
  if (!value || typeof value !== 'object' || !('data' in value) || !Array.isArray(value.data)) return null
  const ids: string[] = []
  for (const model of value.data) {
    if (!model || typeof model !== 'object' || !('id' in model) || typeof model.id !== 'string') return null
    ids.push(model.id)
  }
  return ids
}

export async function inspectRuntime(env: ChatProviderEnv, fetcher: typeof fetch = globalThis.fetch, timeoutMs = RUNTIME_TIMEOUT_MS): Promise<RuntimeStatus> {
  const fallback = fallbackStatus(env)
  let config
  try {
    config = resolveChatConfig(env)
  } catch {
    return fallback
  }

  const unavailable: RuntimeStatus = {
    ...fallback,
    provider: config.provider,
    model: config.model,
    configured: config.provider === 'deepseek',
  }
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const probe = (async (): Promise<RuntimeStatus> => {
      const headers = new Headers()
      if (config.apiKey) headers.set('Authorization', `Bearer ${config.apiKey}`)
      const response = await fetcher.call(globalThis, `${config.baseUrl}/models`, { headers, signal: controller.signal })
      if (response.status === 401 || response.status === 403) return { ...unavailable, configured: false, reachable: true }
      if (response.status >= 500) return unavailable
      if (!response.ok) return { ...unavailable, configured: false, reachable: true }

      let body: unknown
      try {
        body = await response.json()
      } catch (error) {
        if (controller.signal.aborted) throw error
        return { ...unavailable, reachable: true }
      }
      const ids = modelIds(body)
      if (!ids) return { ...unavailable, reachable: true }
      return { ...unavailable, configured: ids.includes(config.model), reachable: true }
    })()
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Error('RUNTIME_PROBE_TIMEOUT'))
      }, timeoutMs)
    })
    return await Promise.race([probe, timeout])
  } catch {
    return unavailable
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

export const onRequestGet: LunaPagesFunction = async ({ env }) => Response.json(
  await inspectRuntime(env),
  { headers: { 'Cache-Control': 'no-store' } },
)
