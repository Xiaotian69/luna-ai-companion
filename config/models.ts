export const MODELS = {
  chat: {
    baseUrl: 'https://api.deepseek.com',
    endpoint: '/chat/completions',
    model: 'deepseek-v4-flash',
    temperature: 0.85,
    maxTokens: 2_048,
    stream: true,
  },
  speech: {
    baseUrl: 'https://api.minimax.io',
    endpoint: '/v1/t2a_v2',
    voicesEndpoint: '/v1/get_voice',
    model: 'speech-2.8-turbo',
    speed: 0.92,
    pitch: -1,
    volume: 1,
    emotion: 'calm',
  },
} as const
