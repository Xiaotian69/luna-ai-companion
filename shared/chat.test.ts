import { describe, expect, it } from 'vitest'
import { chatRequestSchema, createConversationSchema } from './chat'

describe('chat API schemas', () => {
  it('rejects empty and overlong messages', () => {
    expect(chatRequestSchema.safeParse({ content: '' }).success).toBe(false)
    expect(chatRequestSchema.safeParse({ content: 'x'.repeat(4_001) }).success).toBe(false)
  })
  it('accepts a trimmed message and optional conversation', () => {
    expect(chatRequestSchema.parse({ conversationId: 'c1', content: '  晚上好  ' })).toEqual({ conversationId: 'c1', content: '晚上好', regenerate: false })
  })
  it('uses a stable default conversation title', () => {
    expect(createConversationSchema.parse({})).toEqual({ title: '新对话' })
  })
})
