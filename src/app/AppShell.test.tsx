import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders the selected compact icon rail and content', () => {
    render(<MemoryRouter><AppShell onLogout={() => undefined}><p>聊天内容</p></AppShell></MemoryRouter>)
    expect(screen.getByLabelText('主导航')).toHaveClass('nav-rail')
    expect(screen.getByRole('link', { name: '聊天' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '我的 AI 伴侣' })).toBeInTheDocument()
    expect(screen.getByText('聊天内容')).toBeInTheDocument()
  })
})
