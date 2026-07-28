import { z } from 'zod'

export const memoryCategorySchema = z.enum(['about_user', 'shared_experience', 'commitment', 'relationship'])
export const memorySensitivitySchema = z.enum(['normal', 'personal', 'intimate', 'health', 'identity', 'payment'])

export type MemoryCategory = z.infer<typeof memoryCategorySchema>
export type MemorySensitivity = z.infer<typeof memorySensitivitySchema>

export function canonicalizeMemoryContent(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[\s。！？,.!?，]/g, '')
}

const memoryCandidateBase = {
  memory_type: z.string().min(1).max(40).default('other'),
  content: z.string().trim().max(500).default(''),
  importance: z.number().min(0).max(1).default(0.5),
  supersedes_memory_id: z.string().trim().min(1).max(100).nullable().default(null),
}

export const memoryCandidateSchema = z.discriminatedUnion('should_save', [z.object({
  should_save: z.boolean(),
  ...memoryCandidateBase,
  category: memoryCategorySchema.optional(),
  sensitivity: memorySensitivitySchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
}).extend({ should_save: z.literal(false) }).strict(), z.object({
  ...memoryCandidateBase,
  should_save: z.literal(true),
  category: memoryCategorySchema,
  sensitivity: memorySensitivitySchema,
  confidence: z.number().min(0).max(1),
}).strict()])
export const memoryConflictSchema = z.object({ conflicts_memory_id: z.string().trim().min(1).max(100).nullable() }).strict()
export const memoryUpdateSchema = z.object({ content: z.string().trim().min(1).max(500), importance: z.number().min(0).max(1), isActive: z.boolean() })
