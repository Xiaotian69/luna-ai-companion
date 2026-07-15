import { memoryCandidateSchema } from '../../../shared/memory'
import type { DeepSeekClient } from '../clients/deepseek'
import { MemoryRepository } from '../repositories/memories'

const sensitive = /身份证|护照|银行卡|密码|验证码|\b1\d{10}\b|\b\d{16,19}\b/i
export function normalizeMemory(value: string): string { return value.normalize('NFKC').toLowerCase().replace(/[\s。！？,.!?，]/g, '') }
function jsonText(value: string): string { return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim() }

export function parseMemoryCandidate(value: string) {
  try {
    const parsed = memoryCandidateSchema.parse(JSON.parse(jsonText(value)))
    const invalid = !parsed.should_save || parsed.content.length < 4 || parsed.memory_type.toLowerCase().includes('guess') || /猜测|可能是|也许是/.test(parsed.content) || sensitive.test(parsed.content)
    return { shouldSave: !invalid, memoryType: parsed.memory_type, content: parsed.content, importance: parsed.importance }
  } catch { return { shouldSave: false, memoryType: 'invalid', content: '', importance: 0 } }
}

export class MemoryExtractionService {
  constructor(private readonly client: DeepSeekClient, private readonly memories: MemoryRepository) {}
  async extract(input: { conversationId: string; sourceMessageId: string; userContent: string; assistantContent: string }): Promise<void> {
    const raw = await this.client.complete([{ role: 'system', content: '判断用户本轮是否包含稳定且未来有价值的长期记忆。不要猜测，不保存临时琐事或不必要敏感信息。只输出 JSON：{"should_save":boolean,"memory_type":string,"content":string,"importance":0到1}。' }, { role: 'user', content: `用户：${input.userContent}\nLuna：${input.assistantContent}` }])
    const candidate = parseMemoryCandidate(raw)
    if (!candidate.shouldSave) return
    const existing = await this.memories.list()
    if (existing.some((memory) => normalizeMemory(memory.content) === normalizeMemory(candidate.content))) return
    await this.memories.create({ id: crypto.randomUUID(), memoryType: candidate.memoryType, content: candidate.content, importance: candidate.importance, sourceConversationId: input.conversationId, sourceMessageId: input.sourceMessageId, now: new Date().toISOString() })
  }
}
