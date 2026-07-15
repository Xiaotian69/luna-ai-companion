import type { RelationshipState } from './types'
interface RelationshipRow { familiarity: number; current_mood: string; recent_events: string; updated_at: string }
export class RelationshipRepository {
  constructor(private readonly db: D1Database) {}
  async get(): Promise<RelationshipState> { const row = await this.db.prepare('SELECT familiarity, current_mood, recent_events, updated_at FROM relationship_state WHERE id = 1').first<RelationshipRow>(); return { familiarity: row?.familiarity ?? 0, currentMood: row?.current_mood ?? '平静', recentEvents: JSON.parse(row?.recent_events ?? '[]') as string[], updatedAt: row?.updated_at ?? new Date(0).toISOString() } }
  async update(value: RelationshipState): Promise<void> { await this.db.prepare('UPDATE relationship_state SET familiarity = ?, current_mood = ?, recent_events = ?, updated_at = ? WHERE id = 1').bind(value.familiarity, value.currentMood, JSON.stringify(value.recentEvents), value.updatedAt).run() }
}
