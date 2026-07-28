import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { containsSecret, isForbiddenRepositoryPath, scanRepository } from './secret-scan.mjs'

const temporaryDirectories: string[] = []
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('public repository safety scan', () => {
  it('detects API key-shaped content without embedding a real key fixture', () => {
    const fakeKey = ['sk', 'test_1234567890abcdef'].join('-')
    expect(containsSecret(`CHAT_API_KEY=${fakeKey}`)).toBe(true)
    expect(containsSecret('CHAT_API_KEY=replace-with-your-key')).toBe(false)
    const privateKeyHeader = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ')
    expect(containsSecret(privateKeyHeader)).toBe(true)
  })

  it('ignores only the two known public credential examples used by privacy tests', () => {
    const publicOpenAiExample = ['sk', 'example1234567890'].join('-')
    const publicAwsExample = ['AKIAIOSFODNN7', 'EXAMPLE'].join('')
    const similarButUnknown = ['sk', 'example1234567891'].join('-')
    const fixturePrefixAttack = `${publicOpenAiExample}REALSECRET1234567890`
    const awsSuffixAttack = `${publicAwsExample}X`

    expect(containsSecret(`${publicOpenAiExample}\n${publicAwsExample}`)).toBe(false)
    expect(containsSecret(similarButUnknown)).toBe(true)
    expect(containsSecret(fixturePrefixAttack)).toBe(true)
    expect(containsSecret(awsSuffixAttack)).toBe(true)
  })

  it('rejects local data, model, voice, log, and visual draft paths', () => {
    expect(isForbiddenRepositoryPath('.wrangler/state/data.sqlite')).toBe(true)
    expect(isForbiddenRepositoryPath('models/qwen.gguf')).toBe(true)
    expect(isForbiddenRepositoryPath('voices/private.onnx')).toBe(true)
    expect(isForbiddenRepositoryPath('work/server.log')).toBe(true)
    expect(isForbiddenRepositoryPath('.superpowers/brainstorm/layout.html')).toBe(true)
    expect(isForbiddenRepositoryPath('.dev.vars.production')).toBe(true)
    expect(isForbiddenRepositoryPath('private.pem')).toBe(true)
    expect(isForbiddenRepositoryPath('.dev.vars.example')).toBe(false)
    expect(isForbiddenRepositoryPath('.dev.vars.local.example')).toBe(false)
    expect(isForbiddenRepositoryPath('migrations/0001_initial.sql')).toBe(false)
  })

  it('finds a secret that was deleted from the current tree but remains in Git history', () => {
    const directory = mkdtempSync(join(tmpdir(), 'companion-secret-scan-'))
    temporaryDirectories.push(directory)
    execFileSync('git', ['init', '--quiet'], { cwd: directory })
    execFileSync('git', ['config', 'user.email', 'test@example.test'], { cwd: directory })
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: directory })
    const fakeKey = ['sk', 'history_1234567890abcdef'].join('-')
    writeFileSync(join(directory, 'notes.txt'), `CHAT_API_KEY=${fakeKey}\n`)
    execFileSync('git', ['add', 'notes.txt'], { cwd: directory })
    execFileSync('git', ['commit', '--quiet', '-m', 'add notes'], { cwd: directory })
    unlinkSync(join(directory, 'notes.txt'))
    execFileSync('git', ['add', '-u'], { cwd: directory })
    execFileSync('git', ['commit', '--quiet', '-m', 'remove notes'], { cwd: directory })

    const result = scanRepository(directory)

    expect(result.findings).toContain('history:notes.txt')
    expect(result.historyObjectsChecked).toBeGreaterThan(0)
  })
})
