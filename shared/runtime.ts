export type RuntimeMode = 'local' | 'cloud'
export type RuntimeProvider = 'ollama' | 'deepseek'

export interface RuntimeStatus {
  mode: RuntimeMode
  provider: RuntimeProvider
  model: string
  configured: boolean
  reachable: boolean
}
