import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompanionPage } from './CompanionPage'

const companion = {
  displayName: 'Luna',
  avatarUrl: '',
  relationshipPreset: 'friend',
  customRelationship: '',
  userAddress: '',
  personality: '温柔、聪明、自然',
  speakingStyle: '自然简短',
  boundaries: '不制造情感依赖',
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
}

afterEach(() => vi.restoreAllMocks())

describe('CompanionPage', () => {
  it('loads and saves a customizable companion profile', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ companion }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ companion: { ...companion, displayName: 'Nova' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    render(<CompanionPage />)

    const name = await screen.findByLabelText('名字')
    expect(name).toHaveValue('Luna')
    expect(screen.getByRole('option', { name: '女友' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '男友' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '朋友' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '自定义' })).toBeInTheDocument()
    expect(screen.getByText('高级设定').closest('details')).not.toHaveAttribute('open')

    await userEvent.clear(name)
    await userEvent.type(name, 'Nova')
    await userEvent.click(screen.getByRole('button', { name: '保存伴侣设定' }))

    expect(fetchMock).toHaveBeenLastCalledWith('/api/companion', expect.objectContaining({
      method: 'PUT',
      body: expect.stringContaining('"displayName":"Nova"'),
    }))
    expect(await screen.findByText('已保存')).toBeInTheDocument()
  })
})
