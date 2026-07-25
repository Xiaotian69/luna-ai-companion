const keyPatterns = [
  /\bsk-(?:cp-)?[A-Za-z0-9_-]{16,}\b/,
  /\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}\b/,
  /\b(?:DEEPSEEK_API_KEY|MINIMAX_API_KEY|SESSION_SECRET|APP_PASSWORD)\s*=\s*(?!replace-|your-|example-|<)[^\s#]{12,}/i,
]

const forbiddenDirectories = /(^|\/)(?:\.superpowers|\.wrangler|work|logs?)(?:\/|$)/i
const forbiddenExtensions = /\.(?:sqlite(?:-wal|-shm)?|db|gguf|safetensors|onnx|wav|mp3|log)$/i

export function containsSecret(content) {
  return keyPatterns.some((pattern) => pattern.test(content))
}

export function isForbiddenRepositoryPath(file) {
  const normalized = file.replaceAll('\\', '/')
  return forbiddenDirectories.test(normalized) || forbiddenExtensions.test(normalized)
}
