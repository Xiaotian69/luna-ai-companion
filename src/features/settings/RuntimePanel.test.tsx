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
  beforeEach(() => mockApi.mockReset())

  it('shows the active local runtime and model', async () => {
    mockApi.mockResolvedValue(status())

    render(<RuntimePanel />)

    expect(await screen.findByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Ollama')).toBeInTheDocument()
    expect(screen.getByText('qwen3:4b')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Ready')
    expect(mockApi).toHaveBeenCalledWith('/api/runtime')
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
})
