export interface ModelMessage { role: 'system' | 'user' | 'assistant'; content: string }

export async function* parseDeepSeekStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const event of events) {
        const data = event.split('\n').find((line) => line.startsWith('data:'))?.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try { const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }; const content = parsed.choices?.[0]?.delta?.content; if (content) yield content } catch { /* ignore malformed upstream event */ }
      }
      if (done) break
    }
  } finally { reader.releaseLock() }
}

export function sseEvent(event: string, data: unknown): string { return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n` }
