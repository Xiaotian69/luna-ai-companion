import { z } from 'zod'

export const speechProviderSchema = z.enum(['browser', 'local', 'minimax'])
export type SpeechProvider = z.infer<typeof speechProviderSchema>

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isSafeLocalTtsEndpoint(value: string, mode: 'cloud' | 'local' = 'local'): boolean {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return false
    return mode === 'local' ? loopbackHosts.has(url.hostname) : url.protocol === 'https:'
  } catch {
    return false
  }
}

export const voiceSettingsWithProviderSchema = z.object({
  provider: speechProviderSchema.default('browser'),
  voiceId: z.string().min(1).max(256),
  speed: z.number().min(0.5).max(2),
  pitch: z.number().int().min(-12).max(12),
  volume: z.number().min(0.1).max(10),
  autoRead: z.boolean().default(false),
})
