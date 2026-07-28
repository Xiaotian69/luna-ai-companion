import { z } from 'zod'

export const memoryCategorySchema = z.enum(['about_user', 'shared_experience', 'commitment', 'relationship'])
export const memorySensitivitySchema = z.enum(['normal', 'personal', 'intimate', 'health', 'identity', 'payment'])

export type MemoryCategory = z.infer<typeof memoryCategorySchema>
export type MemorySensitivity = z.infer<typeof memorySensitivitySchema>

const categoryQueryRules: Record<MemoryCategory, RegExp> = {
  about_user: /喜欢|偏好|习惯|讨厌|爱好|我(?:是|在|有)|like|prefer|habit/i,
  shared_experience: /一起|上次|曾经|记得|经历|共同|together|last time/i,
  commitment: /答应|约定|计划|提醒|待办|还没|之后|明天|周末|promise|plan|remind|todo|pending/i,
  relationship: /关系|称呼|边界|相处|信任|relationship|boundary|trust/i,
}

export function inferRelevantMemoryCategories(query: string): MemoryCategory[] {
  return memoryCategorySchema.options.filter((category) => categoryQueryRules[category].test(query))
}

export function isPendingMemory(input: { category: MemoryCategory; memoryType: string; content: string }): boolean {
  if (input.category !== 'commitment' && !/pending|todo|commitment|reminder/i.test(input.memoryType)) return false
  return !/已完成|完成了|已解决|已取消|done|completed|resolved|cancelled/i.test(input.content)
}

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
