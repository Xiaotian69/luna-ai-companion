import { LIMITS } from '../../../config/limits'
import { LUNA_PERSONA } from '../../../config/persona'
import type { ModelMessage } from '../../../shared/stream'
import type { RelationshipState } from '../repositories/types'

interface ContextMemory { id: string; content: string; importance: number; isActive: boolean }
interface ContextMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string }

export function estimateTokens(content: string): number { return Math.ceil(content.length / 2) }

function memoryScore(memory: ContextMemory, topic: string): number {
  const topicChars = new Set([...topic].filter((char) => /[\p{Script=Han}A-Za-z0-9]/u.test(char)))
  return [...memory.content].filter((char) => topicChars.has(char)).length + memory.importance
}

export function assembleContext(input: { relationship: RelationshipState; memories: ContextMemory[]; summary: string | null; messages: ContextMessage[]; currentInput: string }): ModelMessage[] {
  const result: ModelMessage[] = [{ role: 'system', content: LUNA_PERSONA }]
  result.push({ role: 'system', content: `当前关系状态：熟悉度 ${input.relationship.familiarity.toFixed(2)}；Luna 当前情绪：${input.relationship.currentMood}；近期事件：${input.relationship.recentEvents.join('；') || '无'}` })
  const memories = input.memories.filter((memory) => memory.isActive).map((memory) => ({ memory, score: memoryScore(memory, input.currentInput) })).filter(({ score }) => score > 1).sort((a, b) => b.score - a.score).slice(0, LIMITS.relevantMemoryCount)
  if (memories.length) result.push({ role: 'system', content: `与当前话题相关的长期记忆：\n${memories.map(({ memory }) => `- ${memory.content}`).join('\n')}` })
  if (input.summary) result.push({ role: 'system', content: `当前对话较早内容摘要：\n${input.summary}` })
  result.push(...input.messages.slice(-LIMITS.recentMessageCount).map(({ role, content }) => ({ role, content })))
  result.push({ role: 'user', content: input.currentInput })
  return result
}
