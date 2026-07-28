import { LIMITS } from '../../config/limits'
import { chatRequestSchema } from '../../shared/chat'
import { sseEvent, type ChatMetaEventData } from '../../shared/stream'
import { createChatProviderForRequest } from '../_lib/clients/chat-provider'
import { apiError, readJson } from '../_lib/http'
import { ConversationRepository } from '../_lib/repositories/conversations'
import { CompanionProfileRepository } from '../_lib/repositories/companion-profile'
import { MemoryRepository } from '../_lib/repositories/memories'
import { MessageRepository } from '../_lib/repositories/messages'
import { RateLimitRepository } from '../_lib/repositories/rate-limits'
import { RelationshipRepository } from '../_lib/repositories/relationship'
import { SummaryRepository } from '../_lib/repositories/summaries'
import { UsageRepository } from '../_lib/repositories/usage'
import { ConversationService } from '../_lib/services/conversations'
import { assembleContext, estimateTokens } from '../_lib/services/context'
import { UsageGuard } from '../_lib/services/guard'
import { MemoryExtractionService } from '../_lib/services/memory-extraction'
import { createLocalMemoryEmbedder, retrieveMemories } from '../_lib/services/memory-retrieval'
import { SummarizationService } from '../_lib/services/summarization'
import type { LunaPagesFunction } from '../_lib/types'

export const onRequestPost: LunaPagesFunction = async ({ request, env, waitUntil }) => {
  let input
  try { input = chatRequestSchema.parse(await readJson(request)) } catch { return apiError(400, 'INVALID_REQUEST', '消息内容无效') }
  const usage = new UsageRepository(env.DB)
  const guard = new UsageGuard(new RateLimitRepository(env.DB), usage)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
  if (!(await guard.rateLimit(`chat:${ip}`, LIMITS.chatRequestsPerMinute, 60))) return apiError(429, 'RATE_LIMITED', '发送得太快了，请稍后再试')
  const date = new Date().toISOString().slice(0, 10)
  if (!(await guard.allowChat(date))) return apiError(429, 'DAILY_LIMIT', '今日用量已达到上限')

  const conversations = new ConversationRepository(env.DB)
  const messages = new MessageRepository(env.DB)
  const conversation = await new ConversationService(conversations, messages).ensure(input.conversationId, input.content)
  const memoryRepository = new MemoryRepository(env.DB)
  const [storedHistory, companion, relationship, memories, summary] = await Promise.all([
    messages.recent(conversation.id, LIMITS.recentMessageCount),
    new CompanionProfileRepository(env.DB).get(),
    new RelationshipRepository(env.DB).get(),
    memoryRepository.listForRetrieval(),
    new SummaryRepository(env.DB).get(conversation.id),
  ])
  let effectiveContent = input.content
  let history = storedHistory
  const now = new Date().toISOString()
  let userMessage
  if (input.regenerate) {
    const userIndex = storedHistory.map((message) => message.role).lastIndexOf('user')
    const previousUser = storedHistory[userIndex]
    if (!previousUser) return apiError(400, 'NOTHING_TO_REGENERATE', '没有可重新生成的消息')
    effectiveContent = previousUser.content
    const previousAssistant = [...storedHistory.slice(userIndex + 1)].reverse().find((message) => message.role === 'assistant')
    if (previousAssistant) await messages.delete(previousAssistant.id, conversation.id)
    history = storedHistory.slice(0, userIndex)
    userMessage = previousUser
  } else {
    userMessage = await messages.create({ id: crypto.randomUUID(), conversationId: conversation.id, role: 'user', content: effectiveContent, tokenEstimate: estimateTokens(effectiveContent), now })
  }
  const selectedMemories = await retrieveMemories({
    memories,
    query: effectiveContent,
    now,
    localEmbedder: createLocalMemoryEmbedder({ baseUrl: env.EMBEDDING_BASE_URL, model: env.EMBEDDING_MODEL, signal: request.signal }),
  })
  const context = assembleContext({ companion, relationship, memories: selectedMemories, summary: summary?.summary ?? null, messages: history, currentInput: effectiveContent })
  waitUntil(memoryRepository.markAccessed(selectedMemories.map((memory) => memory.id), now).catch(() => undefined))
  await conversations.touch(conversation.id, now)
  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()
  const pump = (async () => {
    let content = ''
    try {
      const metadata: ChatMetaEventData = { conversationId: conversation.id, userMessageId: userMessage.id, usedMemories: selectedMemories.map(({ id, displayText }) => ({ id, displayText })) }
      await writer.write(encoder.encode(sseEvent('meta', metadata)))
      const chatProvider = createChatProviderForRequest(env, input)
      const chunks = await chatProvider.stream(context, request.signal)
      for await (const chunk of chunks) { content += chunk; await writer.write(encoder.encode(sseEvent('delta', { content: chunk }))) }
      const assistant = await messages.create({ id: crypto.randomUUID(), conversationId: conversation.id, role: 'assistant', content, tokenEstimate: estimateTokens(content), now: new Date().toISOString() })
      await usage.increment(date, { chatCalls: 1, ttsCalls: 0, inputTokens: estimateTokens(effectiveContent), outputTokens: estimateTokens(content) })
      waitUntil(Promise.allSettled([
        new SummarizationService(chatProvider, messages, new SummaryRepository(env.DB)).run(conversation.id),
        new MemoryExtractionService(chatProvider, memoryRepository).extract({ conversationId: conversation.id, sourceMessageId: userMessage.id, userContent: effectiveContent, assistantContent: content }),
      ]).then(() => undefined))
      await writer.write(encoder.encode(sseEvent('done', { messageId: assistant.id })))
    } catch (error) {
      console.error('chat_stream_failed', error instanceof Error ? error.message : 'unknown')
      if (content) await messages.create({ id: crypto.randomUUID(), conversationId: conversation.id, role: 'assistant', content, tokenEstimate: estimateTokens(content), now: new Date().toISOString(), status: 'interrupted' })
      try { await writer.write(encoder.encode(sseEvent('error', { code: request.signal.aborted ? 'ABORTED' : 'UPSTREAM_ERROR', message: request.signal.aborted ? '已停止生成' : `${companion.displayName} 暂时没有回应，请重试` }))) } catch { /* client disconnected */ }
    } finally { try { await writer.close() } catch { /* stream already closed */ } }
  })()
  waitUntil(pump)
  return new Response(stream.readable, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } })
}
