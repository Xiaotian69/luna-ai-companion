import { MiniMaxClient } from '../_lib/clients/minimax'
import { apiError, json } from '../_lib/http'
import { rankVoices } from '../_lib/services/speech'
import type { LunaPagesFunction } from '../_lib/types'
export const onRequestGet: LunaPagesFunction = async ({ env }) => { try { return json({ voices: rankVoices(await new MiniMaxClient(env.MINIMAX_API_KEY).voices()) }) } catch { return apiError(502, 'VOICE_LIST_UNAVAILABLE', '暂时无法获取音色列表') } }
