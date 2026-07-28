import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_COMPANION_PROFILE } from '../../shared/companion'
import { onRequestPut } from './companion'

function request(body: unknown) {
  return new Request('https://example.test/api/companion', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/companion', () => {
  it('returns 400 for an invalid companion profile', async () => {
    const response = await onRequestPut({
      request: request({ ...DEFAULT_COMPANION_PROFILE, displayName: '' }),
      env: { DB: {} },
    } as never)

    expect(response).toBeInstanceOf(Response)
    expect((response as Response).status).toBe(400)
  })

  it('does not disguise a database failure as invalid user input', async () => {
    const run = vi.fn().mockRejectedValue(new Error('DB_DOWN'))
    const db = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({ run })),
      })),
    }

    await expect(onRequestPut({
      request: request(DEFAULT_COMPANION_PROFILE),
      env: { DB: db },
    } as never)).rejects.toThrow('DB_DOWN')
  })
})
