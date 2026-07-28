import { useEffect, useState } from 'react'
import type { RuntimeStatus } from '../../../shared/runtime'
import { api } from '../../lib/api'

function providerLabel(provider: RuntimeStatus['provider']): string {
  return provider === 'ollama' ? 'Ollama' : 'DeepSeek'
}

function repairText(status: RuntimeStatus): string | null {
  if (status.configured && status.reachable) return null
  if (status.provider === 'ollama' && !status.reachable) return 'Ollama is not running. Start Ollama, then reopen this page.'
  if (status.provider === 'ollama') return `Model is not installed. Run ollama pull ${status.model}, then reopen this page.`
  if (!status.configured) return 'Cloud chat is not configured. Add a valid API key to the Worker environment.'
  return 'Cloud chat is not reachable. Check the provider status and network connection.'
}

export function RuntimePanel() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api<RuntimeStatus>('/api/runtime')
      .then((value) => { if (active) setStatus(value) })
      .catch((value) => { if (active) setError(value instanceof Error ? value.message : 'Runtime status is unavailable.') })
    return () => { active = false }
  }, [])

  const repair = status ? repairText(status) : null
  return <section className="settings-card runtime-panel" aria-labelledby="runtime-heading">
    <h2 id="runtime-heading">Runtime</h2>
    {!status && !error && <p className="muted" role="status">Checking runtime…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {status && <>
      <dl className="runtime-details">
        <div><dt>Mode</dt><dd>{status.mode === 'local' ? 'Local' : 'Cloud'}</dd></div>
        <div><dt>Provider</dt><dd>{providerLabel(status.provider)}</dd></div>
        <div><dt>Model</dt><dd>{status.model}</dd></div>
      </dl>
      {repair ? <p className="runtime-repair" role="alert">{repair}</p> : <p className="runtime-ready" role="status">Ready</p>}
    </>}
  </section>
}
