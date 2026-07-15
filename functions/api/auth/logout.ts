import { json } from '../../_lib/http'
import { SessionRepository } from '../../_lib/repositories/sessions'
import { AuthService, clearSessionCookie, readCookie, SESSION_COOKIE } from '../../_lib/services/auth'
import type { LunaPagesFunction } from '../../_lib/types'
export const onRequestPost: LunaPagesFunction = async ({ request, env }) => { await new AuthService(new SessionRepository(env.DB), env.SESSION_SECRET).logout(readCookie(request, SESSION_COOKIE)); return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } }) }
