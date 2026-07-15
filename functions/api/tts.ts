import { LIMITS } from '../../config/limits'
import { ttsRequestSchema } from '../../shared/speech'
import { MiniMaxClient } from '../_lib/clients/minimax'
import { apiError, readJson } from '../_lib/http'
import { RateLimitRepository } from '../_lib/repositories/rate-limits'
import { UsageRepository } from '../_lib/repositories/usage'
import { UsageGuard } from '../_lib/services/guard'
import type { LunaPagesFunction } from '../_lib/types'
export const onRequestPost: LunaPagesFunction = async ({ request, env }) => { let input; try { input = ttsRequestSchema.parse(await readJson(request)) } catch { return apiError(400, 'INVALID_REQUEST', '语音参数无效') } const usage = new UsageRepository(env.DB); const guard = new UsageGuard(new RateLimitRepository(env.DB), usage); const ip = request.headers.get('CF-Connecting-IP') ?? 'local'; if (!(await guard.rateLimit(`tts:${ip}`, LIMITS.ttsRequestsPerMinute, 60))) return apiError(429, 'RATE_LIMITED', '语音请求太频繁'); const date = new Date().toISOString().slice(0, 10); if (!(await guard.allowTts(date))) return apiError(429, 'DAILY_LIMIT', '今日语音用量已达到上限'); try { const audio = await new MiniMaxClient(env.MINIMAX_API_KEY).tts(input); await usage.increment(date, { chatCalls: 0, ttsCalls: 1, inputTokens: 0, outputTokens: 0 }); return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' } }) } catch (error) { if (error instanceof Error && error.message === 'MINIMAX_2056') return apiError(402, 'TTS_UPSTREAM_QUOTA', 'MiniMax 语音额度不足，请补充额度后重试'); return apiError(502, 'TTS_UNAVAILABLE', '语音生成暂时不可用') } }
