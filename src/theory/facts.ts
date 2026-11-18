import {
  FRENCH,
  HARMONIC_STEPS,
  MAJOR_STEPS,
  MELODIC_STEPS,
  NATURAL_STEPS,
  SCALES,
  frenchNote,
  getScale,
  noteLabel,
  signatureNotes,
  spellScale,
  tonicOf,
  type Letter,
  type MinorForm,
  type ScaleDef,
  type SpelledNote,
} from './music.ts'

export const SHARP_ORDER: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
export const FLAT_ORDER: Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

export type StepKind = 'T' | 'S' | 'A'

export function majors(): ScaleDef[] {
  return SCALES.filter((scale) => scale.mode === 'major')
}

export function minors(): ScaleDef[] {
  return SCALES.filter((scale) => scale.mode === 'minor')
}

export function stepsForScale(scale: ScaleDef, form: MinorForm = 'harmonic', direction: 'up' | 'down' = 'up'): number[] {
  if (scale.mode === 'major') return MAJOR_STEPS
  if (direction === 'down' || form === 'natural') return NATURAL_STEPS
  if (form === 'harmonic') return HARMONIC_STEPS
  return MELODIC_STEPS
}

/** Eight notes, tonic through the octave, spelled with one letter each. */
export function octaveNotes(id: string, form: MinorForm = 'harmonic', direction: 'up' | 'down' = 'up'): SpelledNote[] {
  const scale = getScale(id)
  const spelled = spellScale(tonicOf(scale), stepsForScale(scale, form, direction))
  return [...spelled, spelled[0]]
}

export function stepKinds(steps: readonly number[]): StepKind[] {
  return steps.map((step, index) => {
    const next = index === steps.length - 1 ? 12 : steps[index + 1]
    const gap = next - step
    if (gap === 1) return 'S'
    if (gap === 2) return 'T'
    return 'A'
  })
}

export function stepText(kind: StepKind): string {
  if (kind === 'A') return '1½'
  return kind
}

export function clockwiseMajor(id: string): ScaleDef {
  const list = majors()
  const index = list.findIndex((scale) => scale.id === id)
  return list[(index + 1) % list.length]
}

export function counterMajor(id: string): ScaleDef {
  const list = majors()
  const index = list.findIndex((scale) => scale.id === id)
  return list[(index - 1 + list.length) % list.length]
}

export function lowerTetrachord(id: string): SpelledNote[] {
  return octaveNotes(id).slice(0, 4)
}

export function upperTetrachord(id: string): SpelledNote[] {
  return octaveNotes(id).slice(4, 8)
}

export function samePitches(left: SpelledNote[], right: SpelledNote[]): boolean {
  return left.length === right.length && left.every((note, index) => note.pc === right[index].pc)
}

/** Moving clockwise adds a sharp (the new key's 7th). Moving counter-clockwise adds a flat (the new key's 4th). */
export function addedAccidental(fromId: string, toId: string): SpelledNote | null {
  const from = getScale(fromId)
  const to = getScale(toId)
  if (to.fifths === from.fifths + 1) return octaveNotes(to.id)[6]
  if (to.fifths === from.fifths - 1) return octaveNotes(to.id)[3]
  return null
}

export function sharpSteps(): { from: ScaleDef; to: ScaleDef; added: SpelledNote }[] {
  return majors().flatMap((from) => {
    const to = clockwiseMajor(from.id)
    const added = addedAccidental(from.id, to.id)
    return added && to.fifths === from.fifths + 1 ? [{ from, to, added }] : []
  })
}

export function flatSteps(): { from: ScaleDef; to: ScaleDef; added: SpelledNote }[] {
  return majors().flatMap((from) => {
    const to = counterMajor(from.id)
    const added = addedAccidental(from.id, to.id)
    return added && to.fifths === from.fifths - 1 ? [{ from, to, added }] : []
  })
}

/** Last sharp, then up a semitone, is the major tonic. One flat is F major; otherwise the second-to-last flat names the key. */
export function keyNamedBySignature(fifths: number): ScaleDef | null {
  if (fifths > 0) {
    const last = signatureNotes(fifths).at(-1)
    if (!last) return null
    const pc = (last.pc + 1) % 12
    return majors().find((scale) => tonicOf(scale).pc === pc) ?? null
  }
  if (fifths === -1) return getScale('F')
  if (fifths < -1) {
    const flats = signatureNotes(fifths)
    const named = flats[flats.length - 2]
    return majors().find((scale) => noteLabel(tonicOf(scale)) === noteLabel(named)) ?? null
  }
  return getScale('C')
}

/** Same letter: sharps in the sharp key plus flats in the flat key add to 7. C has no twin. */
export function addToSeven(letter: Letter): { sharpFifths: number; flatFifths: number } | null {
  const sharp = majors().find((scale) => scale.letter === letter && scale.accidental === 1)
  const natural = majors().find((scale) => scale.letter === letter && scale.accidental === 0 && scale.fifths >= 0)
  const source = sharp ?? natural
  if (!source || source.fifths <= 0) return null
  return { sharpFifths: source.fifths, flatFifths: 7 - source.fifths }
}

export function parallelMajor(minorId: string): ScaleDef {
  const minor = getScale(minorId)
  const pc = tonicOf(minor).pc
  const major = majors().find((scale) => tonicOf(scale).pc === pc)
  if (!major) throw new Error(`No parallel major for ${minorId}`)
  return major
}

export function fifthsApart(left: number, right: number): number {
  return (((right - left) % 12) + 12) % 12
}

export function chordMap(majorId: string): { I: ScaleDef; IV: ScaleDef; V: ScaleDef; ii: ScaleDef; iii: ScaleDef; vi: ScaleDef } {
  const I = getScale(majorId)
  const IV = counterMajor(majorId)
  const V = clockwiseMajor(majorId)
  return {
    I,
    IV,
    V,
    ii: getScale(IV.relativeId),
    iii: getScale(V.relativeId),
    vi: getScale(I.relativeId),
  }
}

export function scalePitchClasses(id: string, form: MinorForm = 'harmonic'): number[] {
  return octaveNotes(id, form).slice(0, 7).map((note) => note.pc)
}

export function differentPitchCount(left: number[], right: number[]): number {
  const onlyLeft = left.filter((pc) => !right.includes(pc)).length
  const onlyRight = right.filter((pc) => !left.includes(pc)).length
  return Math.max(onlyLeft, onlyRight)
}

export function mixesSharpAndFlat(notes: SpelledNote[]): boolean {
  const body = notes.slice(0, 7)
  return body.some((note) => note.accidental > 0) && body.some((note) => note.accidental < 0)
}

export function usesEachLetterOnce(notes: SpelledNote[]): boolean {
  const letters = notes.slice(0, 7).map((note) => note.letter)
  return new Set(letters).size === 7
}

const STANDARD_FINGERING = new Set(['C', 'G', 'D', 'A', 'E'])

export function sharesStandardMajorFingering(id: string): boolean {
  return STANDARD_FINGERING.has(id)
}

export function frenchAccidental(accidental: number): string {
  if (accidental === 1) return 'dièse'
  if (accidental === -1) return 'bémol'
  if (accidental === 2) return 'double dièse'
  if (accidental === -2) return 'double bémol'
  return ''
}

export function bilingual(note: SpelledNote): { english: string; french: string } {
  const word = frenchAccidental(note.accidental)
  return {
    english: noteLabel(note),
    french: word ? `${FRENCH[note.letter]} ${word}` : FRENCH[note.letter],
  }
}

export function formatBilingual(note: SpelledNote): string {
  const names = bilingual(note)
  return `${names.english} · ${names.french}`
}

export function formatFrenchSyllables(notes: SpelledNote[]): string {
  return notes.map((note) => frenchNote(note)).join(' ')
}

export const NOTE_GUIDE: { english: string; french: string }[] = [
  { english: 'C', french: 'do' },
  { english: 'D', french: 'ré' },
  { english: 'E', french: 'mi' },
  { english: 'F', french: 'fa' },
  { english: 'G', french: 'sol' },
  { english: 'A', french: 'la' },
  { english: 'B', french: 'si' },
]
