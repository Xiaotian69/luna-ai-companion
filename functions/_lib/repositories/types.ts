import type { CompanionProfile } from '../../../shared/companion'
import type { MemoryCategory, MemorySensitivity } from '../../../shared/memory'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Conversation { id: string; title: string; createdAt: string; updatedAt: string }
export interface Message { id: string; conversationId: string; role: MessageRole; content: string; createdAt: string; tokenEstimate: number; status: 'complete' | 'interrupted' }
export interface ConversationSummary { id: string; conversationId: string; summary: string; coveredUntilMessageId: string; createdAt: string; updatedAt: string }
export interface Memory { id: string; memoryType: string; content: string; importance: number; category: MemoryCategory; sensitivity: MemorySensitivity; confidence: number; accessCount: number; lastAccessedAt: string | null; supersededMemoryId: string | null; sourceConversationId: string | null; sourceMessageId: string | null; createdAt: string; updatedAt: string; isActive: boolean }
export interface RelationshipState { familiarity: number; currentMood: string; recentEvents: string[]; updatedAt: string }
export interface DailyUsage { usageDate: string; chatCalls: number; ttsCalls: number; inputTokens: number; outputTokens: number }
export type { CompanionProfile }

export function rows<T>(result: D1Result<T>): T[] { return result.results ?? [] }
