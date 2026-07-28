const baseUrl = (process.env.CHAT_BASE_URL?.trim() || 'http://127.0.0.1:11434/v1').replace(/\/+$/, '')
const model = process.env.CHAT_MODEL?.trim() || 'qwen3:4b'
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 5_000)

try {
  const response = await fetch(`${baseUrl}/models`, { signal: controller.signal })
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  const body = await response.json()
  const models = Array.isArray(body?.data)
    ? body.data.flatMap((item) => typeof item?.id === 'string' ? [item.id] : [])
    : []

  if (!models.includes(model)) {
    console.log(`LOCAL_MODEL_MISSING: configured model "${model}" is not installed.`)
    console.log(`Repair: ollama pull ${model}`)
    process.exitCode = 2
  } else {
    console.log(`LOCAL_RUNTIME_READY: ${model} is available at ${baseUrl}.`)
  }
} catch {
  console.log(`LOCAL_PROVIDER_UNREACHABLE: cannot reach ${baseUrl}.`)
  console.log('Repair: ollama serve')
  process.exitCode = 1
} finally {
  clearTimeout(timeout)
}
