import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompanionProvider } from '../companion/CompanionProvider'
import { ChatPage } from './ChatPage'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'

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

  it('binds used-memory metadata to the streamed assistant reply', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/chat')) return new Response([
        'event: meta',
        'data: {"conversationId":"c1","userMessageId":"u1","usedMemories":[{"id":"m1","displayText":"用户周末想去爬山"}]}',
        '',
        'event: delta',
        'data: {"content":"一起去吧"}',
        '',
        'event: done',
        'data: {"messageId":"a1"}',
        '',
        '',
      ].join('\n'), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
      return new Response(JSON.stringify({ conversations: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetcher)

    render(<CompanionProvider initialProfile={nova}><ChatPage historyOpen={false} setHistoryOpen={() => undefined} /></CompanionProvider>)
    await userEvent.type(await screen.findByLabelText('消息'), '周末去爬山{enter}')

    expect(await screen.findByText('一起去吧')).toBeInTheDocument()
    expect(screen.getByText('本次使用的记忆').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('用户周末想去爬山')).toBeInTheDocument()
  })
})

describe('MessageBubble memory transparency', () => {
  it('shows only actually used memories in a collapsed disclosure', () => {
    render(<MessageBubble
      message={{
        id: 'a1',
        role: 'assistant',
        content: '可以，周末去爬山。',
        usedMemories: [
          { id: 'used-1', displayText: '用户周末想去爬山' },
          { id: 'used-2', displayText: '答应陪用户准备路线' },
        ],
      }}
      onDelete={() => undefined}
    />)

    const disclosure = screen.getByText('本次使用的记忆').closest('details')
    expect(disclosure).not.toHaveAttribute('open')
    expect(screen.getByText('用户周末想去爬山')).toBeInTheDocument()
    expect(screen.getByText('答应陪用户准备路线')).toBeInTheDocument()
    expect(screen.queryByText('未被注入的记忆')).not.toBeInTheDocument()
  })

  it('does not render a disclosure when no memory was injected', () => {
    render(<MessageBubble message={{ id: 'a2', role: 'assistant', content: '你好' }} onDelete={() => undefined} />)
    expect(screen.queryByText('本次使用的记忆')).not.toBeInTheDocument()
  })
})
