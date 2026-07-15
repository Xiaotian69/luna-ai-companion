import { z } from 'zod'

export const memoryCandidateSchema = z.object({ should_save: z.boolean(), memory_type: z.string().min(1).max(40).default('other'), content: z.string().trim().max(500).default(''), importance: z.number().min(0).max(1).default(0.5) })
export const memoryUpdateSchema = z.object({ content: z.string().trim().min(1).max(500), importance: z.number().min(0).max(1), isActive: z.boolean() })
