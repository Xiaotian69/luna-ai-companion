export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, { status })
}

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get('Content-Type') ?? ''
  if (!type.includes('application/json')) throw new Error('INVALID_CONTENT_TYPE')
  return request.json()
}

export function withSecurityHeaders(response: Response, requestId: string): Response {
  const next = new Response(response.body, response)
  next.headers.set('X-Request-Id', requestId)
  next.headers.set('X-Content-Type-Options', 'nosniff')
  next.headers.set('Referrer-Policy', 'no-referrer')
  next.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; media-src 'self' blob: data:")
  return next
}
