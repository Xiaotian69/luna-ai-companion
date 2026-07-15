import { json } from '../../_lib/http'
import type { LunaPagesFunction } from '../../_lib/types'
export const onRequestGet: LunaPagesFunction = async () => json({ authenticated: true })
