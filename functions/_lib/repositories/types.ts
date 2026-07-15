export type MessageRole = 'user' | 'assistant' | 'system'

export interface Conversation { id: string; title: string; createdAt: string; updatedAt: string }
export interface Message { id: string; conversationId: string; role: MessageRole; content: string; createdAt: string; tokenEstimate: number; status: 'complete' | 'interrupted' }
export interface ConversationSummary { id: string; conversationId: string; summary: string; coveredUntilMessageId: string; createdAt: string; updatedAt: string }
export interface Memory { id: string; memoryType: string; content: string; importance: number; sourceConversationId: string | null; sourceMessageId: string | null; createdAt: string; updatedAt: string; isActive: boolean }
export interface RelationshipState { familiarity: number; currentMood: string; recentEvents: string[]; updatedAt: string }
export interface DailyUsage { usageDate: string; chatCalls: number; ttsCalls: number; inputTokens: number; outputTokens: number }

export function rows<T>(result: D1Result<T>): T[] { return result.results ?? [] }
