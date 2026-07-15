import { z } from 'zod'
import { LIMITS } from '../config/limits'

export const createConversationSchema = z.object({ title: z.string().trim().min(1).max(80).default('新对话') })
export const chatRequestSchema = z.object({ conversationId: z.string().min(1).optional(), content: z.string().trim().min(1).max(LIMITS.inputCharacters), regenerate: z.boolean().default(false) })
export type ChatRequest = z.infer<typeof chatRequestSchema>
