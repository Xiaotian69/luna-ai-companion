interface SessionRow { id_hash: string; created_at: string; expires_at: string }
export class SessionRepository {
  constructor(private readonly db: D1Database) {}
  async create(input: { idHash: string; expiresAt: string; now: string }): Promise<void> { await this.db.prepare('INSERT INTO sessions (id_hash, created_at, expires_at) VALUES (?, ?, ?)').bind(input.idHash, input.now, input.expiresAt).run() }
  async findValid(idHash: string, now: string): Promise<SessionRow | null> { return this.db.prepare('SELECT * FROM sessions WHERE id_hash = ? AND expires_at > ?').bind(idHash, now).first<SessionRow>() }
  async delete(idHash: string): Promise<void> { await this.db.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(idHash).run() }
}
