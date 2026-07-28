import { MAX_MEMORY_BACKUP_ITEMS, MEMORY_BACKUP_SCHEMA_VERSION, memoryBackupSchema } from '../../../shared/memory-backup'
import { apiError, json } from '../../_lib/http'
import { MemoryRepository } from '../../_lib/repositories/memories'
import type { LunaPagesFunction } from '../../_lib/types'

export const onRequestGet: LunaPagesFunction = async ({ env }) => {
  const now = new Date()
  const memories = await new MemoryRepository(env.DB).list()
  if (memories.length > MAX_MEMORY_BACKUP_ITEMS) return apiError(413, 'MEMORY_BACKUP_TOO_LARGE', `记忆备份最多支持 ${MAX_MEMORY_BACKUP_ITEMS} 条`)
  const backup = memoryBackupSchema.parse({
    schemaVersion: MEMORY_BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    memories: memories.map((memory) => ({
      memoryType: memory.memoryType,
      content: memory.content,
      importance: memory.importance,
      category: memory.category,
      sensitivity: memory.sensitivity,
      confidence: memory.confidence,
      accessCount: memory.accessCount,
      lastAccessedAt: memory.lastAccessedAt,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      isActive: memory.isActive,
    })),
  })
  const filename = `luna-memories-${now.toISOString().slice(0, 10)}.json`
  return json(backup, { headers: { 'Content-Disposition': `attachment; filename="${filename}"` } })
}
