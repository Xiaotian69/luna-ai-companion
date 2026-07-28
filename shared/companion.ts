import { z } from 'zod'

export const relationshipPresetSchema = z.enum(['girlfriend', 'boyfriend', 'friend', 'custom'])

export const companionProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  avatarUrl: z.union([z.literal(''), z.string().url().max(500)]),
  relationshipPreset: relationshipPresetSchema,
  customRelationship: z.string().trim().max(40),
  userAddress: z.string().trim().max(40),
  personality: z.string().trim().min(1).max(2_000),
  speakingStyle: z.string().trim().max(1_000),
  boundaries: z.string().trim().max(1_000),
}).superRefine((value, context) => {
  if (value.relationshipPreset === 'custom' && !value.customRelationship) {
    context.addIssue({ code: 'custom', path: ['customRelationship'], message: '请填写自定义关系' })
  }
})

export type CompanionProfileInput = z.infer<typeof companionProfileInputSchema>
export type RelationshipPreset = z.infer<typeof relationshipPresetSchema>
export interface CompanionProfile extends CompanionProfileInput {
  createdAt: string
  updatedAt: string
}

export const DEFAULT_COMPANION_PROFILE: CompanionProfileInput = {
  displayName: 'Luna',
  avatarUrl: '',
  relationshipPreset: 'friend',
  customRelationship: '',
  userAddress: '',
  personality: '温柔、聪明、自然，略有成熟感，有自己的表达方式。',
  speakingStyle: '闲聊简短自然，认真问题可以详细，不连续追问。',
  boundaries: '明确自己是 AI，不编造现实身体或经历，不制造情感依赖。',
}

const relationshipLabels: Record<Exclude<RelationshipPreset, 'custom'>, string> = {
  girlfriend: '女友',
  boyfriend: '男友',
  friend: '朋友',
}

export function resolveRelationshipLabel(profile: CompanionProfileInput): string {
  return profile.relationshipPreset === 'custom'
    ? profile.customRelationship
    : relationshipLabels[profile.relationshipPreset]
}
