import { LIMITS } from '../../config/limits'
import { json } from '../_lib/http'
import { UsageRepository } from '../_lib/repositories/usage'
import type { LunaPagesFunction } from '../_lib/types'
export const onRequestGet: LunaPagesFunction = async ({ env }) => { const date = new Date().toISOString().slice(0, 10); return json({ usage: await new UsageRepository(env.DB).get(date), limits: { chatCalls: LIMITS.dailyChatRequests, ttsCalls: LIMITS.dailyTtsRequests, tokens: LIMITS.dailyEstimatedTokens } }) }
