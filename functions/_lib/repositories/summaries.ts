import type { ConversationSummary } from './types'

interface SummaryRow { id: string; conversation_id: string; summary: string; covered_until_message_id: string; created_at: string; updated_at: string }
const map = (row: SummaryRow): ConversationSummary => ({ id: row.id, conversationId: row.conversation_id, summary: row.summary, coveredUntilMessageId: row.covered_until_message_id, createdAt: row.created_at, updatedAt: row.updated_at })

export class SummaryRepository {
  constructor(private readonly db: D1Database) {}
  async get(conversationId: string): Promise<ConversationSummary | null> { const row = await this.db.prepare('SELECT * FROM conversation_summaries WHERE conversation_id = ?').bind(conversationId).first<SummaryRow>(); return row ? map(row) : null }
  async upsert(input: { id: string; conversationId: string; summary: string; coveredUntilMessageId: string; now: string }): Promise<void> {
    await this.db.prepare(`INSERT INTO conversation_summaries (id, conversation_id, summary, covered_until_message_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(conversation_id) DO UPDATE SET summary = excluded.summary, covered_until_message_id = excluded.covered_until_message_id, updated_at = excluded.updated_at`).bind(input.id, input.conversationId, input.summary, input.coveredUntilMessageId, input.now, input.now).run()
  }
}
