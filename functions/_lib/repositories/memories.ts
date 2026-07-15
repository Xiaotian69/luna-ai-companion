import type { Memory } from './types'

interface MemoryRow { id: string; memory_type: string; content: string; importance: number; source_conversation_id: string | null; source_message_id: string | null; created_at: string; updated_at: string; is_active: number }
const map = (row: MemoryRow): Memory => ({ id: row.id, memoryType: row.memory_type, content: row.content, importance: row.importance, sourceConversationId: row.source_conversation_id, sourceMessageId: row.source_message_id, createdAt: row.created_at, updatedAt: row.updated_at, isActive: row.is_active === 1 })

export class MemoryRepository {
  constructor(private readonly db: D1Database) {}
  async create(input: { id: string; memoryType: string; content: string; importance: number; sourceConversationId: string | null; sourceMessageId: string | null; now: string }): Promise<void> { await this.db.prepare('INSERT INTO memories (id, memory_type, content, importance, source_conversation_id, source_message_id, created_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)').bind(input.id, input.memoryType, input.content, input.importance, input.sourceConversationId, input.sourceMessageId, input.now, input.now).run() }
  async list(activeOnly = false): Promise<Memory[]> { const sql = activeOnly ? 'SELECT * FROM memories WHERE is_active = 1 ORDER BY importance DESC, updated_at DESC' : 'SELECT * FROM memories ORDER BY importance DESC, updated_at DESC'; return (await this.db.prepare(sql).all<MemoryRow>()).results.map(map) }
  async update(id: string, input: { content: string; importance: number; isActive: boolean; now: string }): Promise<boolean> { const result = await this.db.prepare('UPDATE memories SET content = ?, importance = ?, is_active = ?, updated_at = ? WHERE id = ?').bind(input.content, input.importance, input.isActive ? 1 : 0, input.now, id).run(); return (result.meta.changes ?? 0) > 0 }
  async delete(id: string): Promise<boolean> { const result = await this.db.prepare('DELETE FROM memories WHERE id = ?').bind(id).run(); return (result.meta.changes ?? 0) > 0 }
  async clear(): Promise<void> { await this.db.prepare('DELETE FROM memories').run() }
}
