import { describe, expect, it } from 'vitest'
import { parseDeepSeekStream, sseEvent } from './stream'

describe('SSE streaming', () => {
  it('parses chunk boundaries and ignores the done marker', async () => {
    const source = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"你"}}]}\n')); controller.enqueue(new TextEncoder().encode('\ndata: {"choices":[{"delta":{"content":"好"}}]}\n\ndata: [DONE]\n\n')); controller.close() } })
    const chunks: string[] = []
    for await (const value of parseDeepSeekStream(source)) chunks.push(value)
    expect(chunks).toEqual(['你', '好'])
  })
  it('formats browser SSE events', () => {
    expect(sseEvent('delta', { content: '你好' })).toBe('event: delta\ndata: {"content":"你好"}\n\n')
  })
  it('parses CRLF-delimited upstream events', async () => {
    const source = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"成功"}}]}\r\n\r\ndata: [DONE]\r\n\r\n')); controller.close() } })
    const chunks: string[] = []
    for await (const value of parseDeepSeekStream(source)) chunks.push(value)
    expect(chunks).toEqual(['成功'])
  })
})
