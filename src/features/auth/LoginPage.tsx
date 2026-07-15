import { useState, type FormEvent } from 'react'

export function LoginPage({ onLogin }: { onLogin: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setError(''); try { await onLogin(password); setPassword('') } catch (value) { setError(value instanceof Error ? value.message : '登录失败') } finally { setLoading(false) } }
  return <main className="login-page">
    <section className="login-card" aria-labelledby="login-title">
      <div className="moon-mark">☾</div><p className="eyebrow">PRIVATE SPACE</p><h1 id="login-title">晚上好，我是 Luna</h1><p className="muted">输入访问密码，回到我们的对话。</p>
      <form onSubmit={submit}><label htmlFor="password">访问密码</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="primary" disabled={loading}>{loading ? '正在验证…' : '进入 Luna'}</button>{error && <p className="form-error" role="alert">{error}</p>}</form>
    </section>
  </main>
}
