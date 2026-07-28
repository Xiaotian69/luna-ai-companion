import { z } from 'zod'

export const memoryCategorySchema = z.enum(['about_user', 'shared_experience', 'commitment', 'relationship'])
export const memorySensitivitySchema = z.enum(['normal', 'personal', 'intimate', 'health', 'identity', 'payment'])

export type MemoryCategory = z.infer<typeof memoryCategorySchema>
export type MemorySensitivity = z.infer<typeof memorySensitivitySchema>

export const memoryCandidateSchema = z.object({
  should_save: z.boolean(),
  memory_type: z.string().min(1).max(40).default('other'),
  content: z.string().trim().max(500).default(''),
  importance: z.number().min(0).max(1).default(0.5),
  category: memoryCategorySchema.default('about_user'),
  sensitivity: memorySensitivitySchema.default('normal'),
  confidence: z.number().min(0).max(1).default(0.5),
  supersedes_memory_id: z.string().trim().min(1).max(100).nullable().default(null),
}).strict()
export const memoryUpdateSchema = z.object({ content: z.string().trim().min(1).max(500), importance: z.number().min(0).max(1), isActive: z.boolean() })
