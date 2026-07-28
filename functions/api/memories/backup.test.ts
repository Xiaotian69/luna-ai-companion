import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_MEMORY_BACKUP_BYTES } from '../../../shared/memory-backup'

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  restore: vi.fn(),
  restoreMany: vi.fn(),
}))

vi.mock('../../_lib/repositories/memories', () => ({
  MemoryRepository: class {
    list = repository.list
    restore = repository.restore
    restoreMany = repository.restoreMany
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
  repository.restoreMany.mockReset()
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

  it('round-trips the largest legal Chinese document through the import envelope', async () => {
    repository.list.mockResolvedValue(Array.from({ length: 1_000 }, (_, index) => ({
      ...memory,
      id: `memory-${index}`,
      content: `记${'忆'.repeat(499)}`,
    })))
    repository.restoreMany.mockResolvedValue(['skipped'])

    const exported = await onRequestGet({ env: { DB: {} } } as never) as Response
    const document = await exported.json()
    const envelope = JSON.stringify({ confirmation: true, backup: document })
    const envelopeBytes = new TextEncoder().encode(envelope).byteLength
    const imported = await onRequestPost({ request: post(JSON.parse(envelope)), env: { DB: {} } } as never) as Response

    expect(exported.status).toBe(200)
    expect(envelopeBytes).toBeGreaterThan(1_048_576)
    expect(envelopeBytes).toBeLessThanOrEqual(MAX_MEMORY_BACKUP_BYTES)
    expect(imported.status).toBe(200)
  })

  it('rejects an export whose actual import envelope exceeds the shared byte limit', async () => {
    repository.list.mockResolvedValue(Array.from({ length: 1_000 }, (_, index) => ({
      ...memory,
      id: `memory-${index}`,
      content: '\ud800'.repeat(500),
    })))

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
    expect(repository.restoreMany).not.toHaveBeenCalled()
  })

  it('validates the entire document before any database write', async () => {
    const invalid = backup([memory, { ...memory, content: '', id: 'invalid' }])
    const response = await onRequestPost({ request: post({ confirmation: true, backup: invalid }), env: { DB: {} } } as never) as Response

    expect(response.status).toBe(400)
    expect(repository.restore).not.toHaveBeenCalled()
    expect(repository.restoreMany).not.toHaveBeenCalled()
  })

  it('rejects an oversized request body before any database write', async () => {
    const response = await onRequestPost({
      request: post({ confirmation: true, backup: backup(), padding: 'x'.repeat(MAX_MEMORY_BACKUP_BYTES + 1) }),
      env: { DB: {} },
    } as never) as Response

    expect(response.status).toBe(413)
    expect(repository.restore).not.toHaveBeenCalled()
    expect(repository.restoreMany).not.toHaveBeenCalled()
  })

  it.each([undefined, '16'])('cancels an oversized streamed body early with Content-Length %s', async (contentLength) => {
    const cancel = vi.fn()
    let pullCount = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1
        if (pullCount === 1) controller.enqueue(new Uint8Array(MAX_MEMORY_BACKUP_BYTES))
        else if (pullCount === 2) controller.enqueue(new Uint8Array(1))
        else controller.close()
      },
      cancel,
    })
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (contentLength) headers.set('Content-Length', contentLength)
    const request = new Request('https://example.test/api/memories/import', {
      method: 'POST', headers, body: stream, duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    const response = await onRequestPost({ request, env: { DB: {} } } as never) as Response

    expect(response.status).toBe(413)
    expect(cancel).toHaveBeenCalledOnce()
    expect(repository.restoreMany).not.toHaveBeenCalled()
  })

  it('returns 413 without waiting for a stalled stream cancellation promise', async () => {
    let pullCount = 0
    const cancel = vi.fn(() => new Promise<void>(() => undefined))
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1
        controller.enqueue(new Uint8Array(pullCount === 1 ? MAX_MEMORY_BACKUP_BYTES : 1))
      },
      cancel,
    })
    const request = new Request('https://example.test/api/memories/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    const outcome = await Promise.race([
      onRequestPost({ request, env: { DB: {} } } as never),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100)),
    ])

    expect(outcome).toBeInstanceOf(Response)
    expect((outcome as Response).status).toBe(413)
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('deduplicates active and inactive canonical matches within one document', async () => {
    repository.restoreMany.mockResolvedValue(['created'])
    const duplicate = { ...memory, content: ' 用户喜欢简洁界面。 ', isActive: false }

    const response = await onRequestPost({
      request: post({ confirmation: true, backup: backup([memory, duplicate]) }),
      env: { DB: {} },
    } as never) as Response

    expect(response.status).toBe(200)
    expect(repository.restoreMany).toHaveBeenCalledTimes(1)
    expect(repository.restoreMany.mock.calls[0][0]).toHaveLength(1)
    expect(await response.json()).toEqual({ created: 1, reinforced: 0, skipped: 1 })
  })

  it('uses a deterministic restore ID so repeated imports can be idempotent', async () => {
    const seen = new Set<string>()
    repository.restoreMany.mockImplementation(async (items: Array<{ id: string }>) => items.map((item) => {
      if (seen.has(item.id)) return 'skipped'
      seen.add(item.id)
      return 'created'
    }))
    const input = { confirmation: true, backup: backup() }

    const first = await onRequestPost({ request: post(input), env: { DB: {} } } as never) as Response
    const second = await onRequestPost({ request: post(input), env: { DB: {} } } as never) as Response

    expect(await first.json()).toEqual({ created: 1, reinforced: 0, skipped: 0 })
    expect(await second.json()).toEqual({ created: 0, reinforced: 0, skipped: 1 })
    expect(repository.restoreMany.mock.calls[0][0][0].id).toBe(repository.restoreMany.mock.calls[1][0][0].id)
    expect(repository.restoreMany.mock.calls[0][0][0]).toMatchObject({ sourceConversationId: null, sourceMessageId: null })
  })
})
