import { z } from 'zod'

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback)

const envSchema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1),
  MINIMAX_API_KEY: z.string().min(1),
  APP_PASSWORD: z.string().min(8),
  SESSION_SECRET: z.string().min(32),
  DB: z.custom<Record<string, unknown>>((value) => typeof value === 'object' && value !== null),
  ENVIRONMENT: z.enum(['development', 'test', 'production']).default('development'),
  DAILY_CHAT_LIMIT: positiveInt(100),
  DAILY_TTS_LIMIT: positiveInt(100),
  DAILY_TOKEN_LIMIT: positiveInt(500_000),
})

export type AppEnv = z.infer<typeof envSchema>

export function parseEnv(value: unknown): AppEnv {
  return envSchema.parse(value)
}
