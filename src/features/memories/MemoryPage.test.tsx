import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryPage } from './MemoryPage'

afterEach(() => vi.restoreAllMocks())
describe('MemoryPage', () => {
  it('shows stored memories returned by the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ memories: [{ id: 'm1', memoryType: 'preference', content: '用户喜欢简洁界面', importance: 0.8, isActive: true }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    render(<MemoryPage />)
    expect(await screen.findByText('用户喜欢简洁界面')).toBeInTheDocument()
  })
})
