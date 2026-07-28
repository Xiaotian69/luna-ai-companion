import { RotateCcw, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from '../../../shared/speech'
import type { SpeechProvider } from '../../../shared/speech-provider'
import { api } from '../../lib/api'
import { browserVoices, loadVoiceSettings, lunaAudio, saveVoiceSettings } from '../../lib/audioController'
import { RuntimePanel } from './RuntimePanel'

interface Voice { id: string; name: string; description: string }
interface VoiceResponse { provider: SpeechProvider; configured: boolean; voices: Voice[] }

export function SettingsPage() {
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings)
  const [voices, setVoices] = useState<Voice[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const apply = (next: Voice[]) => {
      if (!active) return
      setVoices(next)
      if (next.length) setSettings((current) => next.some((voice) => voice.id === current.voiceId) ? current : { ...current, voiceId: next[0].id })
    }

    if (settings.provider === 'browser') {
      const refresh = () => {
        if (!active) return
        const next = browserVoices()
        apply(next)
        if (!globalThis.speechSynthesis) setError('浏览器语音不可用，请选择本地或 MiniMax 语音。')
      }
      queueMicrotask(refresh)
      globalThis.speechSynthesis?.addEventListener('voiceschanged', refresh)
      return () => {
        active = false
        globalThis.speechSynthesis?.removeEventListener('voiceschanged', refresh)
      }
    }

    api<VoiceResponse>(`/api/voices?provider=${settings.provider}`).then((value) => {
      apply(value.voices)
      if (!value.configured) setError(settings.provider === 'local' ? '本地语音端点尚未配置。' : 'MiniMax 语音尚未配置。')
    }).catch((value) => {
      if (active) setError(value instanceof Error ? value.message : '语音提供方暂时不可用。')
    })
    return () => { active = false }
  }, [settings.provider])

  useEffect(() => saveVoiceSettings(settings), [settings])

  const selectProvider = (provider: SpeechProvider) => {
    lunaAudio.stop()
    setError('')
    setVoices([])
    setSettings((current) => ({ ...current, provider, voiceId: 'default' }))
  }

  const range = (key: 'speed' | 'pitch' | 'volume', label: string, min: number, max: number, step: number) => <label className="range-row">
    <span>{label}<b>{settings[key]}</b></span>
    <input type="range" min={min} max={max} step={step} value={settings[key]} onChange={(event) => setSettings((value) => ({ ...value, [key]: Number(event.target.value) }))} />
  </label>

  const preview = async () => {
    try {
      setError('')
      await lunaAudio.play('晚上好。别急，先坐一会儿，慢慢说。', settings)
    } catch (value) {
      setError(value instanceof Error ? value.message : '语音试听暂时不可用。')
    }
  }

  return <section className="management-page">
    <header><p className="eyebrow">VOICE</p><h1>语音设置</h1><p>浏览器系统语音零安装可用；本地服务与 MiniMax 是可选增强。</p></header>
    <RuntimePanel />
    <div className="settings-card">
      <h2>声音</h2>
      <label>语音提供方<select value={settings.provider} onChange={(event) => selectProvider(event.target.value as SpeechProvider)}>
        <option value="browser">浏览器 / 系统（默认）</option>
        <option value="local">本地 TTS 服务</option>
        <option value="minimax">MiniMax（需配置）</option>
      </select></label>
      <label>音色<select value={settings.voiceId} onChange={(event) => setSettings((value) => ({ ...value, voiceId: event.target.value }))}>
        {voices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name}</option>)}
        {!voices.length && <option value={settings.voiceId}>默认音色</option>}
      </select></label>
      {error && <p className="muted" role="status">{error}</p>}
      {range('speed', '语速', .5, 1.5, .01)}
      {range('pitch', '音高', -12, 12, 1)}
      {range('volume', '音量', .1, 2, .1)}
      <label className="switch-row"><span>自动朗读<small>浏览器语音不会调用云端；本地与 MiniMax 按所选提供方生成。</small></span><input type="checkbox" checked={settings.autoRead} onChange={(event) => setSettings((value) => ({ ...value, autoRead: event.target.checked }))} /></label>
      <div className="row-actions"><button onClick={() => void preview()}><Volume2 size={16} />试听</button><button onClick={() => setSettings(DEFAULT_VOICE_SETTINGS)}><RotateCcw size={16} />恢复默认</button></div>
    </div>
  </section>
}
