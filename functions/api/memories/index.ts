import { apiError, json, readJson } from '../../_lib/http'
import { MemoryRepository } from '../../_lib/repositories/memories'
import type { LunaPagesFunction } from '../../_lib/types'
import { z } from 'zod'
const createSchema = z.object({ memoryType: z.string().min(1).max(40), content: z.string().trim().min(1).max(500), importance: z.number().min(0).max(1) })
export const onRequestGet: LunaPagesFunction = async ({ env }) => json({ memories: await new MemoryRepository(env.DB).list() })
export const onRequestPost: LunaPagesFunction = async ({ request, env }) => { try { const input = createSchema.parse(await readJson(request)); const id = crypto.randomUUID(); await new MemoryRepository(env.DB).create({ id, ...input, sourceConversationId: null, sourceMessageId: null, now: new Date().toISOString() }); return json({ id }, { status: 201 }) } catch { return apiError(400, 'INVALID_REQUEST', '记忆内容无效') } }
