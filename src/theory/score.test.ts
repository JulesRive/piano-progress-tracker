import { describe, expect, it } from 'vitest'
import { SCALES } from './music.ts'
import { accidentalState, buildScore, vexKeySignature } from './score.ts'

describe('score engraving inputs', () => {
  it('maps every key signature VexFlow can draw', () => {
    expect(vexKeySignature(0)).toBe('C')
    expect(vexKeySignature(1)).toBe('G')
    expect(vexKeySignature(6)).toBe('F#')
    expect(vexKeySignature(-1)).toBe('F')
    expect(vexKeySignature(-5)).toBe('Db')
    for (const scale of SCALES) {
      expect(buildScore(scale.id).keySignature, scale.id).toBe(vexKeySignature(scale.fifths))
    }
  })

  it('lets the signature spell E♯ in F♯ major and B♭ in F major', () => {
    const fSharp = buildScore('F#')
    expect(fSharp.events.filter((event) => event.label === 'E♯').every((event) => event.accidental === null)).toBe(true)
    const f = buildScore('F')
    expect(f.events.filter((event) => event.label === 'B♭').every((event) => event.accidental === null)).toBe(true)
    expect(buildScore('C').events.every((event) => event.accidental === null)).toBe(true)
  })

  it('prints a double sharp for the raised 7th of G♯ and D♯ harmonic minor', () => {
    expect(buildScore('G#m', 'harmonic').events.some((event) => event.label === 'F×' && event.accidental === '##')).toBe(true)
    expect(buildScore('D#m', 'harmonic').events.some((event) => event.label === 'C×' && event.accidental === '##')).toBe(true)
  })

  it('cancels melodic accidentals on the way down', () => {
    const events = buildScore('Am', 'melodic').events
    const fs = events.filter((event) => event.label.startsWith('F'))
    const gs = events.filter((event) => event.label.startsWith('G'))
    expect(fs.map((event) => event.accidental)).toEqual(['#', null, 'n', null])
    expect(gs.map((event) => event.accidental)).toEqual(['#', null, 'n', null])
    expect(events.at(-1)?.label).toBe('A')
  })

  it('writes the left hand an octave below the right, with both fingerings', () => {
    const first = buildScore('C').events[0]
    expect(first.key).toBe('c/4')
    expect(first.lhKey).toBe('c/3')
    expect(first.rhFinger).toBe(1)
    expect(first.lhFinger).toBe(5)
    expect(first.lhMidi).toBe(first.midi - 12)
  })

  it('tracks accidentals independently of pitch class spelling', () => {
    expect(accidentalState(0, [
      { letter: 'G', accidental: 1, pc: 8 },
      { letter: 'G', accidental: 1, pc: 8 },
      { letter: 'G', accidental: 0, pc: 7 },
    ])).toEqual(['#', null, 'n'])
  })
})
