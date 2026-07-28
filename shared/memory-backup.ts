import { z } from 'zod'
import { canonicalizeMemoryContent, memoryCategorySchema, memorySensitivitySchema } from './memory'

export const MEMORY_BACKUP_SCHEMA_VERSION = 1 as const
export const MAX_MEMORY_BACKUP_ITEMS = 1_000
export const MAX_MEMORY_BACKUP_BYTES = 1_048_576

export const memoryBackupItemSchema = z.object({
  memoryType: z.string().trim().min(1).max(40),
  content: z.string().trim().min(1).max(500),
  importance: z.number().min(0).max(1),
  category: memoryCategorySchema,
  sensitivity: memorySensitivitySchema,
  confidence: z.number().min(0).max(1),
  accessCount: z.number().int().min(0),
  lastAccessedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  isActive: z.boolean(),
}).strict()

export const memoryBackupSchema = z.object({
  schemaVersion: z.literal(MEMORY_BACKUP_SCHEMA_VERSION),
  exportedAt: z.iso.datetime(),
  memories: z.array(memoryBackupItemSchema).max(MAX_MEMORY_BACKUP_ITEMS),
}).strict()

export type MemoryBackupItem = z.infer<typeof memoryBackupItemSchema>
export type MemoryBackup = z.infer<typeof memoryBackupSchema>

export function dedupeMemoryBackup(memories: MemoryBackupItem[]): MemoryBackupItem[] {
  const seen = new Set<string>()
  return memories.filter((memory) => {
    const key = canonicalizeMemoryContent(memory.content)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function memoryRestoreId(content: string): Promise<string> {
  const canonical = canonicalizeMemoryContent(content)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  const hex = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `restore-${hex.slice(0, 32)}`
}
