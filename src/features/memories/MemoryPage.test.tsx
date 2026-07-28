import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryPage } from './MemoryPage'

const emptyList = () => new Response(JSON.stringify({ memories: [] }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(emptyList()))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('MemoryPage', () => {
  it('shows stored memories returned by the server', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ memories: [{ id: 'm1', memoryType: 'preference', content: '用户喜欢简洁界面', importance: 0.8, isActive: true }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    render(<MemoryPage />)
    expect(await screen.findByDisplayValue('用户喜欢简洁界面')).toBeInTheDocument()
  })

  it('keeps backup and restore controls collapsed under advanced actions by default', async () => {
    render(<MemoryPage />)
    await screen.findByText('还没有长期记忆。自然聊下去就好，不必刻意提供资料。')

    const summary = screen.getByText('高级操作')
    const details = summary.closest('details')
    expect(details).not.toHaveAttribute('open')
    expect(screen.getByRole('button', { name: '导出记忆备份' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '恢复记忆备份' })).toBeDisabled()
  })

  it('downloads the exported JSON using the server-provided safe filename', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:memory-backup')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    vi.mocked(fetch)
      .mockResolvedValueOnce(emptyList())
      .mockResolvedValueOnce(new Response(JSON.stringify({ schemaVersion: 1, exportedAt: '2026-07-28T00:00:00.000Z', memories: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="luna-memories-2026-07-28.json"',
        },
      }))
    render(<MemoryPage />)
    await screen.findByText('高级操作')

    await user.click(screen.getByRole('button', { name: '导出记忆备份' }))

    await waitFor(() => expect(anchorClick).toHaveBeenCalledOnce())
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:memory-backup')
    expect(vi.mocked(fetch).mock.calls[1]).toMatchObject(['/api/memories/export', { credentials: 'same-origin' }])
  })

  it('does not restore on file selection and requires an explicit confirmation', async () => {
    const user = userEvent.setup()
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    vi.mocked(fetch)
      .mockResolvedValueOnce(emptyList())
      .mockResolvedValueOnce(new Response(JSON.stringify({ created: 1, reinforced: 0, skipped: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ memories: [{ id: 'restored', memoryType: 'preference', content: '已恢复的记忆', importance: 0.7, isActive: true }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    render(<MemoryPage />)
    await screen.findByText('高级操作')
    const input = screen.getByLabelText('记忆备份文件')
    const file = new File([JSON.stringify({ schemaVersion: 1, exportedAt: '2026-07-28T00:00:00.000Z', memories: [] })], 'backup.json', { type: 'application/json' })

    fireEvent.change(input, { target: { files: [file] } })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

    const restore = screen.getByRole('button', { name: '恢复记忆备份' })
    await user.click(restore)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

    await user.click(restore)
    await screen.findByRole('status')
    expect(await screen.findByDisplayValue('已恢复的记忆')).toBeInTheDocument()
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3)
    const [, init] = vi.mocked(fetch).mock.calls[1]
    expect(JSON.parse(String(init?.body))).toMatchObject({ confirmation: true, backup: { schemaVersion: 1 } })
  })
})
