import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_COMPANION_PROFILE } from '../../../shared/companion'
import { CompanionProfileRepository } from './companion-profile'

let mf: Miniflare
let db: D1Database

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: 'export default { fetch(){ return new Response("ok") } }', d1Databases: { DB: 'companion-test' } })
  db = await mf.getD1Database('DB')
  for (const name of ['0001_initial.sql', '0002_companion_profile.sql']) {
    const migration = await readFile(join(process.cwd(), 'migrations', name), 'utf8')
    for (const statement of migration.split(';').map((part) => part.trim()).filter(Boolean)) {
      await db.prepare(statement).run()
    }
  }
})

afterAll(() => mf.dispose())

describe('CompanionProfileRepository', () => {
  it('returns the default singleton profile', async () => {
    expect(await new CompanionProfileRepository(db).get()).toMatchObject(DEFAULT_COMPANION_PROFILE)
  })

  it('updates every editable field and timestamps the row', async () => {
    const repository = new CompanionProfileRepository(db)
    const updated = await repository.update({
      displayName: 'Nova',
      avatarUrl: 'https://example.com/nova.png',
      relationshipPreset: 'custom',
      customRelationship: '灵魂搭档',
      userAddress: '小天',
      personality: '温柔但有主见',
      speakingStyle: '自然简短',
      boundaries: '不制造情感依赖',
    }, '2026-07-25T12:00:00.000Z')
    expect(updated).toMatchObject({
      displayName: 'Nova',
      relationshipPreset: 'custom',
      customRelationship: '灵魂搭档',
      updatedAt: '2026-07-25T12:00:00.000Z',
    })
  })
})
