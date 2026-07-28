import { describe, expect, it } from 'vitest'
import {
  MEMORY_BACKUP_SCHEMA_VERSION,
  dedupeMemoryBackup,
  memoryBackupSchema,
} from './memory-backup'

const validMemory = {
  memoryType: 'preference',
  content: '用户喜欢简洁界面',
  importance: 0.8,
  category: 'about_user',
  sensitivity: 'normal',
  confidence: 0.9,
  accessCount: 2,
  lastAccessedAt: '2026-07-27T08:00:00.000Z',
  createdAt: '2026-07-20T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z',
  isActive: true,
} as const

describe('memory backup schema', () => {
  it('accepts a strict versioned long-term-memory document', () => {
    const backup = memoryBackupSchema.parse({
      schemaVersion: MEMORY_BACKUP_SCHEMA_VERSION,
      exportedAt: '2026-07-28T08:00:00.000Z',
      memories: [validMemory],
    })

    expect(backup.schemaVersion).toBe(1)
    expect(backup.memories).toEqual([validMemory])
  })

  it.each([
    { name: 'unknown document field', patch: { apiKey: 'secret' } },
    { name: 'unsupported version', patch: { schemaVersion: 2 } },
    { name: 'invalid export time', patch: { exportedAt: 'yesterday' } },
  ])('rejects $name', ({ patch }) => {
    expect(() => memoryBackupSchema.parse({
      schemaVersion: 1,
      exportedAt: '2026-07-28T08:00:00.000Z',
      memories: [validMemory],
      ...patch,
    })).toThrow()
  })

  it('rejects forbidden or malformed memory fields', () => {
    for (const memory of [
      { ...validMemory, session: 'cookie' },
      { ...validMemory, category: 'unknown' },
      { ...validMemory, confidence: 2 },
      { ...validMemory, accessCount: 1.5 },
      { ...validMemory, updatedAt: 'not-a-time' },
      { ...validMemory, content: 'x'.repeat(501) },
    ]) {
      expect(() => memoryBackupSchema.parse({
        schemaVersion: 1,
        exportedAt: '2026-07-28T08:00:00.000Z',
        memories: [memory],
      })).toThrow()
    }
  })

  it('deduplicates canonical content within one document', () => {
    const backup = memoryBackupSchema.parse({
      schemaVersion: 1,
      exportedAt: '2026-07-28T08:00:00.000Z',
      memories: [validMemory, { ...validMemory, content: ' 用户喜欢简洁界面。 ', importance: 0.6 }],
    })

    expect(dedupeMemoryBackup(backup.memories)).toEqual([validMemory])
  })
})
