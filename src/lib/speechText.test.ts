import { describe, expect, it } from 'vitest'
import { prepareSpeechText, splitSpeechText } from './speechText'

describe('speech text preprocessing', () => {
  it('removes markdown, code and raw URLs', () => {
    expect(prepareSpeechText('## 标题\n- **重点**：访问 https://example.com\n```ts\nconst x = 1\n```')).toBe('标题\n重点：访问链接')
  })
  it('splits long text on natural sentence boundaries', () => {
    expect(splitSpeechText('第一句。第二句！第三句？', 7)).toEqual(['第一句。', '第二句！', '第三句？'])
  })
})
