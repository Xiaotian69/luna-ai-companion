import { describe, expect, it } from 'vitest'
import { DeepSeekClient } from './deepseek'
import { MiniMaxClient } from './minimax'

describe('Worker API clients', () => {
  it('invokes fetch with the Worker global as this', async () => {
    const fetcher = function (this: unknown) {
      expect(this).toBe(globalThis)
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    } as typeof fetch
    await expect(new DeepSeekClient('test', fetcher).complete([{ role: 'user', content: 'hi' }])).resolves.toBe('ok')
  })
  it('preserves MiniMax business error codes without response details', async () => {
    const fetcher = (() => Promise.resolve(new Response(JSON.stringify({ base_resp: { status_code: 2056, status_msg: 'quota detail' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))) as typeof fetch
    await expect(new MiniMaxClient('test', fetcher).tts({ text: '你好', voiceId: 'voice', speed: 1, pitch: 0, volume: 1 })).rejects.toThrow('MINIMAX_2056')
  })
})
