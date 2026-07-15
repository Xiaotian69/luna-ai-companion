import { z } from 'zod'
export const voiceSettingsSchema = z.object({ voiceId: z.string().min(1).max(256), speed: z.number().min(0.5).max(2), pitch: z.number().int().min(-12).max(12), volume: z.number().min(0.1).max(10), autoRead: z.boolean().default(false) })
export const ttsRequestSchema = voiceSettingsSchema.omit({ autoRead: true }).extend({ text: z.string().trim().min(1).max(1_500) })
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = { voiceId: 'Chinese (Mandarin)_Warm_Bestie', speed: 0.92, pitch: -1, volume: 1, autoRead: false }
