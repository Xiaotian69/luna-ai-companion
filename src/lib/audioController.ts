import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from '../../shared/speech'
import { splitSpeechText } from './speechText'

type TtsSettings = Omit<VoiceSettings, 'autoRead'>
export async function voiceCacheKey(text: string, settings: TtsSettings): Promise<string> { const bytes = new TextEncoder().encode(JSON.stringify({ text, ...settings })); const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); return [...hash].map((byte) => byte.toString(16).padStart(2, '0')).join('') }
export function loadVoiceSettings(): VoiceSettings { try { return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(localStorage.getItem('luna-voice-settings') ?? '{}') as Partial<VoiceSettings> } } catch { return DEFAULT_VOICE_SETTINGS } }
export function saveVoiceSettings(settings: VoiceSettings) { localStorage.setItem('luna-voice-settings', JSON.stringify(settings)) }

async function speechBlob(text: string, settings: TtsSettings): Promise<Blob> {
  const blobs: Blob[] = []
  for (const chunk of splitSpeechText(text)) {
    const key = await voiceCacheKey(chunk, settings); const request = new Request(`${location.origin}/__luna_audio_cache/${key}`); const cache = 'caches' in globalThis ? await caches.open('luna-tts-v1') : null; let response = cache ? await cache.match(request) : undefined
    if (!response) { response = await fetch('/api/tts', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: chunk, ...settings }) }); if (!response.ok) throw new Error('语音生成暂时不可用'); if (cache) await cache.put(request, response.clone()) }
    blobs.push(await response.blob())
  }
  return new Blob(blobs, { type: 'audio/mpeg' })
}

class AudioController {
  private audio: HTMLAudioElement | null = null; private url: string | null = null
  async play(text: string, settings = loadVoiceSettings()) { this.stop(); const blob = await speechBlob(text, settings); this.url = URL.createObjectURL(blob); this.audio = new Audio(this.url); await this.audio.play() }
  pause() { this.audio?.pause() }
  replay() { if (this.audio) { this.audio.currentTime = 0; void this.audio.play() } }
  stop() { if (this.audio) { this.audio.pause(); this.audio.src = ''; this.audio = null } if (this.url) { URL.revokeObjectURL(this.url); this.url = null } }
}
export const lunaAudio = new AudioController()
