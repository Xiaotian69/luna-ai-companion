import { describe, expect, it } from 'vitest'
import { normalizeMemory, parseMemoryCandidate } from './memory-extraction'

describe('memory extraction validation', () => {
  it('accepts an explicit stable preference', () => {
    expect(parseMemoryCandidate('{"should_save":true,"memory_type":"preference","content":"用户喜欢简洁安静的界面","importance":0.8}')).toMatchObject({ shouldSave: true, memoryType: 'preference', importance: 0.8 })
  })
  it('rejects guessed and sensitive content', () => {
    expect(parseMemoryCandidate('{"should_save":true,"memory_type":"guess","content":"猜测用户身份证号是123456789012345678","importance":0.9}').shouldSave).toBe(false)
  })
  it('normalizes content for duplicate suppression', () => {
    expect(normalizeMemory(' 用户 喜欢 Jazz。')).toBe(normalizeMemory('用户喜欢jazz'))
  })
})
