import type { CompanionProfile, CompanionProfileInput } from '../../../shared/companion'

interface CompanionProfileRow {
  display_name: string
  avatar_url: string
  relationship_preset: CompanionProfile['relationshipPreset']
  custom_relationship: string
  user_address: string
  personality: string
  speaking_style: string
  boundaries: string
  created_at: string
  updated_at: string
}

function map(row: CompanionProfileRow): CompanionProfile {
  return {
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    relationshipPreset: row.relationship_preset,
    customRelationship: row.custom_relationship,
    userAddress: row.user_address,
    personality: row.personality,
    speakingStyle: row.speaking_style,
    boundaries: row.boundaries,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CompanionProfileRepository {
  constructor(private readonly db: D1Database) {}

  async get(): Promise<CompanionProfile> {
    const row = await this.db.prepare('SELECT * FROM companion_profile WHERE id = 1').first<CompanionProfileRow>()
    if (!row) throw new Error('COMPANION_PROFILE_MISSING')
    return map(row)
  }

  async update(value: CompanionProfileInput, now: string): Promise<CompanionProfile> {
    await this.db.prepare(`
      UPDATE companion_profile
      SET display_name = ?, avatar_url = ?, relationship_preset = ?, custom_relationship = ?,
          user_address = ?, personality = ?, speaking_style = ?, boundaries = ?, updated_at = ?
      WHERE id = 1
    `).bind(
      value.displayName,
      value.avatarUrl,
      value.relationshipPreset,
      value.customRelationship,
      value.userAddress,
      value.personality,
      value.speakingStyle,
      value.boundaries,
      now,
    ).run()
    return this.get()
  }
}
