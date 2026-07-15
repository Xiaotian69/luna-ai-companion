export const LIMITS = {
  inputCharacters: 4_000,
  recentMessageCount: 24,
  compressionTokenThreshold: 12_000,
  compressionMinimumMessages: 12,
  relevantMemoryCount: 8,
  loginAttemptsPerTenMinutes: 10,
  chatRequestsPerMinute: 12,
  ttsRequestsPerMinute: 20,
  dailyChatRequests: 100,
  dailyTtsRequests: 100,
  dailyEstimatedTokens: 500_000,
} as const
