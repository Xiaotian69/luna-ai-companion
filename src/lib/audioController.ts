import { DEFAULT_VOICE_SETTINGS, voiceSettingsSchema, type VoiceSettings } from '../../shared/speech'
import { splitSpeechText } from './speechText'

type TtsSettings = Omit<VoiceSettings, 'autoRead'>

export interface BrowserVoice {
  id: string
  name: string
  description: string
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

async function speechBlob(text: string, settings: TtsSettings): Promise<Blob> {
  const blobs: Blob[] = []
  for (const chunk of splitSpeechText(text)) {
    const key = await voiceCacheKey(chunk, settings)
    const request = new Request(`${location.origin}/__luna_audio_cache/${key}`)
    const cache = 'caches' in globalThis ? await caches.open('luna-tts-v2') : null
    let response = cache ? await cache.match(request) : undefined
    if (!response) {
      response = await fetch('/api/tts', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk, ...settings }),
      })
      if (!response.ok) throw new Error('语音生成暂时不可用')
      if (cache) await cache.put(request, response.clone())
    }
    blobs.push(await response.blob())
  }
  return new Blob(blobs, { type: blobs[0]?.type || 'audio/mpeg' })
}

export class AudioController {
  private audio: HTMLAudioElement | null = null
  private url: string | null = null
  private browserReplay: (() => void) | null = null

  async play(text: string, settings = loadVoiceSettings()) {
    this.stop()
    if (settings.provider === 'browser') {
      const synthesizer = globalThis.speechSynthesis
      if (!synthesizer || typeof SpeechSynthesisUtterance === 'undefined') throw new Error('浏览器语音不可用，请选择本地或 MiniMax 语音')
      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.voice = synthesizer.getVoices().find((voice) => voice.voiceURI === settings.voiceId) ?? null
        utterance.rate = settings.speed
        utterance.pitch = Math.max(0, Math.min(2, 1 + settings.pitch / 12))
        utterance.volume = Math.max(0, Math.min(1, settings.volume))
        synthesizer.speak(utterance)
      }
      this.browserReplay = speak
      speak()
      return
    }

    const blob = await speechBlob(text, settings)
    this.url = URL.createObjectURL(blob)
    this.audio = new Audio(this.url)
    await this.audio.play()
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
    if (this.browserReplay && globalThis.speechSynthesis) globalThis.speechSynthesis.cancel()
    this.browserReplay = null
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }
    if (this.url) {
      URL.revokeObjectURL(this.url)
      this.url = null
    }
  }
}

export const lunaAudio = new AudioController()
