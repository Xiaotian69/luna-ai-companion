import { apiError, json } from '../../_lib/http'
import { ConversationRepository } from '../../_lib/repositories/conversations'
import { MessageRepository } from '../../_lib/repositories/messages'
import { ConversationService } from '../../_lib/services/conversations'
import type { LunaPagesFunction } from '../../_lib/types'
export const onRequestGet: LunaPagesFunction = async ({ env, params }) => { const service = new ConversationService(new ConversationRepository(env.DB), new MessageRepository(env.DB)); const detail = await service.detail(String(params.id)); return detail ? json(detail) : apiError(404, 'NOT_FOUND', '对话不存在') }
export const onRequestDelete: LunaPagesFunction = async ({ env, params }) => (await new ConversationRepository(env.DB).delete(String(params.id))) ? json({ ok: true }) : apiError(404, 'NOT_FOUND', '对话不存在')
