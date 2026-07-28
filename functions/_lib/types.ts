export interface Bindings {
  DB: D1Database
  DEEPSEEK_API_KEY?: string
  APP_MODE?: 'cloud' | 'local'
  CHAT_PROVIDER?: 'deepseek' | 'ollama'
  CHAT_BASE_URL?: string
  CHAT_MODEL?: string
  CHAT_API_KEY?: string
  EMBEDDING_BASE_URL?: string
  EMBEDDING_MODEL?: string
  MINIMAX_API_KEY: string
  APP_PASSWORD: string
  SESSION_SECRET: string
  ENVIRONMENT?: 'development' | 'test' | 'production'
}

export type RequestData = Record<string, unknown> & { sessionHash?: string; requestId?: string }
export type LunaPagesFunction = PagesFunction<Bindings, string, RequestData>
