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
  for (const file of ['0001_initial.sql', '0002_companion_profile.sql', '0003_memory_metadata.sql', '0004_memory_dedupe.sql']) {
    if (file === '0003_memory_metadata.sql') {
      await db.prepare("INSERT INTO memories (id, memory_type, content, importance, source_conversation_id, source_message_id, created_at, updated_at, is_active) VALUES ('legacy-memory', 'preference', '迁移前的记忆', 0.7, NULL, NULL, '2026-07-15T10:30:00Z', '2026-07-15T10:30:00Z', 1)").run()
    }
    const migration = await readFile(join(process.cwd(), 'migrations', file), 'utf8')
    for (const statement of migration.split(';').map((part) => part.trim()).filter(Boolean)) {
      await db.prepare(statement).run()
    }
  }
})

afterAll(() => mf.dispose())

describe('D1 repositories', () => {
  it('preserves pre-migration memories with safe metadata defaults', async () => {
    const memories = new MemoryRepository(db)
    expect(await memories.get('legacy-memory')).toMatchObject({
      category: 'about_user',
      sensitivity: 'normal',
      confidence: 0.5,
      accessCount: 0,
      lastAccessedAt: null,
      supersededMemoryId: null,
      normalizedContent: null,
    })
    await memories.reinforce('legacy-memory', { confidence: 0.7, importance: 0.7, normalizedContent: '迁移前的记忆', now: '2026-07-15T10:31:00Z' })
    expect(await memories.get('legacy-memory')).toMatchObject({ normalizedContent: '迁移前的记忆' })
    await memories.delete('legacy-memory')
  })

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

  it('persists memory metadata and uses safe defaults for existing callers', async () => {
    const memories = new MemoryRepository(db)
    await memories.create({ id: 'metadata-defaults', memoryType: 'preference', content: '用户喜欢散步', importance: 0.6, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:05:00Z' })
    await memories.create({
      id: 'metadata-explicit',
      memoryType: 'commitment',
      content: '一起完成年度计划',
      importance: 0.9,
      category: 'commitment',
      sensitivity: 'personal',
      confidence: 0.85,
      accessCount: 3,
      lastAccessedAt: '2026-07-15T11:06:00Z',
      supersededMemoryId: null,
      sourceConversationId: null,
      sourceMessageId: null,
      now: '2026-07-15T11:06:00Z',
    })

    expect(await memories.list()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'metadata-defaults', category: 'about_user', sensitivity: 'normal', confidence: 0.5, accessCount: 0, lastAccessedAt: null, supersededMemoryId: null }),
      expect.objectContaining({ id: 'metadata-explicit', category: 'commitment', sensitivity: 'personal', confidence: 0.85, accessCount: 3, lastAccessedAt: '2026-07-15T11:06:00Z' }),
    ]))
  })

  it('rejects a fractional access count at the database boundary', async () => {
    const memories = new MemoryRepository(db)
    await expect(memories.create({ id: 'fractional-access', memoryType: 'preference', content: '无效访问次数', importance: 0.6, accessCount: 1.5, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:06:30Z' })).rejects.toThrow()
  })

  it('reinforces duplicates with bounded nondecreasing confidence and stronger importance', async () => {
    const memories = new MemoryRepository(db)
    await memories.create({ id: 'reinforced', memoryType: 'preference', content: '用户喜欢爵士乐', importance: 0.6, confidence: 0.5, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:07:00Z' })
    await memories.reinforce('reinforced', { confidence: 0.8, importance: 0.4, now: '2026-07-15T11:08:00Z' })
    await memories.reinforce('reinforced', { confidence: 1, importance: 0.9, now: '2026-07-15T11:09:00Z' })

    const reinforced = (await memories.list()).find((item) => item.id === 'reinforced')
    expect(reinforced).toMatchObject({ confidence: 1, importance: 0.9 })
  })

  it.each([
    { confidence: -0.1, importance: 0.5 },
    { confidence: 1.1, importance: 0.5 },
    { confidence: 0.5, importance: -0.1 },
    { confidence: 0.5, importance: 1.1 },
    { confidence: Number.NaN, importance: 0.5 },
  ])('rejects invalid reinforcement scores at runtime: %o', async ({ confidence, importance }) => {
    const memories = new MemoryRepository(db)
    const id = `invalid-reinforce-${String(confidence)}-${String(importance)}`
    await memories.create({ id, memoryType: 'preference', content: id, importance: 0.5, confidence: 0.5, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:09:10Z' })
    await expect(memories.reinforce(id, { confidence, importance, now: '2026-07-15T11:09:11Z' })).rejects.toBeInstanceOf(RangeError)
    expect(await memories.get(id)).toMatchObject({ confidence: 0.5, importance: 0.5 })
  })

  it('rejects invalid scores before atomic insert-or-reinforce', async () => {
    const memories = new MemoryRepository(db)
    await expect(memories.insertOrReinforce({ id: 'invalid-upsert', memoryType: 'preference', content: '无效分数', importance: 0.5, confidence: -1, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:09:20Z' }, '无效分数')).rejects.toBeInstanceOf(RangeError)
  })

  it('atomically inserts or reinforces concurrent normalized duplicates', async () => {
    const memories = new MemoryRepository(db)
    const input = (id: string, confidence: number, importance: number) => ({ id, memoryType: 'preference', content: '用户喜欢电影配乐', importance, confidence, category: 'about_user' as const, sensitivity: 'normal' as const, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:09:30Z' })

    await Promise.all([
      memories.insertOrReinforce(input('dedupe-a', 0.5, 0.6), '用户喜欢电影配乐'),
      memories.insertOrReinforce(input('dedupe-b', 0.8, 0.9), '用户喜欢电影配乐'),
    ])

    const duplicates = (await memories.list(true)).filter((item) => item.normalizedContent === '用户喜欢电影配乐')
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0]).toMatchObject({ confidence: 0.9, importance: 0.9 })
  })

  it('bounds active conflict candidates to the requested category and memory type', async () => {
    const memories = new MemoryRepository(db)
    await Promise.all(Array.from({ length: 13 }, (_, index) => memories.create({ id: `bounded-${index}`, memoryType: 'preference', content: `候选 ${index}`, importance: 0.5, category: 'about_user', sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:09:45Z' })))
    await memories.create({ id: 'bounded-unrelated', memoryType: 'preference', content: '无关关系记忆', importance: 1, category: 'relationship', sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:09:46Z' })

    const candidates = await memories.listCandidates('about_user', 'preference', 12)
    expect(candidates).toHaveLength(12)
    expect(candidates.every((item) => item.category === 'about_user' && item.memoryType === 'preference' && item.isActive)).toBe(true)
  })

  it('clears derived normalization when a memory is manually edited', async () => {
    const memories = new MemoryRepository(db)
    await memories.insertOrReinforce({ id: 'manual-edit', memoryType: 'preference', content: '用户喜欢红色', importance: 0.7, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:09:50Z' }, '用户喜欢红色')
    await memories.update('manual-edit', { content: '用户喜欢蓝色', importance: 0.7, isActive: true, now: '2026-07-15T11:09:51Z' })
    expect(await memories.get('manual-edit')).toMatchObject({ content: '用户喜欢蓝色', normalizedContent: null })
  })

  it('atomically replaces a conflict and keeps only the new fact active with a trace', async () => {
    const memories = new MemoryRepository(db)
    await memories.create({ id: 'old-theme', memoryType: 'preference', content: '用户喜欢浅色主题', importance: 0.7, category: 'about_user', sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:10:00Z' })
    const old = (await memories.list()).find((item) => item.id === 'old-theme')!
    await memories.replace(old, { id: 'new-theme', memoryType: 'preference', content: '用户喜欢深色主题', importance: 0.8, category: 'about_user', sensitivity: 'normal', confidence: 0.9, supersededMemoryId: old.id, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:11:00Z' })

    const themes = (await memories.list()).filter((item) => item.id === 'old-theme' || item.id === 'new-theme')
    expect(themes.filter((item) => item.isActive)).toEqual([expect.objectContaining({ id: 'new-theme', supersededMemoryId: 'old-theme' })])
    expect(themes.find((item) => item.id === 'old-theme')).toMatchObject({ isActive: false })
  })

  it('allows only one active replacement when conflict updates race', async () => {
    const memories = new MemoryRepository(db)
    await memories.create({ id: 'old-layout', memoryType: 'preference', content: '用户喜欢紧凑布局', importance: 0.7, category: 'about_user', sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:12:00Z' })
    const old = (await memories.get('old-layout'))!
    const replacement = (id: string, content: string) => memories.replace(old, { id, memoryType: 'preference', content, importance: 0.8, category: 'about_user', sensitivity: 'normal', confidence: 0.9, supersededMemoryId: old.id, sourceConversationId: null, sourceMessageId: null, now: '2026-07-15T11:13:00Z' })

    await Promise.all([replacement('new-layout-a', '用户喜欢宽松布局'), replacement('new-layout-b', '用户喜欢舒展布局')])

    const replacements = (await memories.list()).filter((item) => item.supersededMemoryId === old.id)
    expect(replacements.filter((item) => item.isActive)).toHaveLength(1)
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
