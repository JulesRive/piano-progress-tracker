import { describe, expect, it } from 'vitest'
import { soundfontNoteName } from './engine.ts'

describe('soundfont note names', () => {
  it('uses the flat scientific names the MIDI.js file is keyed by', () => {
    expect(soundfontNoteName(60)).toBe('C4')
    expect(soundfontNoteName(61)).toBe('Db4')
    expect(soundfontNoteName(63)).toBe('Eb4')
    expect(soundfontNoteName(66)).toBe('Gb4')
    expect(soundfontNoteName(68)).toBe('Ab4')
    expect(soundfontNoteName(70)).toBe('Bb4')
    expect(soundfontNoteName(96)).toBe('C7')
    const requested = Array.from({ length: 37 }, (_, index) => soundfontNoteName(60 + index))
    expect(requested).toContain('C4')
    expect(requested).toContain('Db4')
    expect(requested.some((name) => /^\d+$/.test(name))).toBe(false)
    expect(requested).not.toContain('C#4')
  })
})