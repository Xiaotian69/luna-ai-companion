import { describe, expect, it } from 'vitest'
import { voiceCacheKey } from './audioController'

describe('voice cache keys', () => {
  it('is stable for identical text and settings and changes with pitch', async () => {
    const settings = { voiceId: 'wise', speed: 0.92, pitch: -1, volume: 1 }
    expect(await voiceCacheKey('你好', settings)).toBe(await voiceCacheKey('你好', { ...settings }))
    expect(await voiceCacheKey('你好', settings)).not.toBe(await voiceCacheKey('你好', { ...settings, pitch: 0 }))
  })
})
