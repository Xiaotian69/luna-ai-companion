import { apiError, withSecurityHeaders } from './_lib/http'
import { SessionRepository } from './_lib/repositories/sessions'
import { AuthService, readCookie, SESSION_COOKIE } from './_lib/services/auth'
import type { LunaPagesFunction } from './_lib/types'

export const onRequest: LunaPagesFunction = async (context) => {
  const requestId = crypto.randomUUID()
  const path = new URL(context.request.url).pathname
  if (path.startsWith('/api/') && path !== '/api/auth/login') {
    const valid = await new AuthService(new SessionRepository(context.env.DB), context.env.SESSION_SECRET).verify(readCookie(context.request, SESSION_COOKIE))
    if (!valid) return withSecurityHeaders(apiError(401, 'AUTH_REQUIRED', '请先登录'), requestId)
  }
  try { return withSecurityHeaders(await context.next(), requestId) }
  catch { return withSecurityHeaders(apiError(500, 'INTERNAL_ERROR', '服务暂时不可用'), requestId) }
}
