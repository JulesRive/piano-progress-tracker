import {
  fingerPattern,
  frenchNote,
  getScale,
  noteLabel,
  signatureNotes,
  spellScale,
  stepsFor,
  tonicOf,
  type Hand,
  type Letter,
  type MinorForm,
  type ScaleDef,
  type SpelledNote,
} from './music.ts'

const VEX_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'] as const

const VEX_ACCIDENTAL = {
  [-2]: 'bb',
  [-1]: 'b',
  0: 'n',
  1: '#',
  2: '##',
} as const

export type VexAccidental = (typeof VEX_ACCIDENTAL)[keyof typeof VEX_ACCIDENTAL]

export interface ScoreEvent {
  /** Treble pitch, e.g. `e/4`. The letter is unaccidented; spelling is `accidental`. */
  key: string
  /** Bass pitch, chosen so the octave stays on the bass staff. */
  lhKey: string
  /** Null when the key signature (or an earlier accidental in the bar) already applies. */
  accidental: VexAccidental | null
  midi: number
  lhMidi: number
  rhFinger: number
  lhFinger: number
  label: string
  french: string
}

/** VexFlow key-signature name for a fifths count, from 7 flats through 7 sharps. */
export function vexKeySignature(fifths: number): string {
  const name = VEX_KEYS[fifths + 7]
  if (!name) throw new Error(`No VexFlow key for fifths ${fifths}`)
  return name
}

function vexPitch(note: SpelledNote, midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${note.letter.toLowerCase()}/${octave}`
}

function signatureMap(fifths: number): Map<Letter, number> {
  const map = new Map<Letter, number>()
  for (const note of signatureNotes(fifths)) map.set(note.letter, note.accidental)
  return map
}

/**
 * Decide which accidentals to print. The key signature counts as already active,
 * and a later note reprints an accidental only when its spelling changes.
 */
export function accidentalState(fifths: number, notes: SpelledNote[]): Array<VexAccidental | null> {
  const active = signatureMap(fifths)
  return notes.map((note) => {
    const current = active.get(note.letter) ?? 0
    if (note.accidental === current) return null
    const printed = VEX_ACCIDENTAL[note.accidental as -2 | -1 | 0 | 1 | 2]
    if (!printed) throw new Error(`Cannot print accidental ${note.accidental} on ${note.letter}`)
    active.set(note.letter, note.accidental)
    return printed
  })
}

/** Ledger lines a pitch needs outside the staff. Spaces immediately outside count as zero. */
export function ledgerLines(clef: 'treble' | 'bass', midi: number): number {
  const place = diatonic(midi)
  const top = clef === 'treble' ? diatonic(77) : diatonic(57)
  const bottom = clef === 'treble' ? diatonic(64) : diatonic(43)
  return Math.max(0, Math.floor((place - top) / 2), Math.floor((bottom - place) / 2))
}

function diatonic(midi: number): number {
  const octave = Math.floor(midi / 12) - 1
  const pc = ((midi % 12) + 12) % 12
  const letter = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc]
  return octave * 7 + letter
}

function span(clef: 'treble' | 'bass', tonic: number): number {
  return Math.max(ledgerLines(clef, tonic), ledgerLines(clef, tonic + 12))
}

/** Right hand starts on the tonic between C4 and B4. */
export function rightHandTonic(pitchClass: number): number {
  return 60 + pitchClass
}

/**
 * Left hand is one octave below the right hand (C3–B3) when that stays within
 * two ledger lines. Higher tonics drop to C2–B2 so the octave remains readable.
 */
export function leftHandTonic(pitchClass: number): number {
  const higher = 48 + pitchClass
  const lower = 36 + pitchClass
  return span('bass', higher) <= 2 ? higher : lower
}

function octavePair(id: string, form: MinorForm, direction: 'up' | 'down'): { notes: SpelledNote[]; fingers: (hand: Hand) => number[] } {
  const scale = getScale(id)
  const written = stepsFor(scale.mode, form, direction)
  const spelled = spellScale(tonicOf(scale), written)
  const notes = [...spelled, spelled[0]]
  return {
    notes,
    fingers: (hand) => fingerPattern(id, hand, form, direction === 'down' ? 'down' : 'up').slice(0, 8),
  }
}

export function buildScore(id: string, form: MinorForm = 'harmonic'): { keySignature: string; fifths: number; events: ScoreEvent[] } {
  const scale: ScaleDef = getScale(id)
  const ascending = octavePair(id, form, 'up')
  const descendingForm: MinorForm = scale.mode === 'minor' && form === 'melodic' ? 'natural' : form
  const descending = octavePair(id, descendingForm, 'down')
  const notes = [...ascending.notes, ...[...descending.notes].reverse().slice(1)]
  const rhFingers = [...ascending.fingers('rh'), ...[...descending.fingers('rh')].reverse().slice(1)]
  const lhFingers = [...ascending.fingers('lh'), ...[...descending.fingers('lh')].reverse().slice(1)]
  const accidentals = accidentalState(scale.fifths, notes)
  const pitchClass = tonicOf(scale).pc
  const rightTonic = rightHandTonic(pitchClass)
  const leftTonic = leftHandTonic(pitchClass)
  const up = [...stepsFor(scale.mode, form, 'up'), 12]
  const down = [...stepsFor(scale.mode, descendingForm, 'up'), 12].slice(0, 7).reverse()
  const offsets = [...up, ...down]
  const events = notes.map((note, index) => {
    const midi = rightTonic + offsets[index]
    const lhMidi = leftTonic + offsets[index]
    return {
      key: vexPitch(note, midi),
      lhKey: vexPitch(note, lhMidi),
      accidental: accidentals[index],
      midi,
      lhMidi,
      rhFinger: rhFingers[index],
      lhFinger: lhFingers[index],
      label: noteLabel(note),
      french: frenchNote(note),
    }
  })
  return { keySignature: vexKeySignature(scale.fifths), fifths: scale.fifths, events }
}
