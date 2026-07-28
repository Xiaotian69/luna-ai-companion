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

describe('MemoryRepository.restore', () => {
  it.each([
    { changes: 1, expected: 'created' },
    { changes: 0, expected: 'skipped' },
  ])('reports $expected from an atomic duplicate-safe insert', async ({ changes, expected }) => {
    let sql = ''
    const bindings: unknown[] = []
    const run = vi.fn(async () => ({ meta: { changes } }))
    const statement = {
      bind: vi.fn((...values: unknown[]) => { bindings.push(...values); return statement }),
      all: vi.fn(async () => ({ results: [] })),
      run,
    }
    const db = { prepare: vi.fn((value: string) => { sql = value; return statement }) }
    const repository = new MemoryRepository(db as unknown as D1Database)
    const prepareInvariant = vi.spyOn(repository, 'prepareNormalizedInvariant').mockResolvedValue()

    await expect(repository.restore(input)).resolves.toBe(expected)
    expect(prepareInvariant).toHaveBeenCalledOnce()
    expect(sql).toContain('INSERT INTO memories')
    expect(sql).toContain('NOT EXISTS')
    expect(sql).toContain('normalized_content')
    expect(bindings).not.toContain('private-conversation-id')
  })

  it('skips an existing inactive legacy memory with canonically equivalent content', async () => {
    const insert = vi.fn()
    let prepared = 0
    const db = {
      prepare: vi.fn(() => {
        prepared += 1
        if (prepared === 1) return { all: vi.fn(async () => ({ results: [{ content: ' 用户喜欢简洁界面。 ' }] })) }
        return { bind: vi.fn(() => ({ run: insert })) }
      }),
    }
    const repository = new MemoryRepository(db as unknown as D1Database)
    vi.spyOn(repository, 'prepareNormalizedInvariant').mockResolvedValue()

    await expect(repository.restore(input)).resolves.toBe('skipped')
    expect(insert).not.toHaveBeenCalled()
  })

  it('skips an active legacy memory with canonically equivalent content after invariant preparation', async () => {
    const insert = vi.fn()
    let prepared = 0
    const db = {
      prepare: vi.fn(() => {
        prepared += 1
        if (prepared === 1) return { all: vi.fn(async () => ({ results: [{ content: ' 用户喜欢简洁界面。 ' }] })) }
        return { bind: vi.fn(() => ({ run: insert })) }
      }),
    }
    const repository = new MemoryRepository(db as unknown as D1Database)
    const prepareInvariant = vi.spyOn(repository, 'prepareNormalizedInvariant').mockResolvedValue()

    await expect(repository.restore(input)).resolves.toBe('skipped')
    expect(prepareInvariant).toHaveBeenCalledOnce()
    expect(db.prepare).toHaveBeenCalledWith('SELECT content FROM memories WHERE normalized_content IS NULL')
    expect(insert).not.toHaveBeenCalled()
  })
})
