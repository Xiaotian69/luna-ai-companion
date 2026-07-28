import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434/v1'
const DEFAULT_MODEL = 'qwen3:4b'

function invalidConfiguration() {
  console.log('LOCAL_CONFIGURATION_INVALID: local runtime settings are missing or invalid.')
  process.exitCode = 3
}

function loadEnvironment(args) {
  const equalsArgument = args.find((argument) => argument.startsWith('--env-file='))
  const index = args.indexOf('--env-file')
  const path = equalsArgument !== undefined
    ? equalsArgument.slice('--env-file='.length)
    : index >= 0 ? args[index + 1] : undefined
  if ((equalsArgument !== undefined || index >= 0) && !path) throw new Error('ENV_FILE_ARGUMENT_MISSING')
  if (!path) return process.env
  return parseEnv(readFileSync(path, 'utf8'))
}

function configuration(env) {
  if (env.APP_MODE !== 'local' || env.CHAT_PROVIDER !== 'ollama') {
    throw new Error('LOCAL_MODE_MARKERS_INVALID')
  }
  const rawBaseUrl = env.CHAT_BASE_URL?.trim() || DEFAULT_BASE_URL
  const model = env.CHAT_MODEL?.trim() || DEFAULT_MODEL
  if (/[?#]/.test(rawBaseUrl)) throw new Error('CHAT_BASE_URL_INVALID')
  const url = new URL(rawBaseUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('CHAT_BASE_URL_INVALID')
  }
  return { baseUrl: url.toString().replace(/\/+$/, ''), model }
}

function modelIds(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.data)) return null
  const ids = []
  for (const model of value.data) {
    if (!model || typeof model !== 'object' || typeof model.id !== 'string') return null
    ids.push(model.id)
  }
  return ids
}

async function main() {
  let env
  try {
    env = loadEnvironment(process.argv.slice(2))
  } catch {
    invalidConfiguration()
    console.log('Repair: Copy .dev.vars.local.example to .dev.vars.local')
    return
  }

  let config
  try {
    config = configuration(env)
  } catch {
    invalidConfiguration()
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)
  try {
    const response = await fetch(`${config.baseUrl}/models`, { signal: controller.signal })
    if (!response.ok) {
      controller.abort()
      await response.body?.cancel().catch(() => {})
      console.log(`LOCAL_PROVIDER_REJECTED: local provider returned HTTP ${response.status}.`)
      process.exitCode = 4
      return
    }

    let body
    try {
      body = await response.json()
    } catch (error) {
      if (error?.name === 'AbortError') {
        console.log('LOCAL_PROVIDER_TIMEOUT: local provider response timed out.')
        process.exitCode = 6
        return
      }
      console.log('LOCAL_PROVIDER_INCOMPATIBLE: local provider returned an invalid models response.')
      process.exitCode = 5
      return
    }

    const models = modelIds(body)
    if (!models) {
      console.log('LOCAL_PROVIDER_INCOMPATIBLE: local provider returned an invalid models response.')
      process.exitCode = 5
    } else if (!models.includes(config.model)) {
      console.log(`LOCAL_MODEL_MISSING: configured model "${config.model}" is not installed.`)
      console.log(`Repair: ollama pull ${config.model}`)
      process.exitCode = 2
    } else {
      console.log(`LOCAL_RUNTIME_READY: ${config.model} is available.`)
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.log('LOCAL_PROVIDER_TIMEOUT: local provider request timed out.')
      process.exitCode = 6
    } else {
      console.log('LOCAL_PROVIDER_UNREACHABLE: cannot reach the configured local provider.')
      console.log('Repair: ollama serve')
      process.exitCode = 1
    }
  } finally {
    clearTimeout(timeout)
  }
}

await main()
