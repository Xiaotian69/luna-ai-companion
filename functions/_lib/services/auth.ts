const encoder = new TextEncoder()

interface Sessions {
  create(input: { idHash: string; expiresAt: string; now: string }): Promise<void>
  findValid(idHash: string, now: string): Promise<unknown | null>
  delete(idHash: string): Promise<void>
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function sha256(value: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))))
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length)
  let difference = left.length ^ right.length
  for (let index = 0; index < length; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  return difference === 0
}

export class AuthService {
  constructor(private readonly sessions: Sessions, private readonly secret: string, private readonly now = () => new Date()) {}

  private async signature(id: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', encoder.encode(this.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(id))))
  }

  async login(password: string, expectedPassword: string): Promise<string | null> {
    if (!constantTimeEqual(password, expectedPassword)) return null
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    const id = toBase64Url(bytes)
    const now = this.now()
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000)
    await this.sessions.create({ idHash: await sha256(id), now: now.toISOString(), expiresAt: expires.toISOString() })
    return `${id}.${await this.signature(id)}`
  }

  async verify(token: string | undefined): Promise<boolean> {
    if (!token) return false
    const separator = token.lastIndexOf('.')
    if (separator < 1) return false
    const id = token.slice(0, separator)
    const signature = token.slice(separator + 1)
    if (!constantTimeEqual(signature, await this.signature(id))) return false
    return (await this.sessions.findValid(await sha256(id), this.now().toISOString())) !== null
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return
    const id = token.slice(0, token.lastIndexOf('.'))
    if (id) await this.sessions.delete(await sha256(id))
  }
}

export const SESSION_COOKIE = 'luna_session'
export const sessionCookie = (token: string) => `${SESSION_COOKIE}=${token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Strict`
export const clearSessionCookie = () => `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('Cookie') ?? ''
  return header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1)
}
