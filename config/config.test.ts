import { describe, expect, it } from 'vitest'
import { LIMITS } from './limits'
import { MODELS } from './models'
import { LUNA_PERSONA } from './persona'

describe('Luna configuration', () => {
  it('uses the requested current models and endpoints', () => {
    expect(MODELS.chat.model).toBe('deepseek-v4-flash')
    expect(MODELS.chat.endpoint).toContain('/chat/completions')
    expect(MODELS.speech.model).toBe('speech-2.8-turbo')
    expect(MODELS.speech.voicesEndpoint).toContain('/get_voice')
  })

  it('keeps a bounded recent context window', () => {
    expect(LIMITS.recentMessageCount).toBeGreaterThanOrEqual(20)
    expect(LIMITS.recentMessageCount).toBeLessThanOrEqual(30)
  })

  it('states identity transparency and anti-dependency rules', () => {
    expect(LUNA_PERSONA).toContain('AI')
    expect(LUNA_PERSONA).toContain('不假装是真实人类')
    expect(LUNA_PERSONA).toContain('不制造情感依赖')
  })
})
