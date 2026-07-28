import { z } from 'zod'
import { dedupeMemoryBackup, MAX_MEMORY_BACKUP_BYTES, memoryBackupSchema, memoryRestoreId } from '../../../shared/memory-backup'
import { apiError, json } from '../../_lib/http'
import { MemoryRepository } from '../../_lib/repositories/memories'
import type { LunaPagesFunction } from '../../_lib/types'

const importRequestSchema = z.object({
  confirmation: z.literal(true),
  backup: memoryBackupSchema,
}).strict()

export const onRequestPost: LunaPagesFunction = async ({ request, env }) => {
  const declaredLength = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MEMORY_BACKUP_BYTES) return apiError(413, 'MEMORY_BACKUP_TOO_LARGE', '记忆备份文件过大')
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) return apiError(400, 'INVALID_MEMORY_BACKUP', '请选择有效的 JSON 记忆备份')
  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > MAX_MEMORY_BACKUP_BYTES) return apiError(413, 'MEMORY_BACKUP_TOO_LARGE', '记忆备份文件过大')
  let input: z.infer<typeof importRequestSchema>
  try {
    input = importRequestSchema.parse(JSON.parse(body))
  } catch {
    return apiError(400, 'INVALID_MEMORY_BACKUP', '请确认并选择有效的记忆备份')
  }

  const memories = dedupeMemoryBackup(input.backup.memories)
  const repository = new MemoryRepository(env.DB)
  let created = 0
  let skipped = input.backup.memories.length - memories.length

  for (const memory of memories) {
    const result = await repository.restore({
      ...memory,
      id: await memoryRestoreId(memory.content),
      sourceConversationId: null,
      sourceMessageId: null,
    })
    if (result === 'created') created += 1
    else skipped += 1
  }

  return json({ created, reinforced: 0, skipped })
}
