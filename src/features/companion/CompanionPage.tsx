import { Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_COMPANION_PROFILE,
  type CompanionProfile,
  type CompanionProfileInput,
  type RelationshipPreset,
} from '../../../shared/companion'
import { api } from '../../lib/api'

const relationshipOptions: Array<{ value: RelationshipPreset; label: string }> = [
  { value: 'girlfriend', label: '女友' },
  { value: 'boyfriend', label: '男友' },
  { value: 'friend', label: '朋友' },
  { value: 'custom', label: '自定义' },
]

export function CompanionPage() {
  const [profile, setProfile] = useState<CompanionProfileInput>(DEFAULT_COMPANION_PROFILE)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved'>('loading')
  const [error, setError] = useState('')
  const initial = useMemo(() => profile.displayName.trim().slice(0, 1).toUpperCase() || 'AI', [profile.displayName])

  useEffect(() => {
    api<{ companion: CompanionProfile }>('/api/companion')
      .then(({ companion }) => { setProfile(companion); setStatus('ready') })
      .catch((value) => { setError(value instanceof Error ? value.message : '伴侣设定暂时不可用'); setStatus('ready') })
  }, [])

  const update = <Key extends keyof CompanionProfileInput>(key: Key, value: CompanionProfileInput[Key]) => {
    setProfile((current) => ({ ...current, [key]: value }))
    if (status === 'saved') setStatus('ready')
  }

  const save = async () => {
    setStatus('saving')
    setError('')
    try {
      const result = await api<{ companion: CompanionProfile }>('/api/companion', { method: 'PUT', body: JSON.stringify(profile) })
      setProfile(result.companion)
      setStatus('saved')
    } catch (value) {
      setError(value instanceof Error ? value.message : '保存失败')
      setStatus('ready')
    }
  }

  return <section className="management-page">
    <header>
      <p className="eyebrow">MY AI COMPANION</p>
      <h1>我的 AI 伴侣</h1>
      <p>保留 Luna 作为默认示例，也可以自由修改名字、关系和相处方式。声音仍在语音设置中单独选择。</p>
    </header>
    <div className="settings-card companion-card">
      <div className="companion-identity">
        <div className="companion-avatar" aria-label="头像预览">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{initial}</span>}
        </div>
        <div className="companion-fields">
          <label>名字<input className="field" value={profile.displayName} onChange={(event) => update('displayName', event.target.value)} disabled={status === 'loading'} /></label>
          <label>头像 URL<input className="field" value={profile.avatarUrl} onChange={(event) => update('avatarUrl', event.target.value)} placeholder="https://example.com/avatar.png" /></label>
        </div>
      </div>
      <label>关系
        <select value={profile.relationshipPreset} onChange={(event) => update('relationshipPreset', event.target.value as RelationshipPreset)}>
          {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {profile.relationshipPreset === 'custom' && <label>自定义关系<input className="field" value={profile.customRelationship} onChange={(event) => update('customRelationship', event.target.value)} /></label>}
      <label>希望 TA 如何称呼你<input className="field" value={profile.userAddress} onChange={(event) => update('userAddress', event.target.value)} placeholder="例如：小天" /></label>
      <label>性格<textarea className="field companion-textarea" value={profile.personality} onChange={(event) => update('personality', event.target.value)} /></label>
      <details className="advanced-settings">
        <summary>高级设定</summary>
        <label>说话风格<textarea className="field companion-textarea" value={profile.speakingStyle} onChange={(event) => update('speakingStyle', event.target.value)} /></label>
        <label>相处边界<textarea className="field companion-textarea" value={profile.boundaries} onChange={(event) => update('boundaries', event.target.value)} /></label>
      </details>
      {error && <p className="form-error">{error}</p>}
      <div className="row-actions">
        <button className="primary" onClick={() => void save()} disabled={status === 'loading' || status === 'saving'}><Save size={16} />{status === 'saving' ? '保存中…' : '保存伴侣设定'}</button>
        {status === 'saved' && <span className="save-state">已保存</span>}
      </div>
    </div>
  </section>
}
