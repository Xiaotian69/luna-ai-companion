export type RuntimeMode = 'local' | 'cloud'
export type RuntimeProvider = 'ollama' | 'deepseek'

export interface RuntimeStatus {
  mode: RuntimeMode
  provider: RuntimeProvider
  model: string
  /** Cloud credentials/config are present and not rejected, or the selected local model is installed. */
  configured: boolean
  /** The probe reached a usable endpoint; authentication rejections count as reachable, timeouts and 5xx do not. */
  reachable: boolean
}
