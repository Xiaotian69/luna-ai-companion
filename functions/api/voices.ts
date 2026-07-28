import { isSafeLocalTtsEndpoint, speechProviderSchema } from '../../shared/speech-provider'
import { MiniMaxClient } from '../_lib/clients/minimax'
import { apiError, json } from '../_lib/http'
import { rankVoices } from '../_lib/services/speech'
import type { LunaPagesFunction } from '../_lib/types'

export const onRequestGet: LunaPagesFunction = async ({ request, env }) => {
  const searchParams = new URL(request.url).searchParams
  if ([...searchParams.keys()].some((key) => key !== 'provider')) return apiError(400, 'INVALID_REQUEST', '语音参数无效')
  const parsed = speechProviderSchema.safeParse(searchParams.get('provider') ?? 'browser')
  if (!parsed.success) return apiError(400, 'INVALID_SPEECH_PROVIDER', '语音提供方无效')

  if (parsed.data === 'browser') return json({ provider: 'browser', configured: true, voices: [] })
  if (parsed.data === 'local') {
    const configured = Boolean(env.LOCAL_TTS_ENDPOINT && isSafeLocalTtsEndpoint(env.LOCAL_TTS_ENDPOINT, env.APP_MODE ?? 'cloud'))
    return json({
      provider: 'local', configured,
      voices: configured ? [{ id: 'default', name: '本地默认语音', description: '由本地 TTS 服务提供' }] : [],
    })
  }
  if (!env.MINIMAX_API_KEY) return json({ provider: 'minimax', configured: false, voices: [] })

  try {
    return json({ provider: 'minimax', configured: true, voices: rankVoices(await new MiniMaxClient(env.MINIMAX_API_KEY).voices()) })
  } catch {
    return apiError(502, 'VOICE_LIST_UNAVAILABLE', '暂时无法获取音色列表')
  }
}
