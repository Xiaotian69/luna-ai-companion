import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const valid = {
  DEEPSEEK_API_KEY: 'deepseek-test',
  APP_PASSWORD: 'strong-password',
  SESSION_SECRET: 'x'.repeat(32),
  DB: {},
}

describe('parseEnv', () => {
  it('rejects a missing app password', () => {
    const input: Record<string, unknown> = { ...valid }
    delete input.APP_PASSWORD
    expect(() => parseEnv(input)).toThrow()
  })

  it('rejects a short session secret', () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: 'short' })).toThrow()
  })

  it('rejects invalid numeric limits', () => {
    expect(() => parseEnv({ ...valid, DAILY_CHAT_LIMIT: 'zero' })).toThrow()
  })

  it('parses safe defaults', () => {
    expect(parseEnv(valid)).toMatchObject({ ENVIRONMENT: 'development', DAILY_CHAT_LIMIT: 100 })
  })

  it('does not require MiniMax for browser or local speech', () => {
    expect(parseEnv(valid).MINIMAX_API_KEY).toBeUndefined()
  })

  it('accepts a safe loopback local TTS endpoint', () => {
    expect(parseEnv({ ...valid, APP_MODE: 'local', LOCAL_TTS_ENDPOINT: 'http://127.0.0.1:8000/tts' }).LOCAL_TTS_ENDPOINT)
      .toBe('http://127.0.0.1:8000/tts')
  })

  it('rejects unsafe local TTS endpoints in local mode', () => {
    expect(() => parseEnv({ ...valid, APP_MODE: 'local', LOCAL_TTS_ENDPOINT: 'http://169.254.169.254/latest' })).toThrow()
  })

  it('accepts an external HTTPS TTS endpoint in cloud mode', () => {
    expect(parseEnv({ ...valid, APP_MODE: 'cloud', LOCAL_TTS_ENDPOINT: 'https://tts.example.com/tts' }).LOCAL_TTS_ENDPOINT)
      .toBe('https://tts.example.com/tts')
  })

  it('rejects loopback TTS endpoints in cloud mode', () => {
    expect(() => parseEnv({ ...valid, APP_MODE: 'cloud', LOCAL_TTS_ENDPOINT: 'https://localhost:8000/tts' })).toThrow()
  })

  it('rejects IP literals and special-use suffixes in cloud mode', () => {
    expect(() => parseEnv({ ...valid, APP_MODE: 'cloud', LOCAL_TTS_ENDPOINT: 'https://169.254.169.254/latest' })).toThrow()
    expect(() => parseEnv({ ...valid, APP_MODE: 'cloud', LOCAL_TTS_ENDPOINT: 'https://voice.internal/tts' })).toThrow()
  })
})
