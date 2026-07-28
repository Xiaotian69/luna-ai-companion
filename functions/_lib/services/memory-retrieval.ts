import { LIMITS } from '../../../config/limits'
import { inferRelevantMemoryCategories, isPendingMemory } from '../../../shared/memory'
import type { UsedMemoryMetadata } from '../../../shared/stream'
import type { Memory } from '../repositories/types'

const MAX_CANDIDATES = 100
const MAX_DISPLAY_CHARACTERS = 160

export interface LocalMemoryEmbedder {
  embed(values: string[]): Promise<number[][]>
}

export interface RetrievedMemory extends Memory, UsedMemoryMetadata {}

interface RetrievalInput {
  memories: Memory[]
  query: string
  now: string
  limit?: number
  localEmbedder?: LocalMemoryEmbedder
}

function terms(value: string): Set<string> {
  const normalized = value.normalize('NFKC').toLowerCase()
  const words = normalized.match(/[a-z0-9]+|[\p{Script=Han}]/gu) ?? []
  return new Set(words)
}

function keywordRelevance(content: string, queryTerms: Set<string>): number {
  if (!queryTerms.size) return 0
  const contentTerms = terms(content)
  let overlap = 0
  for (const term of queryTerms) if (contentTerms.has(term)) overlap += 1
  return overlap / queryTerms.size
}

function categoryRelevance(memory: Memory, categories: Memory['category'][]): number {
  return categories.includes(memory.category) ? 1 : 0
}

function recency(updatedAt: string, now: string): number {
  const current = Date.parse(now)
  const updated = Date.parse(updatedAt)
  if (!Number.isFinite(current) || !Number.isFinite(updated)) return 0
  const days = Math.max(0, current - updated) / 86_400_000
  return 1 / (1 + (days / 30))
}

function cosine(left: number[], right: number[]): number {
  if (!left.length || left.length !== right.length) return 0
  let dot = 0
  let leftMagnitude = 0
  let rightMagnitude = 0
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]
    const b = right[index]
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
    dot += a * b
    leftMagnitude += a * a
    rightMagnitude += b * b
  }
  if (!leftMagnitude || !rightMagnitude) return 0
  return dot / Math.sqrt(leftMagnitude * rightMagnitude)
}

export function safeMemoryDisplayText(content: string): string {
  return [...content].map((character) => {
    const code = character.codePointAt(0) ?? 0
    return code <= 31 || code === 127 ? ' ' : character
  }).join('').replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_CHARACTERS)
}

export async function retrieveMemories(input: RetrievalInput): Promise<RetrievedMemory[]> {
  const limit = Math.max(0, Math.min(LIMITS.relevantMemoryCount, Math.floor(input.limit ?? LIMITS.relevantMemoryCount)))
  if (!limit) return []
  const queryTerms = terms(input.query)
  const relevantCategories = inferRelevantMemoryCategories(input.query)
  const candidates = input.memories
    .filter((memory) => memory.isActive)
    .map((memory) => ({
      memory,
      relevance: keywordRelevance(memory.content, queryTerms),
      category: categoryRelevance(memory, relevantCategories),
      pending: Number(isPendingMemory(memory)),
      recent: recency(memory.updatedAt, input.now),
    }))
    .sort((left, right) => right.relevance - left.relevance
      || right.category - left.category
      || right.pending - left.pending
      || right.memory.importance - left.memory.importance
      || right.recent - left.recent
      || right.memory.accessCount - left.memory.accessCount
      || left.memory.id.localeCompare(right.memory.id))
    .slice(0, MAX_CANDIDATES)
  let semanticScores = new Map<string, number>()
  if (input.localEmbedder && candidates.length) {
    try {
      const vectors = await input.localEmbedder.embed([input.query, ...candidates.map(({ memory }) => memory.content)])
      if (vectors.length === candidates.length + 1) semanticScores = new Map(candidates.map(({ memory }, index) => [memory.id, cosine(vectors[0], vectors[index + 1])]))
    } catch {
      semanticScores = new Map()
    }
  }
  return candidates
    .map((item) => ({ ...item, semantic: semanticScores.get(item.memory.id) ?? 0 }))
    .filter((item) => item.semantic > 0.2 || item.relevance > 0 || item.category > 0 || item.pending > 0)
    .sort((left, right) => right.semantic - left.semantic
      || right.relevance - left.relevance
      || right.category - left.category
      || right.pending - left.pending
      || right.memory.importance - left.memory.importance
      || right.recent - left.recent
      || right.memory.accessCount - left.memory.accessCount
      || left.memory.id.localeCompare(right.memory.id))
    .slice(0, limit)
    .map(({ memory }) => ({ ...memory, displayText: safeMemoryDisplayText(memory.content) }))
}

export function createLocalMemoryEmbedder(config: { baseUrl?: string; model?: string; fetcher?: typeof fetch; signal?: AbortSignal }): LocalMemoryEmbedder | undefined {
  if (!config.baseUrl?.trim() || !config.model?.trim()) return undefined
  let endpoint: URL
  try {
    const base = new URL(config.baseUrl)
    if (!['http:', 'https:'].includes(base.protocol) || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(base.hostname) || base.username || base.password || base.search || base.hash) return undefined
    endpoint = new URL(`${base.pathname.replace(/\/$/, '')}/embeddings`, base)
  } catch {
    return undefined
  }
  const fetcher = config.fetcher ?? fetch
  return {
    async embed(values) {
      const controller = new AbortController()
      const onAbort = () => controller.abort()
      config.signal?.addEventListener('abort', onAbort, { once: true })
      if (config.signal?.aborted) controller.abort()
      const timer = setTimeout(() => controller.abort(), 2_000)
      try {
        const response = await fetcher(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: config.model, input: values }),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Local embedding request failed')
        const body = await response.json() as { data?: Array<{ index?: number; embedding?: number[] }> }
        const ordered = [...(body.data ?? [])].sort((left, right) => (left.index ?? 0) - (right.index ?? 0)).map((item) => item.embedding)
        if (ordered.length !== values.length || ordered.some((vector) => !Array.isArray(vector))) throw new Error('Invalid local embedding response')
        return ordered as number[][]
      } finally {
        clearTimeout(timer)
        config.signal?.removeEventListener('abort', onAbort)
      }
    },
  }
}
