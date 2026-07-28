import { describe, expect, it } from 'vitest'
import { companionProfileInputSchema, DEFAULT_COMPANION_PROFILE, resolveRelationshipLabel } from './companion'

describe('companion profile', () => {
  it('accepts a custom relationship and trims text', () => {
    const value = companionProfileInputSchema.parse({
      displayName: ' Nova ',
      avatarUrl: '',
      relationshipPreset: 'custom',
      customRelationship: '灵魂搭档',
      userAddress: '小天',
      personality: '温柔但有主见',
      speakingStyle: '自然简短',
      boundaries: '不制造情感依赖',
    })
    expect(value.displayName).toBe('Nova')
    expect(value.customRelationship).toBe('灵魂搭档')
    expect(resolveRelationshipLabel(value)).toBe('灵魂搭档')
  })

  it('keeps Luna as the default example', () => {
    expect(DEFAULT_COMPANION_PROFILE.displayName).toBe('Luna')
    expect(resolveRelationshipLabel(DEFAULT_COMPANION_PROFILE)).toBe('朋友')
  })

  it('rejects custom relationships without a label', () => {
    expect(() => companionProfileInputSchema.parse({
      ...DEFAULT_COMPANION_PROFILE,
      relationshipPreset: 'custom',
      customRelationship: '',
    })).toThrow()
  })
})
