import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { containsSecret, isForbiddenRepositoryPath } from './secret-scan.mjs'

const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
const files = output.toString('utf8').split('\0').filter(Boolean)
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.toml', '.yml', '.yaml', '.css', '.html', '.sql'])
const findings = []

for (const file of files) {
  if (isForbiddenRepositoryPath(file)) {
    findings.push(file)
    continue
  }
  const dot = file.lastIndexOf('.')
  if (dot < 0 || !textExtensions.has(file.slice(dot))) continue
  const content = readFileSync(file, 'utf8')
  if (containsSecret(content)) findings.push(file)
}

if (findings.length) {
  console.error(`Unsafe repository content found in: ${findings.join(', ')}`)
  process.exit(1)
}

console.log(`Secret scan passed (${files.length} repository files checked).`)
