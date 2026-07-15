import { apiError, json } from '../../../../_lib/http'
import { ConversationRepository } from '../../../../_lib/repositories/conversations'
import { MessageRepository } from '../../../../_lib/repositories/messages'
import { ConversationService } from '../../../../_lib/services/conversations'
import type { LunaPagesFunction } from '../../../../_lib/types'
export const onRequestDelete: LunaPagesFunction = async ({ env, params }) => { const service = new ConversationService(new ConversationRepository(env.DB), new MessageRepository(env.DB)); return (await service.deleteMessage(String(params.id), String(params.messageId))) ? json({ ok: true }) : apiError(404, 'NOT_FOUND', '消息不存在') }
