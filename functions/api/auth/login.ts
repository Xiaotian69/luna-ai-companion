import { z } from 'zod'
import { apiError, json, readJson } from '../../_lib/http'
import { SessionRepository } from '../../_lib/repositories/sessions'
import { AuthService, sessionCookie } from '../../_lib/services/auth'
import type { LunaPagesFunction } from '../../_lib/types'

const inputSchema = z.object({ password: z.string().min(1).max(256) })
export const onRequestPost: LunaPagesFunction = async ({ request, env }) => {
  try {
    const input = inputSchema.parse(await readJson(request))
    const token = await new AuthService(new SessionRepository(env.DB), env.SESSION_SECRET).login(input.password, env.APP_PASSWORD)
    if (!token) return apiError(401, 'INVALID_CREDENTIALS', '密码不正确')
    return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(token) } })
  } catch { return apiError(400, 'INVALID_REQUEST', '登录请求无效') }
}
