import { LIMITS } from '../../../config/limits'
import { RateLimitRepository } from '../repositories/rate-limits'
import { UsageRepository } from '../repositories/usage'

export class UsageGuard {
  constructor(private readonly rateLimits: RateLimitRepository, private readonly usage: UsageRepository) {}
  async rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> { const start = Math.floor(Date.now() / (windowSeconds * 1_000)) * windowSeconds; return this.rateLimits.consume(key, start, limit) }
  async allowChat(date: string): Promise<boolean> { const value = await this.usage.get(date); return value.chatCalls < LIMITS.dailyChatRequests && value.inputTokens + value.outputTokens < LIMITS.dailyEstimatedTokens }
  async allowTts(date: string): Promise<boolean> { return (await this.usage.get(date)).ttsCalls < LIMITS.dailyTtsRequests }
}
