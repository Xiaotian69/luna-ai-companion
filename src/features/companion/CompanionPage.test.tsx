import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompanionProvider } from './CompanionProvider'
import { CompanionPage } from './CompanionPage'

const companion = {
  displayName: 'Luna',
  avatarUrl: '',
  relationshipPreset: 'friend' as const,
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
    render(<CompanionProvider><CompanionPage /></CompanionProvider>)

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

  it('does not offer a default profile for saving when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('网络不可用')))

    render(<CompanionProvider><CompanionPage /></CompanionProvider>)

    expect(await screen.findByRole('alert')).toHaveTextContent('网络不可用')
    expect(screen.queryByLabelText('名字')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存伴侣设定' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('falls back to the name initial when a remote avatar fails', () => {
    render(<CompanionProvider initialProfile={{ ...companion, avatarUrl: 'https://example.test/missing.png' }}><CompanionPage /></CompanionProvider>)
    const preview = screen.getByLabelText('头像预览')
    const image = preview.querySelector('img')
    expect(image).not.toBeNull()

    fireEvent.error(image!)

    expect(preview.querySelector('img')).toBeNull()
    expect(preview).toHaveTextContent('L')
  })
})
