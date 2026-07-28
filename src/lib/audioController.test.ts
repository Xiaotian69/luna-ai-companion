import { beforeEach, describe, expect, it, vi } from 'vitest'
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
