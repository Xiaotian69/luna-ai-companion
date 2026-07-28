import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ttsRequestSchema } from '../../shared/speech'
import { AudioController, loadVoiceSettings, voiceCacheKey } from './audioController'

describe('voice cache keys', () => {
  it('includes the provider', async () => {
    const settings = { provider: 'local' as const, voiceId: 'wise', speed: 0.92, pitch: -1, volume: 1 }
    expect(await voiceCacheKey('hello', settings)).toBe(await voiceCacheKey('hello', { ...settings }))
    expect(await voiceCacheKey('hello', settings)).not.toBe(await voiceCacheKey('hello', { ...settings, pitch: 0 }))
    expect(await voiceCacheKey('hello', settings)).not.toBe(await voiceCacheKey('hello', { ...settings, provider: 'minimax' }))
  })
})

describe('voice setting migration', () => {
  beforeEach(() => localStorage.clear())

  it('migrates old settings to browser speech', () => {
    localStorage.setItem('luna-voice-settings', JSON.stringify({ voiceId: 'legacy', speed: 1, pitch: 0, volume: 1, autoRead: true }))
    expect(loadVoiceSettings()).toMatchObject({ provider: 'browser', voiceId: 'legacy', autoRead: true })
  })
})

describe('browser speech controller', () => {
  it('speaks entirely in the browser and maps controls', async () => {
    const utterances: Array<{ text: string; voice?: unknown; rate?: number; pitch?: number; volume?: number }> = []
    class Utterance {
      voice?: unknown; rate?: number; pitch?: number; volume?: number
      constructor(public text: string) {}
    }
    const voice = { name: 'Local Mandarin', voiceURI: 'mandarin', lang: 'zh-CN', localService: true }
    const synthesizer = {
      getVoices: vi.fn(() => [voice]), speak: vi.fn((value) => utterances.push(value)),
      pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), paused: false,
    }
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
    vi.stubGlobal('speechSynthesis', synthesizer)
    const fetcher = vi.spyOn(globalThis, 'fetch')
    const controller = new AudioController()

    await controller.play('你好', { provider: 'browser', voiceId: 'mandarin', speed: 1.2, pitch: 3, volume: 0.6, autoRead: false })
    controller.pause()
    synthesizer.paused = true
    controller.pause()
    controller.replay()
    controller.stop()

    expect(utterances[0]).toMatchObject({ text: '你好', voice, rate: 1.2, pitch: 1.25, volume: 0.6 })
    expect(synthesizer.pause).toHaveBeenCalledOnce()
    expect(synthesizer.resume).toHaveBeenCalledOnce()
    expect(synthesizer.speak).toHaveBeenCalledTimes(2)
    expect(synthesizer.cancel).toHaveBeenCalledTimes(2)
    expect(fetcher).not.toHaveBeenCalled()
    fetcher.mockRestore()
    vi.unstubAllGlobals()
  })

  it('reports browser speech as unavailable when the API is missing', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    const controller = new AudioController()
    await expect(controller.play('hello', { provider: 'browser', voiceId: 'default', speed: 1, pitch: 0, volume: 1, autoRead: false }))
      .rejects.toThrow('浏览器语音不可用')
    vi.unstubAllGlobals()
  })
})

const serviceSettings = { provider: 'local' as const, voiceId: 'default', speed: 1, pitch: 0, volume: 1, autoRead: false }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe('service speech ownership', () => {
  const audioInstances: Array<{
    src: string; currentTime: number; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>
    onended: (() => void) | null; onerror: (() => void) | null
  }> = []
  let cachePut: ReturnType<typeof vi.fn>

  beforeEach(() => {
    audioInstances.length = 0
    cachePut = vi.fn(async () => undefined)
    vi.stubGlobal('caches', { open: vi.fn(async () => ({ match: vi.fn(async () => undefined), put: cachePut })) })
    class FakeAudio {
      currentTime = 0
      play = vi.fn(async () => undefined)
      pause = vi.fn()
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(public src: string) { audioInstances.push(this) }
    }
    vi.stubGlobal('Audio', FakeAudio)
    const NativeURL = globalThis.URL
    class ObjectUrl extends NativeURL {
      static createObjectURL = vi.fn(() => `blob:${String(ObjectUrl.createObjectURL.mock.calls.length)}`)
      static revokeObjectURL = vi.fn()
    }
    vi.stubGlobal('URL', ObjectUrl)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('lets a newer play win when service responses settle out of order', async () => {
    const first = deferred<Response>()
    const second = deferred<Response>()
    const signals: AbortSignal[] = []
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signals.push(init?.signal as AbortSignal)
      return signals.length === 1 ? first.promise : second.promise
    })
    vi.stubGlobal('fetch', fetcher)
    const controller = new AudioController()

    const playA = controller.play('A', serviceSettings)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    const playB = controller.play('B', serviceSettings)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    expect(signals[0].aborted).toBe(true)
    second.resolve(new Response(new Uint8Array([2]), { headers: { 'Content-Type': 'audio/mpeg' } }))
    await playB
    first.resolve(new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/mpeg' } }))
    await expect(playA).resolves.toBeUndefined()

    expect(audioInstances).toHaveLength(1)
    expect(audioInstances[0].play).toHaveBeenCalledOnce()
    expect(cachePut).toHaveBeenCalledOnce()
  })

  it('aborts and silently discards a pending service response on stop', async () => {
    const response = deferred<Response>()
    let signal: AbortSignal | undefined
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal as AbortSignal
      return response.promise
    })
    vi.stubGlobal('fetch', fetcher)
    const controller = new AudioController()
    const pending = controller.play('pending', serviceSettings)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce())

    controller.stop()
    expect(signal?.aborted).toBe(true)
    response.resolve(new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/mpeg' } }))
    await expect(pending).resolves.toBeUndefined()
    expect(audioInstances).toHaveLength(0)
    expect(cachePut).not.toHaveBeenCalled()
  })

  it('sends only the strict TTS request settings', async () => {
    let requestBody: unknown
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body))
      return new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/mpeg' } })
    }))
    const controller = new AudioController()

    await controller.play('strict body', { ...serviceSettings, autoRead: true })

    expect(requestBody).toEqual({
      text: 'strict body', provider: 'local', voiceId: 'default', speed: 1, pitch: 0, volume: 1,
    })
    expect(() => ttsRequestSchema.parse(requestBody)).not.toThrow()
    expect(requestBody).not.toHaveProperty('autoRead')
  })

  it('cancels a pending service response when switching to browser speech', async () => {
    const response = deferred<Response>()
    let signal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal as AbortSignal
      return response.promise
    }))
    const synthesizer = { getVoices: vi.fn(() => []), speak: vi.fn(), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), paused: false }
    vi.stubGlobal('speechSynthesis', synthesizer)
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} })
    const controller = new AudioController()
    const local = controller.play('local', serviceSettings)
    await vi.waitFor(() => expect(signal).toBeDefined())

    await controller.play('browser', { ...serviceSettings, provider: 'browser' })
    expect(signal?.aborted).toBe(true)
    expect(synthesizer.speak).toHaveBeenCalledOnce()
    response.resolve(new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/mpeg' } }))
    await expect(local).resolves.toBeUndefined()
    expect(audioInstances).toHaveLength(0)
  })

  it.each(['ended', 'error'] as const)('releases the object URL on natural audio %s', async (event) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/mpeg' } })))
    const controller = new AudioController()
    await controller.play('done', serviceSettings)
    const audio = audioInstances[0]
    const url = audio.src

    if (event === 'ended') audio.onended?.()
    else audio.onerror?.()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
    expect(audio.src).toBe('')
  })

  it('does not let a stale ended callback release newer audio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'audio/mpeg' } })))
    const controller = new AudioController()
    await controller.play('first', serviceSettings)
    const staleEnded = audioInstances[0].onended
    await controller.play('second', serviceSettings)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)

    staleEnded?.()
    controller.pause()

    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(audioInstances[1].pause).toHaveBeenCalledOnce()
  })
})
