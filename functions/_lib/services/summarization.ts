import { LIMITS } from '../../../config/limits'
import { z } from 'zod'
import type { DeepSeekClient } from '../clients/deepseek'
import { MessageRepository } from '../repositories/messages'
import { SummaryRepository } from '../repositories/summaries'
import type { Message } from '../repositories/types'

const schema = z.object({ events: z.array(z.string()), user_thoughts_and_emotions: z.array(z.string()), luna_responses: z.array(z.string()), unresolved: z.array(z.string()), must_remember: z.array(z.string()), avoid_repeating: z.array(z.string()) })
export function selectCompressionBatch<T extends { id: string; tokenEstimate: number }>(messages: T[], coveredUntilMessageId: string | null, recentCount: number, threshold: number): T[] {
  const start = coveredUntilMessageId ? Math.max(0, messages.findIndex((message) => message.id === coveredUntilMessageId) + 1) : 0
  const uncovered = messages.slice(start)
  if (uncovered.reduce((total, message) => total + message.tokenEstimate, 0) <= threshold) return []
  return uncovered.slice(0, Math.max(0, uncovered.length - recentCount))
}
function render(value: z.infer<typeof schema>): string { const section = (title: string, items: string[]) => `### ${title}\n${items.length ? items.map((item) => `- ${item}`).join('\n') : '- 无'}`; return [section('发生的事', value.events), section('用户想法与情绪', value.user_thoughts_and_emotions), section('Luna 已有回应', value.luna_responses), section('尚未解决', value.unresolved), section('后续必须记住', value.must_remember), section('不应反复提起', value.avoid_repeating)].join('\n\n') }

export class SummarizationService {
  constructor(private readonly client: DeepSeekClient, private readonly messages: MessageRepository, private readonly summaries: SummaryRepository) {}
  async run(conversationId: string): Promise<void> {
    const [messages, current] = await Promise.all([this.messages.list(conversationId), this.summaries.get(conversationId)])
    const batch = selectCompressionBatch(messages, current?.coveredUntilMessageId ?? null, LIMITS.recentMessageCount, LIMITS.compressionTokenThreshold)
    if (batch.length < LIMITS.compressionMinimumMessages) return
    const raw = await this.client.complete([{ role: 'system', content: '将对话压缩为严格 JSON，字段为 events、user_thoughts_and_emotions、luna_responses、unresolved、must_remember、avoid_repeating，所有字段均为字符串数组。不要加入未发生的事实。' }, { role: 'user', content: batch.map((message: Message) => `${message.role}: ${message.content}`).join('\n') }])
    const parsed = schema.parse(JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()))
    await this.summaries.upsert({ id: current?.id ?? crypto.randomUUID(), conversationId, summary: render(parsed), coveredUntilMessageId: batch.at(-1)!.id, now: new Date().toISOString() })
  }
}
