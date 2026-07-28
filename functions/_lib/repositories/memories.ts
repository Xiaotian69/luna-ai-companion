import { canonicalizeMemoryContent, inferRelevantMemoryCategories, type MemoryCategory, type MemorySensitivity } from '../../../shared/memory'
import type { Memory } from './types'

interface MemoryRow { id: string; memory_type: string; content: string; importance: number; category: MemoryCategory; sensitivity: MemorySensitivity; confidence: number; access_count: number; last_accessed_at: string | null; superseded_memory_id: string | null; normalized_content: string | null; source_conversation_id: string | null; source_message_id: string | null; created_at: string; updated_at: string; is_active: number }
const map = (row: MemoryRow): Memory => ({ id: row.id, memoryType: row.memory_type, content: row.content, importance: row.importance, category: row.category, sensitivity: row.sensitivity, confidence: row.confidence, accessCount: row.access_count, lastAccessedAt: row.last_accessed_at, supersededMemoryId: row.superseded_memory_id, normalizedContent: row.normalized_content, sourceConversationId: row.source_conversation_id, sourceMessageId: row.source_message_id, createdAt: row.created_at, updatedAt: row.updated_at, isActive: row.is_active === 1 })

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

export interface MemoryRestoreInput {
  id: string
  memoryType: string
  content: string
  importance: number
  category: MemoryCategory
  sensitivity: MemorySensitivity
  confidence: number
  accessCount: number
  lastAccessedAt: string | null
  sourceConversationId: null
  sourceMessageId: null
  createdAt: string
  updatedAt: string
  isActive: boolean
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
    normalizedContent: canonicalizeMemoryContent(input.content),
  }
}

function validateScore(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be between 0 and 1`)
}

export class MemoryRepository {
  constructor(private readonly db: D1Database) {}
  async prepareNormalizedInvariant(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const legacy = (await this.db.prepare('SELECT * FROM memories WHERE is_active = 1 AND normalized_content IS NULL ORDER BY created_at ASC, id ASC').all<MemoryRow>()).results.map(map)
      if (!legacy.length) return
      const keys = [...new Set(legacy.map((memory) => canonicalizeMemoryContent(memory.content)))]
      const normalized = (await this.db.prepare('SELECT * FROM memories WHERE is_active = 1 AND normalized_content IN (SELECT value FROM json_each(?)) ORDER BY created_at ASC, id ASC').bind(JSON.stringify(keys)).all<MemoryRow>()).results.map(map)
      const groups = new Map<string, Memory[]>()
      for (const memory of [...legacy, ...normalized]) {
        const key = memory.normalizedContent ?? canonicalizeMemoryContent(memory.content)
        groups.set(key, [...(groups.get(key) ?? []), memory])
      }
      let contended = false
      for (const [key, group] of groups) {
        const ranked = [...group].sort((left, right) => Number(right.normalizedContent === key) - Number(left.normalizedContent === key) || right.importance - left.importance || right.confidence - left.confidence || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
        const [winner, ...losers] = ranked
        let mergedConfidence = winner.confidence
        let mergedImportance = winner.importance
        for (const memory of losers) {
          mergedConfidence = Math.max(mergedConfidence, Math.min(1, 1 - ((1 - mergedConfidence) * (1 - memory.confidence))))
          mergedImportance = Math.max(mergedImportance, memory.importance)
        }
        const snapshot = group.map((memory) => ({ id: memory.id, isActive: 1, updatedAt: memory.updatedAt, content: memory.content, confidence: memory.confidence, importance: memory.importance, normalizedContent: memory.normalizedContent }))
        const result = await this.db.prepare(`WITH snapshot AS (
          SELECT json_extract(value, '$.id') AS id, json_extract(value, '$.isActive') AS is_active, json_extract(value, '$.updatedAt') AS updated_at, json_extract(value, '$.content') AS content, json_extract(value, '$.confidence') AS confidence, json_extract(value, '$.importance') AS importance, json_extract(value, '$.normalizedContent') AS normalized_content
          FROM json_each(?)
        )
        UPDATE memories
        SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END,
            normalized_content = CASE WHEN id = ? THEN ? ELSE NULL END,
            confidence = CASE WHEN id = ? THEN ? ELSE confidence END,
            importance = CASE WHEN id = ? THEN ? ELSE importance END
        WHERE id IN (SELECT id FROM snapshot)
          AND (SELECT COUNT(*) FROM memories current JOIN snapshot expected ON current.id = expected.id WHERE current.is_active = expected.is_active AND current.updated_at = expected.updated_at AND current.content = expected.content AND current.confidence = expected.confidence AND current.importance = expected.importance AND current.normalized_content IS expected.normalized_content) = (SELECT COUNT(*) FROM snapshot)
          AND NOT EXISTS (SELECT 1 FROM memories outsider WHERE outsider.is_active = 1 AND outsider.normalized_content = ? AND outsider.id NOT IN (SELECT id FROM snapshot))`).bind(JSON.stringify(snapshot), winner.id, winner.id, key, winner.id, mergedConfidence, winner.id, mergedImportance, key).run()
        if ((result.meta.changes ?? 0) === 0) contended = true
      }
      if (contended && attempt === 2) throw new Error('Memory normalization repair contended')
    }
    if (await this.db.prepare('SELECT id FROM memories WHERE is_active = 1 AND normalized_content IS NULL LIMIT 1').first()) throw new Error('Memory normalization repair contended')
  }
  private insert(input: MemoryCreateInput, requirePreviousChange = false): D1PreparedStatement {
    const value = withDefaults(input)
    const values = requirePreviousChange ? 'SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1 WHERE changes() > 0' : 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
    return this.db.prepare(`INSERT INTO memories (id, memory_type, content, importance, category, sensitivity, confidence, access_count, last_accessed_at, superseded_memory_id, normalized_content, source_conversation_id, source_message_id, created_at, updated_at, is_active) ${values}`).bind(value.id, value.memoryType, value.content, value.importance, value.category, value.sensitivity, value.confidence, value.accessCount, value.lastAccessedAt, value.supersededMemoryId, value.normalizedContent, value.sourceConversationId, value.sourceMessageId, value.now, value.now)
  }
  async create(input: MemoryCreateInput): Promise<void> { await this.prepareNormalizedInvariant(); await this.insert(input).run() }
  async restore(input: MemoryRestoreInput): Promise<'created' | 'skipped'> {
    validateScore('confidence', input.confidence)
    validateScore('importance', input.importance)
    if (!Number.isInteger(input.accessCount) || input.accessCount < 0) throw new RangeError('accessCount must be a non-negative integer')
    const normalizedContent = canonicalizeMemoryContent(input.content)
    const inactiveLegacy = await this.db.prepare('SELECT content FROM memories WHERE is_active = 0 AND normalized_content IS NULL').all<{ content: string }>()
    if (inactiveLegacy.results.some((memory) => canonicalizeMemoryContent(memory.content) === normalizedContent)) return 'skipped'
    const result = await this.db.prepare(`INSERT INTO memories (
      id, memory_type, content, importance, category, sensitivity, confidence, access_count,
      last_accessed_at, superseded_memory_id, normalized_content, source_conversation_id,
      source_message_id, created_at, updated_at, is_active
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM memories
      WHERE id = ? OR normalized_content = ? OR (normalized_content IS NULL AND content = ?)
    )
    ON CONFLICT DO NOTHING`).bind(
      input.id, input.memoryType, input.content, input.importance, input.category, input.sensitivity,
      input.confidence, input.accessCount, input.lastAccessedAt, normalizedContent,
      input.createdAt, input.updatedAt, input.isActive ? 1 : 0,
      input.id, normalizedContent, input.content,
    ).run()
    return (result.meta.changes ?? 0) > 0 ? 'created' : 'skipped'
  }
  async list(activeOnly = false): Promise<Memory[]> { const sql = activeOnly ? 'SELECT * FROM memories WHERE is_active = 1 ORDER BY importance DESC, updated_at DESC' : 'SELECT * FROM memories ORDER BY importance DESC, updated_at DESC'; return (await this.db.prepare(sql).all<MemoryRow>()).results.map(map) }
  async listForRetrieval(query: string, requestedLimit = 100): Promise<Memory[]> {
    const limit = Math.max(1, Math.min(100, Math.floor(requestedLimit)))
    const terms = [...new Set(query.normalize('NFKC').toLowerCase().match(/[a-z0-9]+|[\p{Script=Han}]/gu) ?? [])].slice(0, 32)
    const categories = inferRelevantMemoryCategories(query)
    const [keyword, category, pending] = await Promise.all([
      this.db.prepare("SELECT * FROM memories WHERE is_active = 1 ORDER BY (SELECT COUNT(*) FROM json_each(?) terms WHERE instr(lower(memories.content), lower(CAST(terms.value AS TEXT))) > 0) DESC, importance DESC, updated_at DESC, access_count DESC, id ASC LIMIT ?").bind(JSON.stringify(terms), limit).all<MemoryRow>(),
      this.db.prepare("SELECT * FROM memories WHERE is_active = 1 AND category IN (SELECT CAST(value AS TEXT) FROM json_each(?)) ORDER BY importance DESC, updated_at DESC, access_count DESC, id ASC LIMIT ?").bind(JSON.stringify(categories), limit).all<MemoryRow>(),
      this.db.prepare("SELECT * FROM memories WHERE is_active = 1 AND (category = 'commitment' OR lower(memory_type) LIKE '%pending%' OR lower(memory_type) LIKE '%todo%' OR lower(memory_type) LIKE '%commitment%' OR lower(memory_type) LIKE '%reminder%') AND lower(content) NOT LIKE '%done%' AND lower(content) NOT LIKE '%completed%' AND lower(content) NOT LIKE '%resolved%' AND lower(content) NOT LIKE '%cancelled%' AND content NOT LIKE '%已完成%' AND content NOT LIKE '%完成了%' AND content NOT LIKE '%已解决%' AND content NOT LIKE '%已取消%' ORDER BY importance DESC, updated_at DESC, access_count DESC, id ASC LIMIT ?").bind(limit).all<MemoryRow>(),
    ])
    const unique = new Map<string, Memory>()
    for (const memory of [...keyword.results, ...category.results, ...pending.results].map(map)) unique.set(memory.id, memory)
    return [...unique.values()].slice(0, limit * 3)
  }
  async listCandidates(category: MemoryCategory, memoryType: string, requestedLimit = 100): Promise<Memory[]> { const limit = Math.max(1, Math.min(100, Math.floor(requestedLimit))); return (await this.db.prepare('SELECT * FROM memories WHERE is_active = 1 AND category = ? AND memory_type = ? ORDER BY importance DESC, updated_at DESC LIMIT ?').bind(category, memoryType, limit).all<MemoryRow>()).results.map(map) }
  async markAccessed(ids: string[], now: string): Promise<void> { const selected = [...new Set(ids)].slice(0, 100); if (!selected.length) return; await this.db.prepare('UPDATE memories SET access_count = access_count + 1, last_accessed_at = ? WHERE is_active = 1 AND id IN (SELECT value FROM json_each(?))').bind(now, JSON.stringify(selected)).run() }
  async get(id: string): Promise<Memory | null> { const row = await this.db.prepare('SELECT * FROM memories WHERE id = ?').bind(id).first<MemoryRow>(); return row ? map(row) : null }
  async reinforce(id: string, input: { confidence: number; importance: number; normalizedContent?: string; now: string }): Promise<boolean> {
    validateScore('confidence', input.confidence)
    validateScore('importance', input.importance)
    await this.prepareNormalizedInvariant()
    const result = await this.db.prepare('UPDATE memories SET confidence = MAX(confidence, MIN(1, 1 - ((1 - confidence) * (1 - ?)))), importance = MAX(importance, ?), normalized_content = COALESCE(normalized_content, ?), updated_at = ? WHERE id = ? AND is_active = 1').bind(input.confidence, input.importance, input.normalizedContent ?? null, input.now, id).run()
    return (result.meta.changes ?? 0) > 0
  }
  async insertOrReinforce(input: MemoryCreateInput): Promise<void> {
    validateScore('confidence', input.confidence ?? 0.5)
    validateScore('importance', input.importance)
    await this.prepareNormalizedInvariant()
    const value = withDefaults(input)
    await this.db.prepare('INSERT INTO memories (id, memory_type, content, importance, category, sensitivity, confidence, access_count, last_accessed_at, superseded_memory_id, normalized_content, source_conversation_id, source_message_id, created_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(normalized_content) WHERE is_active = 1 AND normalized_content IS NOT NULL DO UPDATE SET confidence = MAX(memories.confidence, MIN(1, 1 - ((1 - memories.confidence) * (1 - excluded.confidence)))), importance = MAX(memories.importance, excluded.importance), updated_at = excluded.updated_at').bind(value.id, value.memoryType, value.content, value.importance, value.category, value.sensitivity, value.confidence, value.accessCount, value.lastAccessedAt, value.supersededMemoryId, value.normalizedContent, value.sourceConversationId, value.sourceMessageId, value.now, value.now).run()
  }
  async replace(old: Memory, input: MemoryCreateInput): Promise<boolean> {
    await this.prepareNormalizedInvariant()
    const current = await this.get(old.id)
    const category = input.category ?? 'about_user'
    if (!current?.isActive || current.category !== category || current.memoryType !== input.memoryType || input.supersededMemoryId !== current.id) return false
    const results = await this.db.batch([
      this.db.prepare('UPDATE memories SET is_active = 0, updated_at = ? WHERE id = ? AND is_active = 1 AND category = ? AND memory_type = ?').bind(input.now, current.id, category, input.memoryType),
      this.insert({ ...input, supersededMemoryId: current.id }, true),
    ])
    return (results[0].meta.changes ?? 0) > 0 && (results[1].meta.changes ?? 0) > 0
  }
  async update(id: string, input: { content: string; importance: number; isActive: boolean; now: string }): Promise<boolean> { await this.prepareNormalizedInvariant(); const normalizedContent = input.isActive ? canonicalizeMemoryContent(input.content) : null; const result = await this.db.prepare('UPDATE memories SET content = ?, importance = ?, normalized_content = ?, is_active = ?, updated_at = ? WHERE id = ?').bind(input.content, input.importance, normalizedContent, input.isActive ? 1 : 0, input.now, id).run(); return (result.meta.changes ?? 0) > 0 }
  async delete(id: string): Promise<boolean> { const result = await this.db.prepare('DELETE FROM memories WHERE id = ?').bind(id).run(); return (result.meta.changes ?? 0) > 0 }
  async clear(): Promise<void> { await this.db.prepare('DELETE FROM memories').run() }
}
