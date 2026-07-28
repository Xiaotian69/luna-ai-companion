import { describe, expect, it, vi } from 'vitest'
import type { MemoryRepository } from '../repositories/memories'
import type { Memory } from '../repositories/types'
import { formatMemoryExtractionTranscript, MemoryExtractionService, normalizeMemory, parseMemoryCandidate } from './memory-extraction'

const memory = (overrides: Partial<Memory> = {}): Memory => ({
  id: 'mem-existing',
  memoryType: 'preference',
  content: '用户喜欢爵士乐',
  importance: 0.7,
  category: 'about_user',
  sensitivity: 'normal',
  confidence: 0.6,
  accessCount: 0,
  lastAccessedAt: null,
  supersededMemoryId: null,
  sourceConversationId: 'conversation-1',
  sourceMessageId: 'message-1',
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
  isActive: true,
  ...overrides,
})

function repository(existing: Memory[] = []) {
  return {
    list: vi.fn(async () => existing),
    create: vi.fn(async () => undefined),
    reinforce: vi.fn(async () => true),
    replace: vi.fn(async () => true),
  }
}

const extractionJson = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  should_save: true,
  memory_type: 'preference',
  content: '用户喜欢安静的界面',
  importance: 0.8,
  category: 'about_user',
  sensitivity: 'normal',
  confidence: 0.75,
  ...overrides,
})

async function extract(raw: string, repositoryValue = repository(), confirmedSensitive = false) {
  const client = { complete: vi.fn(async () => raw) }
  const service = new MemoryExtractionService(client, repositoryValue as unknown as MemoryRepository)
  await service.extract({
    conversationId: 'conversation-1',
    sourceMessageId: 'message-1',
    userContent: '请记住',
    assistantContent: '好的',
    confirmedSensitive,
  })
  return { client, repository: repositoryValue }
}

describe('memory extraction validation', () => {
  it('accepts an explicit stable preference', () => {
    expect(parseMemoryCandidate('{"should_save":true,"memory_type":"preference","content":"用户喜欢简洁安静的界面","importance":0.8}')).toMatchObject({ shouldSave: true, memoryType: 'preference', importance: 0.8 })
  })
  it('parses category, sensitivity, confidence, and a conflict target', () => {
    expect(parseMemoryCandidate(extractionJson({ supersedes_memory_id: 'mem-old' }))).toMatchObject({
      shouldSave: true,
      category: 'about_user',
      sensitivity: 'normal',
      confidence: 0.75,
      supersedesMemoryId: 'mem-old',
    })
  })
  it.each([
    { category: 'biography' },
    { sensitivity: 'secret' },
    { confidence: -0.01 },
    { confidence: 1.01 },
  ])('rejects invalid structured metadata %o', (invalid) => {
    expect(parseMemoryCandidate(extractionJson(invalid)).shouldSave).toBe(false)
  })
  it('rejects guessed and sensitive content', () => {
    expect(parseMemoryCandidate('{"should_save":true,"memory_type":"guess","content":"猜测用户身份证号是123456789012345678","importance":0.9}').shouldSave).toBe(false)
  })
  it('normalizes content for duplicate suppression', () => {
    expect(normalizeMemory(' 用户 喜欢 Jazz。')).toBe(normalizeMemory('用户喜欢jazz'))
  })
  it('uses a neutral companion label in the extraction transcript', () => {
    const transcript = formatMemoryExtractionTranscript('你好', '晚上好')
    expect(transcript).toContain('AI 伴侣：晚上好')
    expect(transcript).not.toContain('Luna')
  })
})

describe('memory extraction privacy policy', () => {
  it.each(['intimate', 'health'] as const)('blocks %s memories without trusted caller confirmation', async (sensitivity) => {
    const result = await extract(extractionJson({ sensitivity }))
    expect(result.repository.create).not.toHaveBeenCalled()
  })

  it('does not trust a model-produced sensitive confirmation flag', async () => {
    const result = await extract(extractionJson({ sensitivity: 'health', confirmed_sensitive: true }))
    expect(result.repository.create).not.toHaveBeenCalled()
  })

  it.each(['intimate', 'health'] as const)('stores %s memories with trusted caller confirmation', async (sensitivity) => {
    const result = await extract(extractionJson({ sensitivity }), repository(), true)
    expect(result.repository.create).toHaveBeenCalledWith(expect.objectContaining({ sensitivity }))
  })

  it.each(['identity', 'payment'] as const)('always blocks %s memories even with trusted caller confirmation', async (sensitivity) => {
    const result = await extract(extractionJson({ sensitivity }), repository(), true)
    expect(result.repository.create).not.toHaveBeenCalled()
  })
})

describe('memory extraction merge policy', () => {
  it('reinforces an exact normalized duplicate instead of creating a second record', async () => {
    const memories = repository([memory({ content: '用户喜欢 Jazz' })])
    const result = await extract(extractionJson({ content: ' 用户 喜欢 JAZZ。', confidence: 0.8, importance: 0.9 }), memories)
    expect(result.repository.reinforce).toHaveBeenCalledWith('mem-existing', expect.objectContaining({ confidence: 0.8, importance: 0.9 }))
    expect(result.repository.create).not.toHaveBeenCalled()
  })

  it('replaces only an active conflict in the same category and memory type', async () => {
    const existing = memory({ id: 'mem-old', content: '用户喜欢浅色主题' })
    const memories = repository([existing])
    const result = await extract(extractionJson({ content: '用户喜欢深色主题', supersedes_memory_id: 'mem-old' }), memories)
    expect(result.repository.replace).toHaveBeenCalledWith(existing, expect.objectContaining({ supersededMemoryId: 'mem-old' }))
    expect(result.repository.create).not.toHaveBeenCalled()
  })

  it('rejects a claimed conflict target outside the same category and memory type', async () => {
    const memories = repository([memory({ id: 'mem-old', category: 'relationship' })])
    const result = await extract(extractionJson({ supersedes_memory_id: 'mem-old' }), memories)
    expect(result.repository.replace).not.toHaveBeenCalled()
    expect(result.repository.create).not.toHaveBeenCalled()
  })
})
