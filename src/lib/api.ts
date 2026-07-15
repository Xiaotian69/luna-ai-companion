export class ApiError extends Error { constructor(public readonly status: number, public readonly code: string, message: string) { super(message) } }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  const body = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string } }
  if (!response.ok) throw new ApiError(response.status, body.error?.code ?? 'REQUEST_FAILED', body.error?.message ?? '请求失败')
  return body as T
}
