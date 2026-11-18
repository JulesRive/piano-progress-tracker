import { describe, expect, it } from 'vitest'
import { noteLabel } from './music.ts'
import {
  SHARP_ORDER,
  FLAT_ORDER,
  addToSeven,
  addedAccidental,
  chordMap,
  clockwiseMajor,
  counterMajor,
  differentPitchCount,
  fifthsApart,
  keyNamedBySignature,
  lowerTetrachord,
  majors,
  minors,
  mixesSharpAndFlat,
  octaveNotes,
  parallelMajor,
  samePitches,
  scalePitchClasses,
  sharesStandardMajorFingering,
  stepKinds,
  stepText,
  upperTetrachord,
  usesEachLetterOnce,
} from './facts.ts'
import { MAJOR_STEPS, NATURAL_STEPS, HARMONIC_STEPS, MELODIC_STEPS } from './music.ts'

describe('major scale construction', () => {
  it('uses tone-tone-semitone twice, joined by a tone', () => {
    expect(stepKinds(MAJOR_STEPS).map(stepText)).toEqual(['T', 'T', 'S', 'T', 'T', 'T', 'S'])
    for (const scale of majors()) {
      const notes = octaveNotes(scale.id)
      expect(usesEachLetterOnce(notes), scale.id).toBe(true)
      expect(mixesSharpAndFlat(notes), scale.id).toBe(false)
      expect(samePitches(upperTetrachord(scale.id), lowerTetrachord(clockwiseMajor(scale.id).id)), scale.id).toBe(true)
    }
  })

  it('spells F major with B♭ and F♯ major with E♯', () => {
    expect(octaveNotes('F').slice(0, 7).map(noteLabel).join(' ')).toBe('F G A B♭ C D E')
    expect(octaveNotes('F#').slice(0, 7).map(noteLabel).join(' ')).toBe('F♯ G♯ A♯ B C♯ D♯ E♯')
  })
})

describe('key signatures', () => {
  it('lists flats as the reverse of the sharps', () => {
    expect(FLAT_ORDER).toEqual([...SHARP_ORDER].reverse())
    expect(SHARP_ORDER.join(' ')).toBe('F C G D A E B')
  })

  it('names every major from its signature shortcut', () => {
    for (const scale of majors()) {
      expect(keyNamedBySignature(scale.fifths)?.id, scale.id).toBe(scale.id)
    }
  })

  it('adds to 7 for each letter that has both a sharp key and a flat key', () => {
    expect(addToSeven('G')).toEqual({ sharpFifths: 1, flatFifths: 6 })
    expect(addToSeven('D')).toEqual({ sharpFifths: 2, flatFifths: 5 })
    expect(addToSeven('A')).toEqual({ sharpFifths: 3, flatFifths: 4 })
    expect(addToSeven('E')).toEqual({ sharpFifths: 4, flatFifths: 3 })
    expect(addToSeven('B')).toEqual({ sharpFifths: 5, flatFifths: 2 })
    expect(addToSeven('F')).toEqual({ sharpFifths: 6, flatFifths: 1 })
    expect(addToSeven('C')).toBeNull()
  })
})

describe('minors and the circle', () => {
  it('places every relative a minor third away and gives the parallel major three more sharps', () => {
    for (const major of majors()) {
      const relative = minors().find((scale) => scale.id === major.relativeId)
      expect(relative, major.id).toBeTruthy()
      const down = (majorPc(major.id) - majorPc(relative!.id) + 12) % 12
      expect(down, major.id).toBe(3)
      expect(relative!.relativeId).toBe(major.id)
    }
    for (const minor of minors()) {
      const parallel = parallelMajor(minor.id)
      expect(fifthsApart(minor.fifths, parallel.fifths), minor.id).toBe(3)
    }
  })

  it('changes only the upper half between the three minor forms', () => {
    expect(stepKinds(NATURAL_STEPS).map(stepText)).toEqual(['T', 'S', 'T', 'T', 'S', 'T', 'T'])
    expect(stepKinds(HARMONIC_STEPS).map(stepText)).toEqual(['T', 'S', 'T', 'T', 'S', '1½', 'S'])
    expect(stepKinds(MELODIC_STEPS).map(stepText)).toEqual(['T', 'S', 'T', 'T', 'T', 'T', 'S'])
    for (const minor of minors()) {
      const natural = octaveNotes(minor.id, 'natural').slice(0, 4).map(noteLabel).join(' ')
      const harmonic = octaveNotes(minor.id, 'harmonic').slice(0, 4).map(noteLabel).join(' ')
      const melodic = octaveNotes(minor.id, 'melodic').slice(0, 4).map(noteLabel).join(' ')
      expect(harmonic, minor.id).toBe(natural)
      expect(melodic, minor.id).toBe(natural)
      expect(noteLabel(octaveNotes(minor.id, 'harmonic')[6])).not.toBe(noteLabel(octaveNotes(minor.id, 'natural')[6]))
    }
  })

  it('moves one note at a time around the circle, including the enharmonic wrap', () => {
    for (const major of majors()) {
      const next = clockwiseMajor(major.id)
      expect(differentPitchCount(scalePitchClasses(major.id), scalePitchClasses(next.id)), `${major.id}->${next.id}`).toBe(1)
      const added = addedAccidental(major.id, next.id)
      if (next.fifths === major.fifths + 1) {
        expect(noteLabel(octaveNotes(next.id)[6]), next.id).toBe(noteLabel(added!))
      }
      const back = counterMajor(next.id)
      expect(back.id).toBe(major.id)
    }
    const c = chordMap('C')
    expect([c.IV.id, c.I.id, c.V.id, c.ii.id, c.iii.id, c.vi.id]).toEqual(['F', 'C', 'G', 'Dm', 'Em', 'Am'])
    expect(sharesStandardMajorFingering('D')).toBe(true)
    expect(sharesStandardMajorFingering('B')).toBe(false)
  })
})

function majorPc(id: string): number {
  return scalePitchClasses(id)[0]
}
