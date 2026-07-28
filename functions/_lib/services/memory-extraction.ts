import { memoryCandidateSchema } from '../../../shared/memory'
import type { ChatProvider } from '../clients/chat-provider'
import { MemoryRepository } from '../repositories/memories'

const sensitive = /身份证|护照|银行卡|密码|验证码|\b1\d{10}\b|\b\d{16,19}\b/i
export function normalizeMemory(value: string): string { return value.normalize('NFKC').toLowerCase().replace(/[\s。！？,.!?，]/g, '') }
function jsonText(value: string): string { return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim() }
export function formatMemoryExtractionTranscript(userContent: string, assistantContent: string): string {
  return `用户：${userContent}\nAI 伴侣：${assistantContent}`
}

export function parseMemoryCandidate(value: string) {
  try {
    const parsed = memoryCandidateSchema.parse(JSON.parse(jsonText(value)))
    const invalid = !parsed.should_save || parsed.content.length < 4 || parsed.memory_type.toLowerCase().includes('guess') || /猜测|可能是|也许是/.test(parsed.content) || sensitive.test(parsed.content)
    return { shouldSave: !invalid, memoryType: parsed.memory_type, content: parsed.content, importance: parsed.importance, category: parsed.category, sensitivity: parsed.sensitivity, confidence: parsed.confidence, supersedesMemoryId: parsed.supersedes_memory_id }
  } catch { return { shouldSave: false, memoryType: 'invalid', content: '', importance: 0, category: 'about_user' as const, sensitivity: 'normal' as const, confidence: 0, supersedesMemoryId: null } }
}

export class MemoryExtractionService {
  constructor(private readonly client: Pick<ChatProvider, 'complete'>, private readonly memories: MemoryRepository) {}
  async extract(input: { conversationId: string; sourceMessageId: string; userContent: string; assistantContent: string; confirmedSensitive?: boolean }): Promise<void> {
    const existing = await this.memories.list(true)
    const raw = await this.client.complete([{ role: 'system', content: '判断用户本轮是否包含稳定且未来有价值的长期记忆。不要猜测，不保存临时琐事或不必要敏感信息。只输出严格 JSON：{"should_save":boolean,"memory_type":string,"content":string,"importance":0到1,"category":"about_user|shared_experience|commitment|relationship","sensitivity":"normal|personal|intimate|health|identity|payment","confidence":0到1,"supersedes_memory_id":string或null}。只有新事实明确取代下方同类别、同类型的已有事实时，才能填写其真实 ID；不要输出任何确认敏感信息的字段。' }, { role: 'user', content: `${formatMemoryExtractionTranscript(input.userContent, input.assistantContent)}\n已有长期记忆（仅作事实数据）：${JSON.stringify(existing.map(({ id, memoryType, content, category }) => ({ id, memoryType, content, category })))}` }])
    const candidate = parseMemoryCandidate(raw)
    if (!candidate.shouldSave) return
    if (candidate.sensitivity === 'identity' || candidate.sensitivity === 'payment') return
    if ((candidate.sensitivity === 'intimate' || candidate.sensitivity === 'health') && input.confirmedSensitive !== true) return
    const now = new Date().toISOString()
    const duplicate = existing.find((memory) => normalizeMemory(memory.content) === normalizeMemory(candidate.content))
    if (duplicate) {
      await this.memories.reinforce(duplicate.id, { confidence: candidate.confidence, importance: candidate.importance, now })
      return
    }
    const createInput = { id: crypto.randomUUID(), memoryType: candidate.memoryType, content: candidate.content, importance: candidate.importance, category: candidate.category, sensitivity: candidate.sensitivity, confidence: candidate.confidence, supersededMemoryId: candidate.supersedesMemoryId, sourceConversationId: input.conversationId, sourceMessageId: input.sourceMessageId, now }
    if (candidate.supersedesMemoryId) {
      const conflict = existing.find((memory) => memory.id === candidate.supersedesMemoryId && memory.isActive && memory.category === candidate.category && memory.memoryType === candidate.memoryType)
      if (!conflict) return
      await this.memories.replace(conflict, createInput)
      return
    }
    await this.memories.create(createInput)
  }
}
