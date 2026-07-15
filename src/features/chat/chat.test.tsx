import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Composer } from './Composer'

describe('Composer', () => {
  it('sends with Enter and inserts a newline with Shift+Enter', async () => {
    const onSend = vi.fn()
    render(<Composer busy={false} onSend={onSend} onStop={() => undefined} />)
    const input = screen.getByLabelText('消息')
    await userEvent.type(input, '第一行{shift>}{enter}{/shift}第二行')
    expect(input).toHaveValue('第一行\n第二行')
    await userEvent.type(input, '{enter}')
    expect(onSend).toHaveBeenCalledWith('第一行\n第二行')
  })
})
