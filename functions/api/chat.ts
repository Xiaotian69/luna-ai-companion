import { LIMITS } from '../../config/limits'
import { chatRequestSchema } from '../../shared/chat'
import { sseEvent } from '../../shared/stream'
import { DeepSeekClient } from '../_lib/clients/deepseek'
import { apiError, readJson } from '../_lib/http'
import { ConversationRepository } from '../_lib/repositories/conversations'
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
  const [history, relationship, memories, summary] = await Promise.all([messages.recent(conversation.id, LIMITS.recentMessageCount), new RelationshipRepository(env.DB).get(), new MemoryRepository(env.DB).list(true), new SummaryRepository(env.DB).get(conversation.id)])
  const context = assembleContext({ relationship, memories, summary: summary?.summary ?? null, messages: history, currentInput: input.content })
  const now = new Date().toISOString()
  const userMessage = await messages.create({ id: crypto.randomUUID(), conversationId: conversation.id, role: 'user', content: input.content, tokenEstimate: estimateTokens(input.content), now })
  await conversations.touch(conversation.id, now)
  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()
  const pump = (async () => {
    let content = ''
    try {
      await writer.write(encoder.encode(sseEvent('meta', { conversationId: conversation.id, userMessageId: userMessage.id })))
      const chunks = await new DeepSeekClient(env.DEEPSEEK_API_KEY).stream(context, request.signal)
      for await (const chunk of chunks) { content += chunk; await writer.write(encoder.encode(sseEvent('delta', { content: chunk }))) }
      const assistant = await messages.create({ id: crypto.randomUUID(), conversationId: conversation.id, role: 'assistant', content, tokenEstimate: estimateTokens(content), now: new Date().toISOString() })
      await usage.increment(date, { chatCalls: 1, ttsCalls: 0, inputTokens: estimateTokens(input.content), outputTokens: estimateTokens(content) })
      const backgroundClient = new DeepSeekClient(env.DEEPSEEK_API_KEY)
      waitUntil(Promise.allSettled([
        new SummarizationService(backgroundClient, messages, new SummaryRepository(env.DB)).run(conversation.id),
        new MemoryExtractionService(backgroundClient, new MemoryRepository(env.DB)).extract({ conversationId: conversation.id, sourceMessageId: userMessage.id, userContent: input.content, assistantContent: content }),
      ]).then(() => undefined))
      await writer.write(encoder.encode(sseEvent('done', { messageId: assistant.id })))
    } catch (error) {
      if (content) await messages.create({ id: crypto.randomUUID(), conversationId: conversation.id, role: 'assistant', content, tokenEstimate: estimateTokens(content), now: new Date().toISOString(), status: 'interrupted' })
      try { await writer.write(encoder.encode(sseEvent('error', { code: request.signal.aborted ? 'ABORTED' : 'UPSTREAM_ERROR', message: request.signal.aborted ? '已停止生成' : 'Luna 暂时没有回应，请重试' }))) } catch { /* client disconnected */ }
    } finally { try { await writer.close() } catch { /* stream already closed */ } }
  })()
  waitUntil(pump)
  return new Response(stream.readable, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } })
}
