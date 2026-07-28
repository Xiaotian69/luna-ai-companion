import { z } from 'zod'
import { dedupeMemoryBackup, MAX_MEMORY_BACKUP_BYTES, memoryBackupSchema, memoryRestoreId } from '../../../shared/memory-backup'
import { apiError, json } from '../../_lib/http'
import { MemoryRepository, type MemoryRestoreInput } from '../../_lib/repositories/memories'
import type { LunaPagesFunction } from '../../_lib/types'

const importRequestSchema = z.object({
  confirmation: z.literal(true),
  backup: memoryBackupSchema,
}).strict()

async function readLimitedBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_MEMORY_BACKUP_BYTES) {
      void reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export const onRequestPost: LunaPagesFunction = async ({ request, env }) => {
  const declaredLength = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MEMORY_BACKUP_BYTES) return apiError(413, 'MEMORY_BACKUP_TOO_LARGE', '记忆备份文件过大')
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) return apiError(400, 'INVALID_MEMORY_BACKUP', '请选择有效的 JSON 记忆备份')
  const body = await readLimitedBody(request)
  if (body === null) return apiError(413, 'MEMORY_BACKUP_TOO_LARGE', '记忆备份文件过大')
  let input: z.infer<typeof importRequestSchema>
  try {
    input = importRequestSchema.parse(JSON.parse(body))
  } catch {
    return apiError(400, 'INVALID_MEMORY_BACKUP', '请确认并选择有效的记忆备份')
  }

  const memories = dedupeMemoryBackup(input.backup.memories)
  const repository = new MemoryRepository(env.DB)
  const restoreInputs: MemoryRestoreInput[] = []
  for (const memory of memories) restoreInputs.push({
      ...memory,
      id: await memoryRestoreId(memory.content),
      sourceConversationId: null,
      sourceMessageId: null,
  })
  const results = await repository.restoreMany(restoreInputs)
  const created = results.filter((result) => result === 'created').length
  const skipped = (input.backup.memories.length - memories.length) + results.filter((result) => result === 'skipped').length

  return json({ created, reinforced: 0, skipped })
}
