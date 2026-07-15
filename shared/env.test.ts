import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const valid = {
  DEEPSEEK_API_KEY: 'deepseek-test',
  MINIMAX_API_KEY: 'minimax-test',
  APP_PASSWORD: 'strong-password',
  SESSION_SECRET: 'x'.repeat(32),
  DB: {},
}

describe('parseEnv', () => {
  it('rejects a missing app password', () => {
    const { APP_PASSWORD: _removed, ...input } = valid
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
})
