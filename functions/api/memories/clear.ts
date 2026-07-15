import { json } from '../../_lib/http'
import { MemoryRepository } from '../../_lib/repositories/memories'
import type { LunaPagesFunction } from '../../_lib/types'
export const onRequestPost: LunaPagesFunction = async ({ env }) => { await new MemoryRepository(env.DB).clear(); return json({ ok: true }) }
