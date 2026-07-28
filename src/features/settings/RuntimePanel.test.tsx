import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeStatus } from '../../../shared/runtime'
import { api } from '../../lib/api'
import { RuntimePanel } from './RuntimePanel'

vi.mock('../../lib/api', () => ({ api: vi.fn() }))

const mockApi = vi.mocked(api)

function status(overrides: Partial<RuntimeStatus> = {}): RuntimeStatus {
  return {
    mode: 'local',
    provider: 'ollama',
    model: 'qwen3:4b',
    configured: true,
    reachable: true,
    ...overrides,
  }
}

describe('RuntimePanel', () => {
  beforeEach(() => { mockApi.mockReset() })

  it('shows the active local runtime and model', async () => {
    mockApi.mockResolvedValue(status())

    render(<RuntimePanel />)

    expect(await screen.findByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Ollama')).toBeInTheDocument()
    expect(screen.getByText('qwen3:4b')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Ready')
    expect(mockApi).toHaveBeenCalledWith('/api/runtime', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('explains how to install a missing Ollama model', async () => {
    mockApi.mockResolvedValue(status({ configured: false }))

    render(<RuntimePanel />)

    expect(await screen.findByRole('alert')).toHaveTextContent('ollama pull qwen3:4b')
  })

  it('explains how to repair an unavailable Ollama service', async () => {
    mockApi.mockResolvedValue(status({ configured: false, reachable: false }))

    render(<RuntimePanel />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Start Ollama')
  })

  it('distinguishes cloud configuration errors from provider outages', async () => {
    mockApi.mockResolvedValueOnce(status({ mode: 'cloud', provider: 'deepseek', configured: false, reachable: true }))
    const { unmount } = render(<RuntimePanel />)
    expect(await screen.findByRole('alert')).toHaveTextContent('not configured')
    unmount()

    mockApi.mockResolvedValueOnce(status({ mode: 'cloud', provider: 'deepseek', configured: true, reachable: false }))
    render(<RuntimePanel />)
    expect(await screen.findByRole('alert')).toHaveTextContent('not reachable')
  })

  it('cancels its runtime request when unmounted', () => {
    let signal: AbortSignal | undefined
    mockApi.mockImplementation((_path, init) => {
      signal = init?.signal ?? undefined
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      })
    })

    const { unmount } = render(<RuntimePanel />)
    expect(signal?.aborted).toBe(false)

    unmount()

    expect(signal?.aborted).toBe(true)
  })
})
