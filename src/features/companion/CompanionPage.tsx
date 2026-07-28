import { RefreshCw, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  type CompanionProfile,
  type CompanionProfileInput,
  type RelationshipPreset,
} from '../../../shared/companion'
import { useCompanion } from './companion-context'

const relationshipOptions: Array<{ value: RelationshipPreset; label: string }> = [
  { value: 'girlfriend', label: '女友' },
  { value: 'boyfriend', label: '男友' },
  { value: 'friend', label: '朋友' },
  { value: 'custom', label: '自定义' },
]

export function CompanionPage() {
  const { profile, loadState, loadError, reload, save } = useCompanion()

  return <section className="management-page">
    <header>
      <p className="eyebrow">MY AI COMPANION</p>
      <h1>我的 AI 伴侣</h1>
      <p>保留 Luna 作为默认示例，也可以自由修改名字、关系和相处方式。声音仍在语音设置中单独选择。</p>
    </header>
    {loadState === 'loading' && <div className="settings-card"><p className="muted">正在读取伴侣设定…</p></div>}
    {loadState === 'error' && <div className="settings-card" role="alert">
      <p className="form-error">{loadError}</p>
      <p className="muted">为避免覆盖已有档案，成功读取前不会显示或保存默认值。</p>
      <button onClick={() => void reload()}><RefreshCw size={16} />重试</button>
    </div>}
    {loadState === 'ready' && profile && <CompanionEditor key={profile.createdAt} profile={profile} onSave={save} />}
  </section>
}

function CompanionEditor({ profile: storedProfile, onSave }: { profile: CompanionProfile; onSave: (input: CompanionProfileInput) => Promise<CompanionProfile> }) {
  const [profile, setProfile] = useState<CompanionProfileInput>(storedProfile)
  const [status, setStatus] = useState<'ready' | 'saving' | 'saved'>('ready')
  const [error, setError] = useState('')
  const [avatarFailed, setAvatarFailed] = useState(false)
  const initial = useMemo(() => profile.displayName.trim().slice(0, 1).toUpperCase() || 'AI', [profile.displayName])

  const update = <Key extends keyof CompanionProfileInput>(key: Key, value: CompanionProfileInput[Key]) => {
    setProfile((current) => ({ ...current, [key]: value }))
    if (key === 'avatarUrl') setAvatarFailed(false)
    if (status === 'saved') setStatus('ready')
  }

  const save = async () => {
    setStatus('saving')
    setError('')
    try {
      const companion = await onSave(profile)
      setProfile(companion)
      setStatus('saved')
    } catch (value) {
      setError(value instanceof Error ? value.message : '保存失败')
      setStatus('ready')
    }
  }

  return <div className="settings-card companion-card">
      <div className="companion-identity">
        <div className="companion-avatar" aria-label="头像预览">
          {profile.avatarUrl && !avatarFailed ? <img src={profile.avatarUrl} alt="" onError={() => setAvatarFailed(true)} /> : <span>{initial}</span>}
        </div>
        <div className="companion-fields">
          <label>名字<input className="field" value={profile.displayName} onChange={(event) => update('displayName', event.target.value)} /></label>
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
        <button className="primary" onClick={() => void save()} disabled={status === 'saving'}><Save size={16} />{status === 'saving' ? '保存中…' : '保存伴侣设定'}</button>
        {status === 'saved' && <span className="save-state">已保存</span>}
      </div>
    </div>
}
