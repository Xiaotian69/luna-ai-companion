import { describe, expect, it } from 'vitest'
import { containsSecret, isForbiddenRepositoryPath } from './secret-scan.mjs'

describe('public repository safety scan', () => {
  it('detects API key-shaped content without embedding a real key fixture', () => {
    const fakeKey = ['sk', 'test_1234567890abcdef'].join('-')
    expect(containsSecret(`CHAT_API_KEY=${fakeKey}`)).toBe(true)
    expect(containsSecret('CHAT_API_KEY=replace-with-your-key')).toBe(false)
  })

  it('rejects local data, model, voice, log, and visual draft paths', () => {
    expect(isForbiddenRepositoryPath('.wrangler/state/data.sqlite')).toBe(true)
    expect(isForbiddenRepositoryPath('models/qwen.gguf')).toBe(true)
    expect(isForbiddenRepositoryPath('voices/private.onnx')).toBe(true)
    expect(isForbiddenRepositoryPath('work/server.log')).toBe(true)
    expect(isForbiddenRepositoryPath('.superpowers/brainstorm/layout.html')).toBe(true)
    expect(isForbiddenRepositoryPath('migrations/0001_initial.sql')).toBe(false)
  })
})
