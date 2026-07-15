import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('submits the password without persisting it', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined)
    render(<LoginPage onLogin={onLogin} />)
    await userEvent.type(screen.getByLabelText('访问密码'), 'local-secret')
    await userEvent.click(screen.getByRole('button', { name: '进入 Luna' }))
    expect(onLogin).toHaveBeenCalledWith('local-secret')
    expect(localStorage.getItem('password')).toBeNull()
  })
})
