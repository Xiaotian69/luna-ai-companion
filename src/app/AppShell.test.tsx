import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CompanionProvider } from '../features/companion/CompanionProvider'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders the selected compact icon rail and content', () => {
    render(<MemoryRouter><CompanionProvider initialProfile={{
      displayName: 'Nova',
      avatarUrl: '',
      relationshipPreset: 'friend',
      customRelationship: '',
      userAddress: '',
      personality: '自然',
      speakingStyle: '',
      boundaries: '',
      createdAt: '',
      updatedAt: '',
    }}><AppShell onLogout={() => undefined}><p>聊天内容</p></AppShell></CompanionProvider></MemoryRouter>)
    expect(screen.getByLabelText('主导航')).toHaveClass('nav-rail')
    expect(screen.getByRole('link', { name: 'Nova 首页' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '聊天' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '我的 AI 伴侣' })).toBeInTheDocument()
    expect(screen.getByText('聊天内容')).toBeInTheDocument()
  })
})
