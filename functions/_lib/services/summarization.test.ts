import { describe, expect, it } from 'vitest'
import { selectCompressionBatch } from './summarization'

describe('context compression selection', () => {
  it('keeps the configured recent window untouched', () => {
    const messages = Array.from({ length: 40 }, (_, index) => ({ id: `m${index}`, tokenEstimate: 500 }))
    const selected = selectCompressionBatch(messages, null, 24, 12_000)
    expect(selected.map((message) => message.id)).toEqual(Array.from({ length: 16 }, (_, index) => `m${index}`))
  })
  it('does nothing below the threshold', () => {
    expect(selectCompressionBatch([{ id: 'm1', tokenEstimate: 10 }], null, 24, 12_000)).toEqual([])
  })
})
