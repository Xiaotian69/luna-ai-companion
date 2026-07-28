import { z } from 'zod'

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback)
const httpUrl = z.string().trim().refine((value) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !/[?#]/.test(value)
  } catch { return false }
}, 'Chat base URL must be a valid HTTP or HTTPS URL')

export const chatProviderEnvSchema = z.object({
  DEEPSEEK_API_KEY: z.string().trim().min(1).optional(),
  APP_MODE: z.enum(['cloud', 'local']).default('cloud'),
  CHAT_PROVIDER: z.enum(['deepseek', 'ollama']).optional(),
  CHAT_BASE_URL: httpUrl.optional(),
  CHAT_MODEL: z.string().trim().min(1).optional(),
  CHAT_API_KEY: z.string().optional(),
}).superRefine((env, context) => {
  const provider = env.CHAT_PROVIDER ?? 'deepseek'
  if (provider !== 'ollama' && !env.CHAT_API_KEY?.trim() && !env.DEEPSEEK_API_KEY) {
    context.addIssue({ code: 'custom', path: ['CHAT_API_KEY'], message: 'API key is required for cloud chat providers' })
  }
})

const applicationEnvSchema = z.object({
  MINIMAX_API_KEY: z.string().min(1),
  APP_PASSWORD: z.string().min(8),
  SESSION_SECRET: z.string().min(32),
  DB: z.custom<Record<string, unknown>>((value) => typeof value === 'object' && value !== null),
  ENVIRONMENT: z.enum(['development', 'test', 'production']).default('development'),
  DAILY_CHAT_LIMIT: positiveInt(100),
  DAILY_TTS_LIMIT: positiveInt(100),
  DAILY_TOKEN_LIMIT: positiveInt(500_000),
})

const envSchema = z.intersection(chatProviderEnvSchema, applicationEnvSchema)

export type AppEnv = z.infer<typeof envSchema>

export function parseEnv(value: unknown): AppEnv {
  return envSchema.parse(value)
}

export function parseChatProviderEnv(value: unknown): z.infer<typeof chatProviderEnvSchema> {
  return chatProviderEnvSchema.parse(value)
}
