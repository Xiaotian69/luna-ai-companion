import { describe, expect, it } from 'vitest'
import { rankVoices } from './speech'

describe('voice ranking', () => {
  it('prioritizes requested Chinese feminine styles', () => {
    const voices = rankVoices([
      { voice_id: 'male', voice_name: 'Steady Man', description: ['male'] },
      { voice_id: 'wise', voice_name: 'Wise Women', description: ['Chinese Mandarin mature warm female'] },
      { voice_id: 'soft', voice_name: 'Soft Girl', description: ['Chinese Mandarin relaxed female'] },
    ])
    expect(voices.map((voice) => voice.id).slice(0, 2)).toEqual(['wise', 'soft'])
  })
})
