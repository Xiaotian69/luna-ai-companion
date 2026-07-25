import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompanionProvider } from '../companion/CompanionProvider'
import { ChatPage } from './ChatPage'
import { Composer } from './Composer'

const nova = {
  displayName: 'Nova',
  avatarUrl: '',
  relationshipPreset: 'boyfriend' as const,
  customRelationship: '',
  userAddress: '小天',
  personality: '温柔但有主见',
  speakingStyle: '自然简短',
  boundaries: '不制造依赖',
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
}

afterEach(() => vi.restoreAllMocks())

describe('Composer', () => {
  it('sends with Enter and inserts a newline with Shift+Enter', async () => {
    const onSend = vi.fn()
    render(<Composer companionName="Nova" busy={false} onSend={onSend} onStop={() => undefined} />)
    const input = screen.getByLabelText('消息')
    expect(input).toHaveAttribute('placeholder', '给 Nova 发消息…')
    await userEvent.type(input, '第一行{shift>}{enter}{/shift}第二行')
    expect(input).toHaveValue('第一行\n第二行')
    await userEvent.type(input, '{enter}')
    expect(onSend).toHaveBeenCalledWith('第一行\n第二行')
  })
})

describe('ChatPage', () => {
  it('uses the saved companion name in the chat chrome', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ conversations: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    render(<CompanionProvider initialProfile={nova}><ChatPage historyOpen={false} setHistoryOpen={() => undefined} /></CompanionProvider>)

    expect(await screen.findByRole('heading', { name: 'Nova' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('给 Nova 发消息…')).toBeInTheDocument()
  })
})
