import { z } from 'zod'
import { voiceSettingsWithProviderSchema } from './speech-provider'
export const voiceSettingsSchema = voiceSettingsWithProviderSchema
export const ttsRequestSchema = voiceSettingsSchema.omit({ autoRead: true }).extend({ text: z.string().trim().min(1).max(1_500) }).strict()
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = { provider: 'browser', voiceId: 'default', speed: 0.92, pitch: -1, volume: 1, autoRead: false }
