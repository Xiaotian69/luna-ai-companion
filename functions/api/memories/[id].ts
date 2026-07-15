import { memoryUpdateSchema } from '../../../shared/memory'
import { apiError, json, readJson } from '../../_lib/http'
import { MemoryRepository } from '../../_lib/repositories/memories'
import type { LunaPagesFunction } from '../../_lib/types'
export const onRequestPut: LunaPagesFunction = async ({ request, env, params }) => { try { const input = memoryUpdateSchema.parse(await readJson(request)); return (await new MemoryRepository(env.DB).update(String(params.id), { ...input, now: new Date().toISOString() })) ? json({ ok: true }) : apiError(404, 'NOT_FOUND', '记忆不存在') } catch { return apiError(400, 'INVALID_REQUEST', '记忆内容无效') } }
export const onRequestDelete: LunaPagesFunction = async ({ env, params }) => (await new MemoryRepository(env.DB).delete(String(params.id))) ? json({ ok: true }) : apiError(404, 'NOT_FOUND', '记忆不存在')
