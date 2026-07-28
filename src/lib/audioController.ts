import { DEFAULT_VOICE_SETTINGS, voiceSettingsSchema, type VoiceSettings } from '../../shared/speech'
import { splitSpeechText } from './speechText'

type TtsSettings = Omit<VoiceSettings, 'autoRead'>

export interface BrowserVoice {
  id: string
  name: string
  description: string
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
}

export async function voiceCacheKey(text: string, settings: TtsSettings): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ text, ...settings }))
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...hash].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function loadVoiceSettings(): VoiceSettings {
  try {
    const value = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(localStorage.getItem('luna-voice-settings') ?? '{}') as Partial<VoiceSettings> }
    const parsed = voiceSettingsSchema.safeParse(value)
    return parsed.success ? parsed.data : DEFAULT_VOICE_SETTINGS
  } catch {
    return DEFAULT_VOICE_SETTINGS
  }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  localStorage.setItem('luna-voice-settings', JSON.stringify(settings))
}

export function browserVoices(): BrowserVoice[] {
  if (!globalThis.speechSynthesis) return []
  return globalThis.speechSynthesis.getVoices().map((voice) => ({
    id: voice.voiceURI,
    name: voice.name,
    description: `${voice.lang}${voice.localService ? ' · 系统语音' : ''}`,
  }))
}

async function speechBlob(text: string, settings: TtsSettings, signal: AbortSignal): Promise<Blob> {
  const blobs: Blob[] = []
  for (const chunk of splitSpeechText(text)) {
    throwIfAborted(signal)
    const key = await voiceCacheKey(chunk, settings)
    throwIfAborted(signal)
    const request = new Request(`${location.origin}/__luna_audio_cache/${key}`)
    const cache = typeof globalThis.caches === 'undefined' ? null : await caches.open('luna-tts-v2')
    throwIfAborted(signal)
    let response = cache ? await cache.match(request) : undefined
    throwIfAborted(signal)
    if (!response) {
      response = await fetch('/api/tts', {
        method: 'POST', credentials: 'same-origin', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk, ...settings }),
      })
      throwIfAborted(signal)
      if (!response.ok) throw new Error('语音生成暂时不可用')
      if (cache) {
        throwIfAborted(signal)
        await cache.put(request, response.clone())
        throwIfAborted(signal)
      }
    }
    const blob = await response.blob()
    throwIfAborted(signal)
    blobs.push(blob)
  }
  return new Blob(blobs, { type: blobs[0]?.type || 'audio/mpeg' })
}

export class AudioController {
  private audio: HTMLAudioElement | null = null
  private url: string | null = null
  private browserReplay: (() => void) | null = null
  private requestController: AbortController | null = null
  private generation = 0

  async play(text: string, settings = loadVoiceSettings()) {
    this.stop()
    const generation = this.generation
    const requestController = new AbortController()
    this.requestController = requestController

    if (settings.provider === 'browser') {
      const synthesizer = globalThis.speechSynthesis
      if (!synthesizer || typeof SpeechSynthesisUtterance === 'undefined') {
        this.requestController = null
        throw new Error('浏览器语音不可用，请选择本地或 MiniMax 语音')
      }
      const speak = () => {
        if (generation !== this.generation) return
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.voice = synthesizer.getVoices().find((voice) => voice.voiceURI === settings.voiceId) ?? null
        utterance.rate = settings.speed
        utterance.pitch = Math.max(0, Math.min(2, 1 + settings.pitch / 12))
        utterance.volume = Math.max(0, Math.min(1, settings.volume))
        synthesizer.speak(utterance)
      }
      this.browserReplay = speak
      this.requestController = null
      speak()
      return
    }

    try {
      const blob = await speechBlob(text, settings, requestController.signal)
      if (requestController.signal.aborted || generation !== this.generation) return
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      this.url = url
      this.audio = audio
      const release = () => this.releaseAudio(generation, audio, url)
      audio.onended = release
      audio.onerror = release
      await audio.play()
    } catch (error) {
      if (requestController.signal.aborted || generation !== this.generation) return
      this.releaseAudio(generation, this.audio, this.url)
      throw error
    } finally {
      if (this.requestController === requestController) this.requestController = null
    }
  }

  pause() {
    if (this.browserReplay && globalThis.speechSynthesis) {
      if (globalThis.speechSynthesis.paused) globalThis.speechSynthesis.resume()
      else globalThis.speechSynthesis.pause()
      return
    }
    this.audio?.pause()
  }

  replay() {
    if (this.browserReplay && globalThis.speechSynthesis) {
      globalThis.speechSynthesis.cancel()
      this.browserReplay()
      return
    }
    if (this.audio) {
      this.audio.currentTime = 0
      void this.audio.play()
    }
  }

  stop() {
    this.generation += 1
    this.requestController?.abort()
    this.requestController = null
    if (this.browserReplay && globalThis.speechSynthesis) globalThis.speechSynthesis.cancel()
    this.browserReplay = null
    this.releaseCurrentAudio()
  }

  private releaseAudio(generation: number, audio: HTMLAudioElement | null, url: string | null) {
    if (generation !== this.generation || !audio || !url || this.audio !== audio || this.url !== url) return
    this.audio = null
    this.url = null
    audio.onended = null
    audio.onerror = null
    audio.src = ''
    URL.revokeObjectURL(url)
  }

  private releaseCurrentAudio() {
    const audio = this.audio
    const url = this.url
    this.audio = null
    this.url = null
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.src = ''
    }
    if (url) URL.revokeObjectURL(url)
  }
}

export const lunaAudio = new AudioController()
