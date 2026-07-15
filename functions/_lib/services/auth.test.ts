import { describe, expect, it } from 'vitest'
import { AuthService, constantTimeEqual } from './auth'

class MemorySessions {
  values = new Map<string, string>()
  async create(input: { idHash: string; expiresAt: string }) { this.values.set(input.idHash, input.expiresAt) }
  async findValid(idHash: string, now: string) { const expiry = this.values.get(idHash); return expiry && expiry > now ? { id_hash: idHash } : null }
  async delete(idHash: string) { this.values.delete(idHash) }
}

describe('AuthService', () => {
  it('compares passwords without early content equality', () => {
    expect(constantTimeEqual('same-password', 'same-password')).toBe(true)
    expect(constantTimeEqual('same-password', 'wrong-password')).toBe(false)
    expect(constantTimeEqual('short', 'much-longer')).toBe(false)
  })

  it('creates, verifies and revokes a signed session cookie', async () => {
    const sessions = new MemorySessions()
    const auth = new AuthService(sessions, 'x'.repeat(32), () => new Date('2026-07-15T00:00:00Z'))
    expect(await auth.login('wrong', 'correct-password')).toBeNull()
    const token = await auth.login('correct-password', 'correct-password')
    expect(token).toMatch(/^[^.]+\.[A-Za-z0-9_-]+$/)
    expect(await auth.verify(token!)).toBe(true)
    await auth.logout(token!)
    expect(await auth.verify(token!)).toBe(false)
  })

  it('rejects a tampered signature', async () => {
    const auth = new AuthService(new MemorySessions(), 'x'.repeat(32))
    const token = await auth.login('correct-password', 'correct-password')
    expect(await auth.verify(`${token}x`)).toBe(false)
  })
})
