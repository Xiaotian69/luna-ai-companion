import { describe, expect, it } from 'vitest'
import { withSecurityHeaders } from './http'

describe('withSecurityHeaders', () => {
  it('allows HTTPS companion avatars without relaxing other resource policies', () => {
    const response = withSecurityHeaders(new Response('ok'), 'request-1')
    const policy = response.headers.get('Content-Security-Policy')

    expect(policy).toContain("img-src 'self' data: https:")
    expect(policy).toContain("script-src 'self'")
    expect(policy).toContain("connect-src 'self'")
  })
})
