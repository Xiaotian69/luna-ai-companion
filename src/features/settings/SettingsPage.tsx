import { RotateCcw, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from '../../../shared/speech'
import { api } from '../../lib/api'
import { loadVoiceSettings, lunaAudio, saveVoiceSettings } from '../../lib/audioController'
import { RuntimePanel } from './RuntimePanel'
interface Voice { id: string; name: string; description: string }

export function SettingsPage() {
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings)
  const initialVoiceId = useRef(settings.voiceId)
  const [voices, setVoices] = useState<Voice[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ voices: Voice[] }>('/api/voices').then((value) => {
      setVoices(value.voices)
      if (value.voices.length && !value.voices.some((voice) => voice.id === initialVoiceId.current)) {
        setSettings((current) => ({ ...current, voiceId: value.voices[0].id }))
      }
    }).catch((value) => setError(value instanceof Error ? value.message : '音色列表不可用'))
  }, [])

  useEffect(() => saveVoiceSettings(settings), [settings])

  const range = (key: 'speed' | 'pitch' | 'volume', label: string, min: number, max: number, step: number) => <label className="range-row">
    <span>{label}<b>{settings[key]}</b></span>
    <input type="range" min={min} max={max} step={step} value={settings[key]} onChange={(event) => setSettings((value) => ({ ...value, [key]: Number(event.target.value) }))} />
  </label>

  return <section className="management-page">
    <header><p className="eyebrow">VOICE</p><h1>语音设置</h1><p>为你的 AI 伴侣选择声音；人物姓名、关系和性格在“我的 AI 伴侣”中单独设置。</p></header>
    <RuntimePanel />
    <div className="settings-card">
      <h2>声音</h2>
      <label>音色<select value={settings.voiceId} onChange={(event) => setSettings((value) => ({ ...value, voiceId: event.target.value }))}>{voices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name}</option>)}{!voices.length && <option value={settings.voiceId}>默认音色</option>}</select></label>
      {error && <p className="muted">{error}；仍可保留当前设置。</p>}
      {range('speed', '语速', .5, 1.5, .01)}
      {range('pitch', '音高', -12, 12, 1)}
      {range('volume', '音量', .1, 2, .1)}
      <label className="switch-row"><span>自动朗读<small>关闭时不会产生语音费用</small></span><input type="checkbox" checked={settings.autoRead} onChange={(event) => setSettings((value) => ({ ...value, autoRead: event.target.checked }))} /></label>
      <div className="row-actions"><button onClick={() => void lunaAudio.play('晚上好。别急，先坐一会儿，慢慢说。', settings)}><Volume2 size={16} />试听</button><button onClick={() => setSettings(DEFAULT_VOICE_SETTINGS)}><RotateCcw size={16} />恢复默认</button></div>
    </div>
  </section>
}
