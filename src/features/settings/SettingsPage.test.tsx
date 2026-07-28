import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { lunaAudio } from '../../lib/audioController'
import { SettingsPage } from './SettingsPage'

vi.mock('../../lib/api', () => ({ api: vi.fn() }))
vi.mock('./RuntimePanel', () => ({ RuntimePanel: () => null }))

const mockedApi = vi.mocked(api)

describe('speech provider settings', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedApi.mockReset()
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [{ name: '系统普通话', voiceURI: 'zh-local', lang: 'zh-CN', localService: true }],
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })
  })

  it('defaults to browser voices without an API request', async () => {
    render(<SettingsPage />)
    expect(screen.getByLabelText('语音提供方')).toHaveValue('browser')
    expect(await screen.findByRole('option', { name: '系统普通话' })).toBeInTheDocument()
    expect(mockedApi).not.toHaveBeenCalled()
  })

  it('refreshes safe server voice metadata when provider changes', async () => {
    mockedApi.mockResolvedValue({ provider: 'local', configured: true, voices: [{ id: 'default', name: '本地默认语音', description: 'local' }] })
    render(<SettingsPage />)
    fireEvent.change(screen.getByLabelText('语音提供方'), { target: { value: 'local' } })
    expect(await screen.findByRole('option', { name: '本地默认语音' })).toBeInTheDocument()
    expect(mockedApi).toHaveBeenCalledWith('/api/voices?provider=local')
  })

  it('shows a clear fallback when browser speech is unavailable', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    render(<SettingsPage />)
    expect(await screen.findByText(/浏览器语音不可用/)).toBeInTheDocument()
  })

  it('persists the selected provider', async () => {
    mockedApi.mockResolvedValue({ provider: 'minimax', configured: false, voices: [] })
    render(<SettingsPage />)
    fireEvent.change(screen.getByLabelText('语音提供方'), { target: { value: 'minimax' } })
    await waitFor(() => expect(JSON.parse(localStorage.getItem('luna-voice-settings') ?? '{}')).toMatchObject({ provider: 'minimax' }))
  })

  it('previews with the selected provider settings', async () => {
    const play = vi.spyOn(lunaAudio, 'play').mockResolvedValue()
    render(<SettingsPage />)
    fireEvent.click(screen.getByRole('button', { name: '试听' }))
    await waitFor(() => expect(play).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ provider: 'browser' })))
    play.mockRestore()
  })
})
