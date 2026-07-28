import { LIMITS } from '../../config/limits'
import { ttsRequestSchema } from '../../shared/speech'
import { isSafeLocalTtsEndpoint } from '../../shared/speech-provider'
import { MiniMaxClient } from '../_lib/clients/minimax'
import { apiError, readJson } from '../_lib/http'
import { RateLimitRepository } from '../_lib/repositories/rate-limits'
import { UsageRepository } from '../_lib/repositories/usage'
import { UsageGuard } from '../_lib/services/guard'
import type { LunaPagesFunction } from '../_lib/types'

const LOCAL_TIMEOUT_MS = 10_000
const MAX_AUDIO_BYTES = 10 * 1024 * 1024

async function readBoundedAudio(response: Response, signal: AbortSignal): Promise<ArrayBuffer> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('LOCAL_TTS_EMPTY_AUDIO')
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const result = await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
        const abort = () => {
          void reader.cancel()
          reject(new DOMException('Aborted', 'AbortError'))
        }
        if (signal.aborted) return abort()
        signal.addEventListener('abort', abort, { once: true })
        reader.read().then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
      })
      if (result.done) break
      total += result.value.byteLength
      if (total > MAX_AUDIO_BYTES) {
        void reader.cancel().catch(() => undefined)
        throw new Error('LOCAL_TTS_TOO_LARGE')
      }
      chunks.push(result.value)
    }
  } catch (error) {
    void reader.cancel().catch(() => undefined)
    throw error
  }
  if (total === 0) throw new Error('LOCAL_TTS_EMPTY_AUDIO')
  const audio = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    audio.set(chunk, offset)
    offset += chunk.byteLength
  }
  return audio.buffer
}

async function localTts(endpoint: string, input: { text: string; voiceId: string; speed: number; pitch: number; volume: number }, requestSignal: AbortSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOCAL_TIMEOUT_MS)
  const cancel = () => controller.abort()
  requestSignal.addEventListener('abort', cancel, { once: true })
  try {
    const response = await fetch(endpoint, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'audio/*' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error('LOCAL_TTS_FAILED')
    const contentType = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() ?? ''
    if (!contentType.startsWith('audio/')) throw new Error('LOCAL_TTS_INVALID_TYPE')
    const declaredLength = Number(response.headers.get('Content-Length') ?? 0)
    if (declaredLength > MAX_AUDIO_BYTES) throw new Error('LOCAL_TTS_TOO_LARGE')
    const audio = await readBoundedAudio(response, controller.signal)
    return { audio, contentType }
  } finally {
    clearTimeout(timer)
    requestSignal.removeEventListener('abort', cancel)
  }
}

export const onRequestPost: LunaPagesFunction = async ({ request, env }) => {
  let input
  try {
    input = ttsRequestSchema.parse(await readJson(request))
  } catch {
    return apiError(400, 'INVALID_REQUEST', '语音参数无效')
  }
  if (input.provider === 'browser') return apiError(400, 'INVALID_SPEECH_PROVIDER', '浏览器语音不应发送到服务端')
  if (input.provider === 'local' && (!env.LOCAL_TTS_ENDPOINT || !isSafeLocalTtsEndpoint(env.LOCAL_TTS_ENDPOINT, env.APP_MODE ?? 'cloud'))) {
    return apiError(503, 'TTS_PROVIDER_UNAVAILABLE', '本地语音尚未安全配置')
  }
  if (input.provider === 'minimax' && !env.MINIMAX_API_KEY) {
    return apiError(503, 'TTS_PROVIDER_UNAVAILABLE', 'MiniMax 语音尚未配置')
  }

  const usage = new UsageRepository(env.DB)
  const guard = new UsageGuard(new RateLimitRepository(env.DB), usage)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
  if (!(await guard.rateLimit(`tts:${ip}`, LIMITS.ttsRequestsPerMinute, 60))) return apiError(429, 'RATE_LIMITED', '语音请求太频繁')
  const date = new Date().toISOString().slice(0, 10)
  if (!(await guard.allowTts(date))) return apiError(429, 'DAILY_LIMIT', '今日语音用量已达到上限')

  try {
    let audio: ArrayBuffer
    let contentType = 'audio/mpeg'
    if (input.provider === 'local') {
      const result = await localTts(env.LOCAL_TTS_ENDPOINT!, {
        text: input.text, voiceId: input.voiceId, speed: input.speed, pitch: input.pitch, volume: input.volume,
      }, request.signal)
      audio = result.audio
      contentType = result.contentType
    } else {
      audio = await new MiniMaxClient(env.MINIMAX_API_KEY!).tts(input)
    }
    await usage.increment(date, { chatCalls: 0, ttsCalls: 1, inputTokens: 0, outputTokens: 0 })
    return new Response(audio, { headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=86400' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'MINIMAX_2056') return apiError(402, 'TTS_UPSTREAM_QUOTA', 'MiniMax 语音额度不足，请补充额度后重试')
    return apiError(502, 'TTS_UNAVAILABLE', '语音生成暂时不可用')
  }
}
