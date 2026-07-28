import { describe, expect, it, vi } from 'vitest'
import { MemoryRepository } from './memories'

const input = {
  id: 'restore-stable-id',
  memoryType: 'preference',
  content: '用户喜欢简洁界面',
  importance: 0.8,
  category: 'about_user' as const,
  sensitivity: 'normal' as const,
  confidence: 0.9,
  accessCount: 2,
  lastAccessedAt: '2026-07-27T08:00:00.000Z',
  sourceConversationId: null,
  sourceMessageId: null,
  createdAt: '2026-07-20T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z',
  isActive: false,
}

function harness(changes: number, legacy: Array<{ content: string }> = []) {
  const statements: Array<{ sql: string; bindings: unknown[]; run: ReturnType<typeof vi.fn> }> = []
  const db = {
    prepare: vi.fn((sql: string) => {
      if (sql === 'SELECT content FROM memories WHERE normalized_content IS NULL') return { all: vi.fn(async () => ({ results: legacy })) }
      const entry = { sql, bindings: [] as unknown[], run: vi.fn() }
      statements.push(entry)
      const statement = {
        bind: vi.fn((...bindings: unknown[]) => { entry.bindings = bindings; return statement }),
        run: entry.run,
      }
      return statement
    }),
    batch: vi.fn(async (batch: unknown[]) => batch.map(() => ({ meta: { changes } }))),
  }
  const repository = new MemoryRepository(db as unknown as D1Database)
  const prepareInvariant = vi.spyOn(repository, 'prepareNormalizedInvariant').mockResolvedValue()
  return { db, repository, prepareInvariant, statements }
}

describe('MemoryRepository restore', () => {
  it.each([
    { changes: 1, expected: 'created' },
    { changes: 0, expected: 'skipped' },
  ])('reports $expected from a batched duplicate-safe insert', async ({ changes, expected }) => {
    const { db, repository, prepareInvariant, statements } = harness(changes)

    await expect(repository.restore(input)).resolves.toBe(expected)

    expect(prepareInvariant).toHaveBeenCalledOnce()
    expect(db.batch).toHaveBeenCalledOnce()
    expect(statements[0].sql).toContain('INSERT INTO memories')
    expect(statements[0].sql).toContain('NOT EXISTS')
    expect(statements[0].sql).toContain('normalized_content')
    expect(statements[0].bindings).not.toContain('private-conversation-id')
    expect(statements[0].run).not.toHaveBeenCalled()
  })

  it.each(['inactive', 'active'])('skips an %s legacy memory with canonically equivalent content', async () => {
    const { db, repository, prepareInvariant, statements } = harness(1, [{ content: ' 用户喜欢简洁界面。 ' }])

    await expect(repository.restore(input)).resolves.toBe('skipped')

    expect(prepareInvariant).toHaveBeenCalledOnce()
    expect(db.prepare).toHaveBeenCalledWith('SELECT content FROM memories WHERE normalized_content IS NULL')
    expect(db.batch).not.toHaveBeenCalled()
    expect(statements).toHaveLength(0)
  })

  it('restores 1000 entries with one invariant, one legacy scan, and at most 20 bounded batches', async () => {
    const { db, repository, prepareInvariant, statements } = harness(1)
    const inputs = Array.from({ length: 1_000 }, (_, index) => ({
      ...input,
      id: `restore-${index}`,
      content: `用户喜欢简洁界面 ${index}`,
    }))

    const results = await repository.restoreMany(inputs)

    expect(results).toHaveLength(1_000)
    expect(results.every((result) => result === 'created')).toBe(true)
    expect(prepareInvariant).toHaveBeenCalledOnce()
    expect(db.prepare.mock.calls.filter(([sql]) => sql === 'SELECT content FROM memories WHERE normalized_content IS NULL')).toHaveLength(1)
    expect(db.batch).toHaveBeenCalledTimes(20)
    expect(db.batch.mock.calls.every(([batch]) => batch.length <= 50)).toBe(true)
    expect(statements).toHaveLength(1_000)
    expect(statements.every((statement) => statement.run.mock.calls.length === 0)).toBe(true)
  })
})
