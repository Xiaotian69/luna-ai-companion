import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  restore: vi.fn(),
}))

vi.mock('../../_lib/repositories/memories', () => ({
  MemoryRepository: class {
    list = repository.list
    restore = repository.restore
  },
}))

import { onRequestGet } from './export'
import { onRequestPost } from './import'

const memory = {
  id: 'private-database-id',
  memoryType: 'preference',
  content: '用户喜欢简洁界面',
  importance: 0.8,
  category: 'about_user',
  sensitivity: 'normal',
  confidence: 0.9,
  accessCount: 2,
  lastAccessedAt: '2026-07-27T08:00:00.000Z',
  supersededMemoryId: 'private-old-id',
  normalizedContent: 'normalized',
  sourceConversationId: 'private-conversation-id',
  sourceMessageId: 'private-message-id',
  createdAt: '2026-07-20T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z',
  isActive: true,
}

function post(body: unknown): Request {
  return new Request('https://example.test/api/memories/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function backup(memories: unknown[] = [memory]) {
  return {
    schemaVersion: 1,
    exportedAt: '2026-07-28T08:00:00.000Z',
    memories: memories.map((item) => {
      const value = item as typeof memory
      return {
        memoryType: value.memoryType,
        content: value.content,
        importance: value.importance,
        category: value.category,
        sensitivity: value.sensitivity,
        confidence: value.confidence,
        accessCount: value.accessCount,
        lastAccessedAt: value.lastAccessedAt,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        isActive: value.isActive,
      }
    }),
  }
}

beforeEach(() => {
  repository.list.mockReset()
  repository.restore.mockReset()
})

describe('GET /api/memories/export', () => {
  it('downloads a versioned document containing only long-term memory fields', async () => {
    repository.list.mockResolvedValue([memory])

    const response = await onRequestGet({ env: { DB: {} } } as never) as Response
    const body = await response.json() as Record<string, unknown>
    const serialized = JSON.stringify(body)

    expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename="luna-memories-\d{4}-\d{2}-\d{2}\.json"$/)
    expect(body).toMatchObject({ schemaVersion: 1, memories: [{ content: memory.content }] })
    expect(serialized).not.toMatch(/private-database-id|conversation|message|session|cookie|api.?key|password/i)
  })

  it('returns an explicit size error instead of producing an invalid oversized document', async () => {
    repository.list.mockResolvedValue(Array.from({ length: 1_001 }, () => memory))

    const response = await onRequestGet({ env: { DB: {} } } as never) as Response

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ error: { code: 'MEMORY_BACKUP_TOO_LARGE' } })
  })
})

describe('POST /api/memories/import', () => {
  it('requires explicit confirmation before any database write', async () => {
    const response = await onRequestPost({ request: post({ confirmation: false, backup: backup() }), env: { DB: {} } } as never) as Response

    expect(response.status).toBe(400)
    expect(repository.restore).not.toHaveBeenCalled()
  })

  it('validates the entire document before any database write', async () => {
    const invalid = backup([memory, { ...memory, content: '', id: 'invalid' }])
    const response = await onRequestPost({ request: post({ confirmation: true, backup: invalid }), env: { DB: {} } } as never) as Response

    expect(response.status).toBe(400)
    expect(repository.restore).not.toHaveBeenCalled()
  })

  it('rejects an oversized request body before any database write', async () => {
    const response = await onRequestPost({
      request: post({ confirmation: true, backup: backup(), padding: 'x'.repeat(1_100_000) }),
      env: { DB: {} },
    } as never) as Response

    expect(response.status).toBe(413)
    expect(repository.restore).not.toHaveBeenCalled()
  })

  it('deduplicates active and inactive canonical matches within one document', async () => {
    repository.restore.mockResolvedValue('created')
    const duplicate = { ...memory, content: ' 用户喜欢简洁界面。 ', isActive: false }

    const response = await onRequestPost({
      request: post({ confirmation: true, backup: backup([memory, duplicate]) }),
      env: { DB: {} },
    } as never) as Response

    expect(response.status).toBe(200)
    expect(repository.restore).toHaveBeenCalledTimes(1)
    expect(await response.json()).toEqual({ created: 1, reinforced: 0, skipped: 1 })
  })

  it('uses a deterministic restore ID so repeated imports can be idempotent', async () => {
    const seen = new Set<string>()
    repository.restore.mockImplementation(async (item: { id: string }) => {
      if (seen.has(item.id)) return 'skipped'
      seen.add(item.id)
      return 'created'
    })
    const input = { confirmation: true, backup: backup() }

    const first = await onRequestPost({ request: post(input), env: { DB: {} } } as never) as Response
    const second = await onRequestPost({ request: post(input), env: { DB: {} } } as never) as Response

    expect(await first.json()).toEqual({ created: 1, reinforced: 0, skipped: 0 })
    expect(await second.json()).toEqual({ created: 0, reinforced: 0, skipped: 1 })
    expect(repository.restore.mock.calls[0][0].id).toBe(repository.restore.mock.calls[1][0].id)
    expect(repository.restore.mock.calls[0][0]).toMatchObject({ sourceConversationId: null, sourceMessageId: null })
  })
})
