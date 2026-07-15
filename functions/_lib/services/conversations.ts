import { ConversationRepository } from '../repositories/conversations'
import { MessageRepository } from '../repositories/messages'

export class ConversationService {
  constructor(private readonly conversations: ConversationRepository, private readonly messages: MessageRepository, private readonly now = () => new Date()) {}
  async create(title = '新对话') { return this.conversations.create({ id: crypto.randomUUID(), title: title.trim().slice(0, 80) || '新对话', now: this.now().toISOString() }) }
  async ensure(id: string | undefined, firstMessage: string) { const existing = id ? await this.conversations.get(id) : null; return existing ?? this.create(firstMessage.replace(/\s+/g, ' ').slice(0, 32)) }
  async detail(id: string) { const conversation = await this.conversations.get(id); if (!conversation) return null; return { conversation, messages: await this.messages.list(id) } }
  async deleteMessage(conversationId: string, messageId: string) { const deleted = await this.messages.delete(messageId, conversationId); if (deleted) await this.conversations.touch(conversationId, this.now().toISOString()); return deleted }
}
