import type { Message, MessageRole } from './types'

interface MessageRow { id: string; conversation_id: string; role: MessageRole; content: string; created_at: string; token_estimate: number; status: 'complete' | 'interrupted' }
const map = (row: MessageRow): Message => ({ id: row.id, conversationId: row.conversation_id, role: row.role, content: row.content, createdAt: row.created_at, tokenEstimate: row.token_estimate, status: row.status })

export class MessageRepository {
  constructor(private readonly db: D1Database) {}
  async create(input: { id: string; conversationId: string; role: MessageRole; content: string; tokenEstimate: number; now: string; status?: 'complete' | 'interrupted' }): Promise<Message> {
    const status = input.status ?? 'complete'
    await this.db.prepare('INSERT INTO messages (id, conversation_id, role, content, created_at, token_estimate, status) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(input.id, input.conversationId, input.role, input.content, input.now, input.tokenEstimate, status).run()
    return { id: input.id, conversationId: input.conversationId, role: input.role, content: input.content, createdAt: input.now, tokenEstimate: input.tokenEstimate, status }
  }
  async list(conversationId: string): Promise<Message[]> { return (await this.db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, id').bind(conversationId).all<MessageRow>()).results.map(map) }
  async recent(conversationId: string, limit: number): Promise<Message[]> { const result = (await this.db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT ?').bind(conversationId, limit).all<MessageRow>()).results.map(map); return result.reverse() }
  async delete(id: string, conversationId: string): Promise<boolean> { const result = await this.db.prepare('DELETE FROM messages WHERE id = ? AND conversation_id = ?').bind(id, conversationId).run(); return (result.meta.changes ?? 0) > 0 }
}
