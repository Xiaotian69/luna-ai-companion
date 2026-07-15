import { describe, expect, it } from 'vitest'
import { assembleContext, estimateTokens } from './context'

describe('context assembly', () => {
  it('orders persona, relationship, relevant memories, summary, recent messages and current input', () => {
    const result = assembleContext({
      relationship: { familiarity: 0.4, currentMood: '平静', recentEvents: ['用户刚完成工作'], updatedAt: '' },
      memories: [
        { id: '1', content: '用户喜欢爵士乐', importance: 0.9, isActive: true },
        { id: '2', content: '用户喜欢简洁界面', importance: 0.8, isActive: true },
      ],
      summary: '用户最近在调整作息',
      messages: [{ id: 'm1', role: 'assistant', content: '先休息一下吧' }],
      currentInput: '今晚听点爵士乐',
    })
    expect(result.map((item) => item.content)).toEqual([
      expect.stringContaining('Luna'), expect.stringContaining('平静'), expect.stringContaining('爵士乐'), expect.stringContaining('调整作息'), '先休息一下吧', '今晚听点爵士乐',
    ])
    expect(result.filter((item) => item.content === '今晚听点爵士乐')).toHaveLength(1)
  })

  it('uses a deterministic conservative token estimate', () => {
    expect(estimateTokens('一二三四五')).toBe(3)
  })
})
