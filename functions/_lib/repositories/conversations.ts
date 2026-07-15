import type { Conversation } from './types'

interface ConversationRow { id: string; title: string; created_at: string; updated_at: string }
const map = (row: ConversationRow): Conversation => ({ id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at })

export class ConversationRepository {
  constructor(private readonly db: D1Database) {}
  async create(input: { id: string; title: string; now: string }): Promise<Conversation> {
    await this.db.prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').bind(input.id, input.title, input.now, input.now).run()
    return { id: input.id, title: input.title, createdAt: input.now, updatedAt: input.now }
  }
  async list(): Promise<Conversation[]> { return (await this.db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all<ConversationRow>()).results.map(map) }
  async get(id: string): Promise<Conversation | null> { const row = await this.db.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first<ConversationRow>(); return row ? map(row) : null }
  async touch(id: string, now: string): Promise<void> { await this.db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').bind(now, id).run() }
  async delete(id: string): Promise<boolean> { const result = await this.db.prepare('DELETE FROM conversations WHERE id = ?').bind(id).run(); return (result.meta.changes ?? 0) > 0 }
}
