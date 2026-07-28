import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const keyPatterns = [
  /\bsk-(?:cp-)?[A-Za-z0-9_-]{16,}\b/,
  /\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}\b/,
  /\b(?:DEEPSEEK_API_KEY|MINIMAX_API_KEY|SESSION_SECRET|APP_PASSWORD)\s*=\s*(?!replace-|your-|example-|<)[^\s#]{12,}/i,
  /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/,
  /\bAKIA[A-Z0-9]{16,}\b/,
]

// Public documentation placeholders used by privacy tests. Keep these fragmented so
// the scanner still detects every other credential-shaped value, including in history.
const knownPublicFixtures = [
  ['sk', 'example1234567890'].join('-'),
  ['AKIAIOSFODNN7', 'EXAMPLE'].join(''),
]

const forbiddenDirectories = /(^|\/)(?:\.superpowers|\.wrangler|work|logs?)(?:\/|$)/i
const forbiddenExtensions = /\.(?:sqlite(?:-wal|-shm)?|db|gguf|safetensors|onnx|wav|mp3|log|pem|key|p12|pfx)$/i
const safeEnvironmentExamples = /^\.(?:env|dev\.vars)(?:\.[a-z0-9_-]+)*\.(?:example|sample|template)$/i
const environmentFiles = /^\.(?:env|dev\.vars)(?:\.|$)/i

export function containsSecret(content) {
  const sanitized = content.replace(/\b(?:sk-(?:cp-)?[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16,})\b/g, (token) => knownPublicFixtures.includes(token) ? '' : token)
  return keyPatterns.some((pattern) => pattern.test(sanitized))
}

export function isForbiddenRepositoryPath(file) {
  const normalized = file.replaceAll('\\', '/')
  const name = normalized.split('/').at(-1) ?? normalized
  const unsafeEnvironmentFile = environmentFiles.test(name) && !safeEnvironmentExamples.test(name)
  return forbiddenDirectories.test(normalized) || forbiddenExtensions.test(normalized) || unsafeEnvironmentFile
}

function git(repository, args, encoding = 'utf8') {
  return execFileSync('git', args, { cwd: repository, encoding, maxBuffer: 64 * 1024 * 1024 })
}

function isText(buffer) {
  return !buffer.includes(0)
}

export function scanRepository(repository = process.cwd()) {
  const findings = new Set()
  const currentOutput = git(repository, ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
  const files = currentOutput.split('\0').filter(Boolean)

  for (const file of files) {
    if (isForbiddenRepositoryPath(file)) findings.add(file)
    const content = readFileSync(resolve(repository, file))
    if (isText(content) && containsSecret(content.toString('utf8'))) findings.add(file)
  }

  const objectsOutput = git(repository, ['rev-list', '--objects', '--all'])
  const objectEntries = objectsOutput.split(/\r?\n/).filter(Boolean)
  const objectIds = [...new Set(objectEntries.map((entry) => entry.split(' ', 1)[0]))]
  const typeOutput = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
    cwd: repository,
    encoding: 'utf8',
    input: objectIds.join('\n'),
    maxBuffer: 64 * 1024 * 1024,
  })
  const blobIds = new Set(typeOutput.split(/\r?\n/).filter((line) => line.endsWith(' blob')).map((line) => line.split(' ', 1)[0]))
  const checkedObjects = new Set()
  let historyObjectsChecked = 0
  for (const entry of objectEntries) {
    const separator = entry.indexOf(' ')
    const objectId = separator < 0 ? entry : entry.slice(0, separator)
    const path = separator < 0 ? '' : entry.slice(separator + 1)
    if (path && isForbiddenRepositoryPath(path)) findings.add(`history:${path}`)
    if (checkedObjects.has(objectId) || !blobIds.has(objectId)) continue
    checkedObjects.add(objectId)
    const content = git(repository, ['cat-file', 'blob', objectId], null)
    if (!isText(content)) continue
    historyObjectsChecked += 1
    if (containsSecret(content.toString('utf8'))) findings.add(`history:${path || objectId}`)
  }

  return {
    filesChecked: files.length,
    historyObjectsChecked,
    findings: [...findings].sort(),
  }
}
