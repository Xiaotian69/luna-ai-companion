import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
const files = output.toString('utf8').split('\0').filter(Boolean)
const secretPattern = /\bsk-(?:cp-)?[A-Za-z0-9_-]{16,}\b/g
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.toml', '.yml', '.yaml', '.css', '.html', '.sql'])
const findings = []

for (const file of files) {
  const dot = file.lastIndexOf('.')
  if (dot < 0 || !textExtensions.has(file.slice(dot))) continue
  const content = readFileSync(file, 'utf8')
  if (secretPattern.test(content)) findings.push(file)
  secretPattern.lastIndex = 0
}

if (findings.length) {
  console.error(`Potential API key found in: ${findings.join(', ')}`)
  process.exit(1)
}

console.log(`Secret scan passed (${files.length} repository files checked).`)
