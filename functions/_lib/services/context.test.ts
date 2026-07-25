import { describe, expect, it } from 'vitest'
import { DEFAULT_COMPANION_PROFILE } from '../../../shared/companion'
import { assembleContext, estimateTokens } from './context'

describe('context assembly', () => {
  it('orders persona, relationship, relevant memories, summary, recent messages and current input', () => {
    const result = assembleContext({
      companion: DEFAULT_COMPANION_PROFILE,
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
      expect.stringContaining('Luna'), expect.stringContaining('当前伴侣档案'), expect.stringContaining('平静'), expect.stringContaining('爵士乐'), expect.stringContaining('调整作息'), '先休息一下吧', '今晚听点爵士乐',
    ])
    expect(result.filter((item) => item.content === '今晚听点爵士乐')).toHaveLength(1)
  })

  it('applies the custom companion identity while retaining fixed safety rules', () => {
    const result = assembleContext({
      companion: {
        ...DEFAULT_COMPANION_PROFILE,
        displayName: 'Nova',
        relationshipPreset: 'boyfriend',
        userAddress: '小天',
        personality: '温柔但有主见',
        speakingStyle: '自然简短',
      },
      relationship: { familiarity: 0.2, currentMood: '平静', recentEvents: [], updatedAt: '' },
      memories: [],
      summary: null,
      messages: [],
      currentInput: '晚上好',
    })
    expect(result[0].content).toContain('明确知道自己是 AI')
    expect(result[1].content).toContain('名字：Nova')
    expect(result[1].content).toContain('关系：男友')
    expect(result[1].content).toContain('对用户的称呼：小天')
    expect(result[1].content).toContain('说话风格：自然简短')
  })

  it('uses a deterministic conservative token estimate', () => {
    expect(estimateTokens('一二三四五')).toBe(3)
  })
})
