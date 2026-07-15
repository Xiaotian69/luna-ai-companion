import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ConversationRepository } from '../functions/_lib/repositories/conversations'
import { MemoryRepository } from '../functions/_lib/repositories/memories'
import { MessageRepository } from '../functions/_lib/repositories/messages'
import { SessionRepository } from '../functions/_lib/repositories/sessions'
import { SummaryRepository } from '../functions/_lib/repositories/summaries'
import { UsageRepository } from '../functions/_lib/repositories/usage'

let mf: Miniflare
let db: D1Database

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: 'export default { fetch(){ return new Response("ok") } }', d1Databases: { DB: 'luna-test' } })
  db = await mf.getD1Database('DB')
  const migration = await readFile(join(process.cwd(), 'migrations/0001_initial.sql'), 'utf8')
  for (const statement of migration.split(';').map((part) => part.trim()).filter(Boolean)) {
    await db.prepare(statement).run()
  }
})

afterAll(() => mf.dispose())

describe('D1 repositories', () => {
  it('persists ordered messages and cascades conversation deletion', async () => {
    const conversations = new ConversationRepository(db)
    const messages = new MessageRepository(db)
    await conversations.create({ id: 'c1', title: '晚上好', now: '2026-07-15T10:00:00Z' })
    await messages.create({ id: 'm2', conversationId: 'c1', role: 'assistant', content: '你好', tokenEstimate: 2, now: '2026-07-15T10:00:02Z' })
    await messages.create({ id: 'm1', conversationId: 'c1', role: 'user', content: '晚上好', tokenEstimate: 3, now: '2026-07-15T10:00:01Z' })
    expect((await messages.list('c1')).map((message) => message.id)).toEqual(['m1', 'm2'])
    await conversations.delete('c1')
    expect(await messages.list('c1')).toEqual([])
  })

  it('upserts summary coverage and manages memory activation', async () => {
    const conversations = new ConversationRepository(db)
    const summaries = new SummaryRepository(db)
    const memories = new MemoryRepository(db)
    await conversations.create({ id: 'c2', title: '计划', now: '2026-07-15T11:00:00Z' })
    await summaries.upsert({ id: 's1', conversationId: 'c2', summary: '旧摘要', coveredUntilMessageId: 'm10', now: '2026-07-15T11:01:00Z' })
    await summaries.upsert({ id: 's2', conversationId: 'c2', summary: '新摘要', coveredUntilMessageId: 'm20', now: '2026-07-15T11:02:00Z' })
    expect((await summaries.get('c2'))?.coveredUntilMessageId).toBe('m20')
    await memories.create({ id: 'mem1', memoryType: 'preference', content: '用户喜欢安静的界面', importance: 0.8, sourceConversationId: 'c2', sourceMessageId: null, now: '2026-07-15T11:03:00Z' })
    await memories.update('mem1', { content: '用户喜欢简洁安静的界面', importance: 0.9, isActive: false, now: '2026-07-15T11:04:00Z' })
    expect(await memories.list()).toMatchObject([{ content: '用户喜欢简洁安静的界面', isActive: false }])
    await memories.clear()
    expect(await memories.list()).toEqual([])
  })

  it('expires sessions and increments daily usage', async () => {
    const sessions = new SessionRepository(db)
    const usage = new UsageRepository(db)
    await sessions.create({ idHash: 'hash', expiresAt: '2026-07-16T00:00:00Z', now: '2026-07-15T12:00:00Z' })
    expect(await sessions.findValid('hash', '2026-07-15T23:00:00Z')).not.toBeNull()
    expect(await sessions.findValid('hash', '2026-07-17T00:00:00Z')).toBeNull()
    await usage.increment('2026-07-15', { chatCalls: 1, ttsCalls: 0, inputTokens: 12, outputTokens: 5 })
    await usage.increment('2026-07-15', { chatCalls: 0, ttsCalls: 1, inputTokens: 0, outputTokens: 0 })
    expect(await usage.get('2026-07-15')).toMatchObject({ chatCalls: 1, ttsCalls: 1, inputTokens: 12, outputTokens: 5 })
  })
})
