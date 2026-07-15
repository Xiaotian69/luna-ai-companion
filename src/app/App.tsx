import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api } from '../lib/api'
import { LoginPage } from '../features/auth/LoginPage'
import { ChatPage } from '../features/chat/ChatPage'
import { MemoryPage } from '../features/memories/MemoryPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { UsagePage } from '../features/usage/UsagePage'
import { AppShell } from './AppShell'

export function App() {
  const [auth, setAuth] = useState<'loading' | 'guest' | 'ready'>('loading')
  const [historyOpen, setHistoryOpen] = useState(false)
  useEffect(() => { api('/api/auth/session').then(() => setAuth('ready')).catch(() => setAuth('guest')) }, [])
  if (auth === 'loading') return <div className="center-state"><span className="pulse-dot" />正在唤醒 Luna…</div>
  if (auth === 'guest') return <LoginPage onLogin={async (password) => { await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }); setAuth('ready') }} />
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); setAuth('guest') }
  return <AppShell onLogout={logout} onHistory={() => setHistoryOpen(true)}><Routes><Route path="/" element={<ChatPage historyOpen={historyOpen} setHistoryOpen={setHistoryOpen} />} /><Route path="/memories" element={<MemoryPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/usage" element={<UsagePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell>
}
