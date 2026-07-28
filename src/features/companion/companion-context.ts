import { createContext, useContext } from 'react'
import type { CompanionProfile, CompanionProfileInput } from '../../../shared/companion'

export type CompanionLoadState = 'loading' | 'ready' | 'error'

export interface CompanionContextValue {
  profile: CompanionProfile | null
  loadState: CompanionLoadState
  loadError: string
  reload: () => Promise<void>
  save: (input: CompanionProfileInput) => Promise<CompanionProfile>
}

export const CompanionContext = createContext<CompanionContextValue | null>(null)

export function useCompanion(): CompanionContextValue {
  const value = useContext(CompanionContext)
  if (!value) throw new Error('CompanionProvider is required')
  return value
}
