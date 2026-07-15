import { describe, expect, it } from 'vitest'
import { decodeSse } from './sse'

describe('decodeSse', () => {
  it('decodes events split across network chunks', async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('event: delta\ndata: {"content":"你')); controller.enqueue(new TextEncoder().encode('好"}\n\nevent: done\ndata: {"messageId":"m1"}\n\n')); controller.close() } })
    const events = []
    for await (const event of decodeSse(stream)) events.push(event)
    expect(events).toEqual([{ event: 'delta', data: { content: '你好' } }, { event: 'done', data: { messageId: 'm1' } }])
  })
})
