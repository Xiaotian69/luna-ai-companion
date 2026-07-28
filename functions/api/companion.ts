import { companionProfileInputSchema } from '../../shared/companion'
import { apiError, json, readJson } from '../_lib/http'
import { CompanionProfileRepository } from '../_lib/repositories/companion-profile'
import type { LunaPagesFunction } from '../_lib/types'

export const onRequestGet: LunaPagesFunction = async ({ env }) => {
  return json({ companion: await new CompanionProfileRepository(env.DB).get() })
}

export const onRequestPut: LunaPagesFunction = async ({ request, env }) => {
  let input
  try {
    input = companionProfileInputSchema.parse(await readJson(request))
  } catch {
    return apiError(400, 'INVALID_COMPANION_PROFILE', '伴侣设定无效')
  }
  const companion = await new CompanionProfileRepository(env.DB).update(input, new Date().toISOString())
  return json({ companion })
}
