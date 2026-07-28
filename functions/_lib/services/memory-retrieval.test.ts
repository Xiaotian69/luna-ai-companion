import { describe, expect, it, vi } from 'vitest'
import type { Memory } from '../repositories/types'
import { createLocalMemoryEmbedder, retrieveMemories } from './memory-retrieval'

const now = '2026-07-28T00:00:00.000Z'

function memory(id: string, patch: Partial<Memory> = {}): Memory {
  return {
    id,
    memoryType: 'preference',
    content: `记忆 ${id}`,
    importance: 0.5,
    category: 'about_user',
    sensitivity: 'normal',
    confidence: 0.8,
    accessCount: 0,
    lastAccessedAt: null,
    supersededMemoryId: null,
    normalizedContent: id,
    sourceConversationId: null,
    sourceMessageId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
    ...patch,
  }
}

describe('memory retrieval', () => {
  it('ranks deterministically by relevance, importance, recency, use and pending status', async () => {
    const memories = [
      memory('unrelated', { content: '用户喜欢爵士乐', importance: 1 }),
      memory('relevant-low', { content: '用户周末想去爬山', importance: 0.2 }),
      memory('relevant-important', { content: '用户周末想去爬山', importance: 0.9 }),
      memory('relevant-recent', { content: '用户周末想去爬山', importance: 0.9, updatedAt: '2026-07-27T00:00:00.000Z' }),
      memory('relevant-used', { content: '用户周末想去爬山', importance: 0.9, updatedAt: '2026-07-27T00:00:00.000Z', accessCount: 4 }),
      memory('relevant-pending', { content: '周末答应陪用户去爬山', importance: 0.9, updatedAt: '2026-07-27T00:00:00.000Z', accessCount: 4, category: 'commitment', memoryType: 'pending' }),
    ]

    const first = await retrieveMemories({ memories, query: '周末去爬山', now, limit: 6 })
    const second = await retrieveMemories({ memories: [...memories].reverse(), query: '周末去爬山', now, limit: 6 })

    expect(first.map((item) => item.id)).toEqual([
      'relevant-pending', 'relevant-used', 'relevant-recent', 'relevant-important', 'relevant-low',
    ])
    expect(second.map((item) => item.id)).toEqual(first.map((item) => item.id))
  })

  it('is bounded, excludes inactive memories, and sanitizes display text', async () => {
    const memories = Array.from({ length: 120 }, (_, index) => memory(`m-${String(index).padStart(3, '0')}`, {
      content: index === 0 ? `  第一行\n第二行\u0000${'长'.repeat(300)}` : `关于旅行 ${index}`,
      importance: 1 - (index / 200),
      isActive: index !== 1,
    }))

    const result = await retrieveMemories({ memories, query: '第一行旅行', now, limit: 8 })

    expect(result).toHaveLength(8)
    expect(result.some((item) => item.id === 'm-001')).toBe(false)
    expect(result[0].displayText).not.toContain('\n')
    expect(result[0].displayText).not.toContain('\u0000')
    expect(result[0].displayText.length).toBeLessThanOrEqual(160)
  })

  it('computes fallback relevance before applying the 100-candidate bound', async () => {
    const memories = [
      ...Array.from({ length: 100 }, (_, index) => memory(`important-${index}`, { content: `无关内容 ${index}`, importance: 1 })),
      memory('only-relevant', { content: '唯一的火星旅行线索', importance: 0 }),
    ]

    const result = await retrieveMemories({ memories, query: '火星旅行', now, limit: 8 })

    expect(result[0]?.id).toBe('only-relevant')
  })

  it('uses an optional local embedder but falls back deterministically when it fails', async () => {
    const memories = [memory('a', { content: '苹果' }), memory('b', { content: '香蕉' })]
    const embed = vi.fn(async (values: string[]) => values.map((value) => value === '香蕉' ? [1, 0] : value === '今天吃什么' ? [1, 0] : [0, 1]))

    await expect(retrieveMemories({ memories, query: '今天吃什么', now, limit: 2, localEmbedder: { embed } })).resolves.toMatchObject([{ id: 'b' }])
    expect(embed).toHaveBeenCalledTimes(1)

    const broken = { embed: vi.fn(async () => { throw new Error('local model unavailable') }) }
    const first = await retrieveMemories({ memories, query: '苹果', now, limit: 2, localEmbedder: broken })
    const second = await retrieveMemories({ memories: [...memories].reverse(), query: '苹果', now, limit: 2 })
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id))
  })

  it('creates an embedding client only for an explicitly configured loopback endpoint', async () => {
    expect(createLocalMemoryEmbedder({ baseUrl: 'https://embeddings.example.com/v1', model: 'local' })).toBeUndefined()
    expect(createLocalMemoryEmbedder({ baseUrl: 'file://localhost/v1', model: 'local' })).toBeUndefined()
    expect(createLocalMemoryEmbedder({ baseUrl: 'http://127.0.0.1:11434/v1' })).toBeUndefined()
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      void init
      return new Response(JSON.stringify({ data: [
        { index: 1, embedding: [0, 1] },
        { index: 0, embedding: [1, 0] },
      ] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const embedder = createLocalMemoryEmbedder({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'nomic-embed-text', fetcher })

    await expect(embedder?.embed(['query', 'memory'])).resolves.toEqual([[1, 0], [0, 1]])
    expect(String(fetcher.mock.calls[0][0])).toBe('http://127.0.0.1:11434/v1/embeddings')
    expect(createLocalMemoryEmbedder({ baseUrl: 'http://[::1]:11434/v1', model: 'nomic-embed-text', fetcher })).toBeDefined()
  })
})
