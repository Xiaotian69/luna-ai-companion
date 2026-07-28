import { z } from 'zod'

export const speechProviderSchema = z.enum(['browser', 'local', 'minimax'])
export type SpeechProvider = z.infer<typeof speechProviderSchema>

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
const specialUseTlds = new Set([
  'alt', 'arpa', 'corp', 'example', 'home', 'internal', 'invalid', 'lan',
  'local', 'localdomain', 'localhost', 'onion', 'private', 'test',
])
const fqdnLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const ordinaryTld = /^[a-z]{2,63}$/
const punycodeTld = /^xn--[a-z0-9](?:[a-z0-9-]{0,57}[a-z0-9])?$/

function isPublicFqdn(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host.length > 253 || host.endsWith('.') || host.startsWith('[') || /^\d+(?:\.\d+){3}$/.test(host)) return false
  const labels = host.split('.')
  if (labels.length < 2 || labels.some((label) => !fqdnLabel.test(label))) return false
  const tld = labels.at(-1)!
  return !specialUseTlds.has(tld) && (ordinaryTld.test(tld) || punycodeTld.test(tld))
}

export function isSafeLocalTtsEndpoint(value: string, mode: 'cloud' | 'local' = 'local'): boolean {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return false
    const loopback = loopbackHosts.has(url.hostname)
    return mode === 'local' ? loopback : url.protocol === 'https:' && !loopback && isPublicFqdn(url.hostname)
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
