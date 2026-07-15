export class RateLimitRepository {
  constructor(private readonly db: D1Database) {}
  async consume(key: string, windowStart: number, limit: number): Promise<boolean> { await this.db.prepare(`INSERT INTO rate_limits (bucket_key, window_start, request_count) VALUES (?, ?, 1) ON CONFLICT(bucket_key, window_start) DO UPDATE SET request_count = request_count + 1`).bind(key, windowStart).run(); const row = await this.db.prepare('SELECT request_count FROM rate_limits WHERE bucket_key = ? AND window_start = ?').bind(key, windowStart).first<{ request_count: number }>(); return (row?.request_count ?? limit + 1) <= limit }
}
