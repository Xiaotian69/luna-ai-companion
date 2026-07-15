import { createConversationSchema } from '../../../shared/chat'
import { apiError, json, readJson } from '../../_lib/http'
import { ConversationRepository } from '../../_lib/repositories/conversations'
import { MessageRepository } from '../../_lib/repositories/messages'
import { ConversationService } from '../../_lib/services/conversations'
import type { LunaPagesFunction } from '../../_lib/types'
export const onRequestGet: LunaPagesFunction = async ({ env }) => json({ conversations: await new ConversationRepository(env.DB).list() })
export const onRequestPost: LunaPagesFunction = async ({ request, env }) => { try { const input = createConversationSchema.parse(await readJson(request)); const service = new ConversationService(new ConversationRepository(env.DB), new MessageRepository(env.DB)); return json({ conversation: await service.create(input.title) }, { status: 201 }) } catch { return apiError(400, 'INVALID_REQUEST', '对话信息无效') } }
