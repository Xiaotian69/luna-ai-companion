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

  it('accepts only external HTTPS endpoints in cloud mode', () => {
    expect(isSafeLocalTtsEndpoint('https://tts.example.com/v1/tts', 'cloud')).toBe(true)
    expect(isSafeLocalTtsEndpoint('https://localhost:8000/tts', 'cloud')).toBe(false)
    expect(isSafeLocalTtsEndpoint('http://tts.example.com/tts', 'cloud')).toBe(false)
  })

  it.each([
    'https://127.0.0.1/tts',
    'https://127.1/tts',
    'https://2130706433/tts',
    'https://0x7f000001/tts',
    'https://10.0.0.1/tts',
    'https://169.254.169.254/latest',
    'https://172.16.0.1/tts',
    'https://192.168.0.1/tts',
    'https://100.64.0.1/tts',
    'https://240.0.0.1/tts',
    'https://[::1]/tts',
    'https://[fc00::1]/tts',
    'https://[fe80::1]/tts',
    'https://[::ffff:127.0.0.1]/tts',
  ])('rejects IP literal %s in cloud mode', (url) => {
    expect(isSafeLocalTtsEndpoint(url, 'cloud')).toBe(false)
  })

  it.each([
    'https://tts/tts',
    'https://localhost/tts',
    'https://voice.local/tts',
    'https://voice.internal/tts',
    'https://voice.lan/tts',
    'https://voice.home/tts',
    'https://voice.test/tts',
    'https://voice.invalid/tts',
    'https://voice.example/tts',
    'https://voice.onion/tts',
    'https://-voice.example.com/tts',
    'https://voice-.example.com/tts',
    'https://voice.example.123/tts',
  ])('rejects non-public hostname syntax %s in cloud mode', (url) => {
    expect(isSafeLocalTtsEndpoint(url, 'cloud')).toBe(false)
  })

  it.each([
    'https://tts.example.com/v1/tts',
    'https://voice-api.example.co.uk/tts',
    'https://xn--fiq228c.xn--fiqs8s/tts',
  ])('accepts public FQDN syntax %s in cloud mode', (url) => {
    expect(isSafeLocalTtsEndpoint(url, 'cloud')).toBe(true)
  })
})
