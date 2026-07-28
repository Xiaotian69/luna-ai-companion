import { describe, expect, it } from 'vitest'
import {
  isSafeLocalTtsEndpoint,
  speechProviderSchema,
  voiceSettingsWithProviderSchema,
} from './speech-provider'

describe('speech providers', () => {
  it.each(['browser', 'local', 'minimax'])('accepts the supported provider %s', (provider) => {
    expect(speechProviderSchema.parse(provider)).toBe(provider)
  })

  it('rejects unknown providers', () => {
    expect(() => speechProviderSchema.parse('cloud')).toThrow()
  })

  it('migrates legacy voice settings to the zero-install browser provider', () => {
    expect(voiceSettingsWithProviderSchema.parse({
      voiceId: 'legacy-voice', speed: 1, pitch: 0, volume: 1, autoRead: false,
    }).provider).toBe('browser')
  })
})

describe('local TTS endpoint safety', () => {
  it.each([
    'http://127.0.0.1:8000/tts',
    'http://localhost:8000/v1/tts',
    'http://[::1]:8000/tts',
  ])('accepts loopback URL %s in local mode', (url) => {
    expect(isSafeLocalTtsEndpoint(url, 'local')).toBe(true)
  })

  it.each([
    'http://192.168.1.5:8000/tts',
    'https://tts.example.com/tts',
    'http://user:pass@127.0.0.1:8000/tts',
    'http://127.0.0.1:8000/tts?token=secret',
    'http://127.0.0.1:8000/tts#secret',
  ])('rejects unsafe URL %s in local mode', (url) => {
    expect(isSafeLocalTtsEndpoint(url, 'local')).toBe(false)
  })
})
