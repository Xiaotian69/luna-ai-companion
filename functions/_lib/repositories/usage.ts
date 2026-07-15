import type { DailyUsage } from './types'

interface UsageRow { usage_date: string; chat_calls: number; tts_calls: number; input_tokens: number; output_tokens: number }
const empty = (date: string): DailyUsage => ({ usageDate: date, chatCalls: 0, ttsCalls: 0, inputTokens: 0, outputTokens: 0 })
const map = (row: UsageRow): DailyUsage => ({ usageDate: row.usage_date, chatCalls: row.chat_calls, ttsCalls: row.tts_calls, inputTokens: row.input_tokens, outputTokens: row.output_tokens })

export class UsageRepository {
  constructor(private readonly db: D1Database) {}
  async get(date: string): Promise<DailyUsage> { const row = await this.db.prepare('SELECT * FROM usage_daily WHERE usage_date = ?').bind(date).first<UsageRow>(); return row ? map(row) : empty(date) }
  async increment(date: string, delta: { chatCalls: number; ttsCalls: number; inputTokens: number; outputTokens: number }): Promise<void> { await this.db.prepare(`INSERT INTO usage_daily (usage_date, chat_calls, tts_calls, input_tokens, output_tokens, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(usage_date) DO UPDATE SET chat_calls = chat_calls + excluded.chat_calls, tts_calls = tts_calls + excluded.tts_calls, input_tokens = input_tokens + excluded.input_tokens, output_tokens = output_tokens + excluded.output_tokens, updated_at = excluded.updated_at`).bind(date, delta.chatCalls, delta.ttsCalls, delta.inputTokens, delta.outputTokens, new Date().toISOString()).run() }
}
