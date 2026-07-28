import { isSafeLocalTtsEndpoint, speechProviderSchema } from '../../shared/speech-provider'
import { MiniMaxClient } from '../_lib/clients/minimax'
import { apiError, json } from '../_lib/http'
import { rankVoices } from '../_lib/services/speech'
import type { LunaPagesFunction } from '../_lib/types'

export const onRequestGet: LunaPagesFunction = async ({ request, env }) => {
  const parsed = speechProviderSchema.safeParse(new URL(request.url).searchParams.get('provider') ?? 'browser')
  if (!parsed.success) return apiError(400, 'INVALID_SPEECH_PROVIDER', '语音提供方无效')

  if (parsed.data === 'browser') return json({ provider: 'browser', configured: true, voices: [] })
  if (parsed.data === 'local') {
    const configured = Boolean(env.LOCAL_TTS_ENDPOINT && isSafeLocalTtsEndpoint(env.LOCAL_TTS_ENDPOINT, 'local'))
    return json({
      provider: 'local', configured,
      voices: configured ? [{ id: 'default', name: '本地默认语音', description: '由本地 TTS 服务提供' }] : [],
    })
  }
  if (!env.MINIMAX_API_KEY) return apiError(503, 'VOICE_PROVIDER_UNAVAILABLE', 'MiniMax 语音尚未配置')

  try {
    return json({ provider: 'minimax', configured: true, voices: rankVoices(await new MiniMaxClient(env.MINIMAX_API_KEY).voices()) })
  } catch {
    return apiError(502, 'VOICE_LIST_UNAVAILABLE', '暂时无法获取音色列表')
  }
}
