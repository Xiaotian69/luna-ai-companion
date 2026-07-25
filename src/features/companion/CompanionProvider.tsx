import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CompanionProfile, CompanionProfileInput } from '../../../shared/companion'
import { api } from '../../lib/api'
import { CompanionContext, type CompanionLoadState } from './companion-context'

function fetchCompanion() {
  return api<{ companion: CompanionProfile }>('/api/companion')
}

export function CompanionProvider({ children, initialProfile }: { children: ReactNode; initialProfile?: CompanionProfile }) {
  const [profile, setProfile] = useState<CompanionProfile | null>(initialProfile ?? null)
  const [loadState, setLoadState] = useState<CompanionLoadState>(initialProfile ? 'ready' : 'loading')
  const [loadError, setLoadError] = useState('')

  const reload = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')
    try {
      const result = await fetchCompanion()
      setProfile(result.companion)
      setLoadState('ready')
    } catch (value) {
      setProfile(null)
      setLoadError(value instanceof Error ? value.message : '伴侣设定暂时不可用')
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    if (initialProfile) return
    let active = true
    void fetchCompanion()
      .then((result) => {
        if (!active) return
        setProfile(result.companion)
        setLoadState('ready')
      })
      .catch((value) => {
        if (!active) return
        setProfile(null)
        setLoadError(value instanceof Error ? value.message : '伴侣设定暂时不可用')
        setLoadState('error')
      })
    return () => { active = false }
  }, [initialProfile])

  const save = useCallback(async (input: CompanionProfileInput) => {
    if (!profile || loadState !== 'ready') throw new Error('伴侣设定尚未成功加载，请先重试')
    const result = await api<{ companion: CompanionProfile }>('/api/companion', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    setProfile(result.companion)
    return result.companion
  }, [loadState, profile])

  const value = useMemo(() => ({ profile, loadState, loadError, reload, save }), [loadError, loadState, profile, reload, save])
  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>
}
