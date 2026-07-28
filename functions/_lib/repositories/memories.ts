import type { MemoryCategory, MemorySensitivity } from '../../../shared/memory'
import type { Memory } from './types'

interface MemoryRow { id: string; memory_type: string; content: string; importance: number; category: MemoryCategory; sensitivity: MemorySensitivity; confidence: number; access_count: number; last_accessed_at: string | null; superseded_memory_id: string | null; source_conversation_id: string | null; source_message_id: string | null; created_at: string; updated_at: string; is_active: number }
const map = (row: MemoryRow): Memory => ({ id: row.id, memoryType: row.memory_type, content: row.content, importance: row.importance, category: row.category, sensitivity: row.sensitivity, confidence: row.confidence, accessCount: row.access_count, lastAccessedAt: row.last_accessed_at, supersededMemoryId: row.superseded_memory_id, sourceConversationId: row.source_conversation_id, sourceMessageId: row.source_message_id, createdAt: row.created_at, updatedAt: row.updated_at, isActive: row.is_active === 1 })

export interface MemoryCreateInput {
  id: string
  memoryType: string
  content: string
  importance: number
  category?: MemoryCategory
  sensitivity?: MemorySensitivity
  confidence?: number
  accessCount?: number
  lastAccessedAt?: string | null
  supersededMemoryId?: string | null
  sourceConversationId: string | null
  sourceMessageId: string | null
  now: string
}

function withDefaults(input: MemoryCreateInput) {
  return {
    ...input,
    category: input.category ?? 'about_user',
    sensitivity: input.sensitivity ?? 'normal',
    confidence: input.confidence ?? 0.5,
    accessCount: input.accessCount ?? 0,
    lastAccessedAt: input.lastAccessedAt ?? null,
    supersededMemoryId: input.supersededMemoryId ?? null,
  }
}

export class MemoryRepository {
  constructor(private readonly db: D1Database) {}
  private insert(input: MemoryCreateInput, requirePreviousChange = false): D1PreparedStatement {
    const value = withDefaults(input)
    const values = requirePreviousChange ? 'SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1 WHERE changes() > 0' : 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
    return this.db.prepare(`INSERT INTO memories (id, memory_type, content, importance, category, sensitivity, confidence, access_count, last_accessed_at, superseded_memory_id, source_conversation_id, source_message_id, created_at, updated_at, is_active) ${values}`).bind(value.id, value.memoryType, value.content, value.importance, value.category, value.sensitivity, value.confidence, value.accessCount, value.lastAccessedAt, value.supersededMemoryId, value.sourceConversationId, value.sourceMessageId, value.now, value.now)
  }
  async create(input: MemoryCreateInput): Promise<void> { await this.insert(input).run() }
  async list(activeOnly = false): Promise<Memory[]> { const sql = activeOnly ? 'SELECT * FROM memories WHERE is_active = 1 ORDER BY importance DESC, updated_at DESC' : 'SELECT * FROM memories ORDER BY importance DESC, updated_at DESC'; return (await this.db.prepare(sql).all<MemoryRow>()).results.map(map) }
  async get(id: string): Promise<Memory | null> { const row = await this.db.prepare('SELECT * FROM memories WHERE id = ?').bind(id).first<MemoryRow>(); return row ? map(row) : null }
  async reinforce(id: string, input: { confidence: number; importance: number; now: string }): Promise<boolean> { const result = await this.db.prepare('UPDATE memories SET confidence = MIN(1, 1 - ((1 - confidence) * (1 - ?))), importance = MAX(importance, ?), updated_at = ? WHERE id = ? AND is_active = 1').bind(input.confidence, input.importance, input.now, id).run(); return (result.meta.changes ?? 0) > 0 }
  async replace(old: Memory, input: MemoryCreateInput): Promise<boolean> {
    const current = await this.get(old.id)
    const category = input.category ?? 'about_user'
    if (!current?.isActive || current.category !== category || current.memoryType !== input.memoryType || input.supersededMemoryId !== current.id) return false
    const results = await this.db.batch([
      this.db.prepare('UPDATE memories SET is_active = 0, updated_at = ? WHERE id = ? AND is_active = 1 AND category = ? AND memory_type = ?').bind(input.now, current.id, category, input.memoryType),
      this.insert({ ...input, supersededMemoryId: current.id }, true),
    ])
    return (results[0].meta.changes ?? 0) > 0 && (results[1].meta.changes ?? 0) > 0
  }
  async update(id: string, input: { content: string; importance: number; isActive: boolean; now: string }): Promise<boolean> { const result = await this.db.prepare('UPDATE memories SET content = ?, importance = ?, is_active = ?, updated_at = ? WHERE id = ?').bind(input.content, input.importance, input.isActive ? 1 : 0, input.now, id).run(); return (result.meta.changes ?? 0) > 0 }
  async delete(id: string): Promise<boolean> { const result = await this.db.prepare('DELETE FROM memories WHERE id = ?').bind(id).run(); return (result.meta.changes ?? 0) > 0 }
  async clear(): Promise<void> { await this.db.prepare('DELETE FROM memories').run() }
}
