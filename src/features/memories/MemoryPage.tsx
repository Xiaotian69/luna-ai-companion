import { Download, PauseCircle, PlayCircle, Save, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

interface Memory {
  id: string
  memoryType: string
  content: string
  importance: number
  isActive: boolean
}

type BackupStatus = { kind: 'success' | 'error'; message: string }

function downloadFilename(response: Response): string {
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /^attachment; filename="([A-Za-z0-9._-]+)"$/.exec(disposition)
  return match?.[1] ?? 'luna-memories.json'
}

export function MemoryPage() {
  const [items, setItems] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null)

  const load = async () => {
    try {
      setItems((await api<{ memories: Memory[] }>('/api/memories')).memories)
      setError('')
    } catch (value) {
      setError(value instanceof Error ? value.message : '读取失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    api<{ memories: Memory[] }>('/api/memories')
      .then((result) => { if (active) setItems(result.memories) })
      .catch((value) => { if (active) setError(value instanceof Error ? value.message : '读取失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const update = async (memory: Memory, patch: Partial<Memory>) => {
    const next = { ...memory, ...patch }
    setItems((values) => values.map((item) => item.id === memory.id ? next : item))
    try {
      await api(`/api/memories/${memory.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: next.content, importance: next.importance, isActive: next.isActive }),
      })
    } catch {
      await load()
    }
  }

  const remove = async (id: string) => {
    await api(`/api/memories/${id}`, { method: 'DELETE' })
    setItems((values) => values.filter((item) => item.id !== id))
  }

  const exportBackup = async () => {
    setBackupBusy(true)
    setBackupStatus(null)
    try {
      const response = await fetch('/api/memories/export', { credentials: 'same-origin' })
      if (!response.ok) throw new Error('导出失败')
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = downloadFilename(response)
      anchor.click()
      URL.revokeObjectURL(url)
      setBackupStatus({ kind: 'success', message: '记忆备份已下载。' })
    } catch (value) {
      setBackupStatus({ kind: 'error', message: value instanceof Error ? value.message : '导出失败' })
    } finally {
      setBackupBusy(false)
    }
  }

  const restoreBackup = async () => {
    if (!backupFile) return
    setBackupStatus(null)
    try {
      const backup = JSON.parse(await backupFile.text()) as unknown
      if (!confirm('恢复前会验证整份备份，并跳过重复记忆。确定继续吗？')) return
      setBackupBusy(true)
      const result = await api<{ created: number; reinforced: number; skipped: number }>('/api/memories/import', {
        method: 'POST',
        body: JSON.stringify({ confirmation: true, backup }),
      })
      await load()
      setBackupStatus({
        kind: 'success',
        message: `恢复完成：新增 ${result.created} 条，强化 ${result.reinforced} 条，跳过 ${result.skipped} 条。`,
      })
    } catch (value) {
      setBackupStatus({ kind: 'error', message: value instanceof Error ? value.message : '恢复失败' })
    } finally {
      setBackupBusy(false)
    }
  }

  return <section className="management-page">
    <header>
      <p className="eyebrow">MEMORY</p>
      <h1>记忆管理</h1>
      <p>只有稳定、未来有价值的信息会保存在这里。你始终拥有最终控制权。</p>
    </header>
    {loading ? <p className="muted">正在读取记忆…</p> : error ? <p className="form-error">{error}</p> : <div className="memory-list">
      {items.map((memory) => <article className={!memory.isActive ? 'disabled' : ''} key={memory.id}>
        <div className="memory-meta"><span>{memory.memoryType}</span><span>重要度 {Math.round(memory.importance * 100)}%</span></div>
        <textarea aria-label="记忆内容" value={memory.content} onChange={(event) => setItems((values) => values.map((item) => item.id === memory.id ? { ...item, content: event.target.value } : item))} />
        <div className="row-actions">
          <button onClick={() => void update(memory, {})}><Save size={15} />保存</button>
          <button onClick={() => void update(memory, { isActive: !memory.isActive })}>{memory.isActive ? <PauseCircle size={15} /> : <PlayCircle size={15} />}{memory.isActive ? '停用' : '启用'}</button>
          <button className="danger" onClick={() => void remove(memory.id)}><Trash2 size={15} />删除</button>
        </div>
      </article>)}
      {!items.length && <div className="empty-panel">还没有长期记忆。自然聊下去就好，不必刻意提供资料。</div>}
    </div>}
    {!!items.length && <button className="text-danger" onClick={async () => {
      if (confirm('确定清空全部记忆吗？')) {
        await api('/api/memories/clear', { method: 'POST' })
        setItems([])
      }
    }}>清空全部记忆</button>}
    <details className="advanced-actions">
      <summary>高级操作</summary>
      <p className="muted">备份只包含长期记忆，不包含会话、登录信息或密钥。</p>
      <div className="row-actions">
        <button disabled={backupBusy} onClick={() => void exportBackup()}><Download size={15} />导出记忆备份</button>
        <label>
          <span>记忆备份文件</span>
          <input type="file" accept="application/json,.json" onChange={(event) => setBackupFile(event.target.files?.[0] ?? null)} />
        </label>
        <button disabled={backupBusy || !backupFile} onClick={() => void restoreBackup()}><Upload size={15} />恢复记忆备份</button>
      </div>
      {backupStatus && <p role={backupStatus.kind === 'error' ? 'alert' : 'status'} className={backupStatus.kind === 'error' ? 'form-error' : 'muted'}>{backupStatus.message}</p>}
    </details>
  </section>
}
