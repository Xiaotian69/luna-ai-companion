import { Heart, History, LogOut, MessageCircle, Moon, Settings, Sparkles, Sun, Volume2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export function AppShell({ children, onLogout, onHistory }: { children: ReactNode; onLogout: () => void; onHistory?: () => void }) {
  const [dark, setDark] = useState(() => localStorage.getItem('luna-theme') === 'dark' || (!localStorage.getItem('luna-theme') && matchMedia('(prefers-color-scheme: dark)').matches))
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('luna-theme', dark ? 'dark' : 'light') }, [dark])
  const item = (to: string, label: string, icon: ReactNode) => <NavLink to={to} aria-label={label} title={label} className={({ isActive }) => `rail-button ${isActive ? 'active' : ''}`}>{icon}</NavLink>
  return <div className="app-shell">
    <nav className="nav-rail" aria-label="主导航">
      <NavLink to="/" className="brand-orb" aria-label="Luna 首页"><Sparkles size={18} /></NavLink>
      <button className="rail-button" aria-label="历史对话" title="历史对话" onClick={onHistory}><History size={19} /></button>
      {item('/', '聊天', <MessageCircle size={19} />)}
      {item('/companion', '我的 AI 伴侣', <Heart size={19} />)}
      {item('/memories', '记忆', <Moon size={19} />)}
      {item('/settings', '语音设置', <Volume2 size={19} />)}
      {item('/usage', '用量', <Settings size={19} />)}
      <span className="rail-spacer" />
      <button className="rail-button" aria-label="切换主题" title="切换主题" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
      <button className="rail-button" aria-label="退出登录" title="退出登录" onClick={onLogout}><LogOut size={19} /></button>
    </nav>
    <main className="app-main">{children}</main>
  </div>
}
