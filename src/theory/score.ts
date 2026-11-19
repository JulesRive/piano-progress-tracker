import {
  getScale,
  playbackTones,
  scaleRun,
  signatureNotes,
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
  /** Same spelling, one octave lower, for the bass staff. */
  lhKey: string
  /** Null when the key signature (or an earlier accidental in the bar) already applies. */
  accidental: VexAccidental | null
  midi: number
  lhMidi: number
  rhFinger: number
  lhFinger: number
  label: string
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

export function buildScore(id: string, form: MinorForm = 'harmonic'): { keySignature: string; fifths: number; events: ScoreEvent[] } {
  const scale: ScaleDef = getScale(id)
  const right = playbackTones(scaleRun(id, 'rh', form))
  const left = playbackTones(scaleRun(id, 'lh', form))
  const accidentals = accidentalState(scale.fifths, right.map((tone) => tone.note))
  const events = right.map((tone, index) => {
    const lower = tone.midi - 12
    return {
      key: vexPitch(tone.note, tone.midi),
      lhKey: vexPitch(tone.note, lower),
      accidental: accidentals[index],
      midi: tone.midi,
      lhMidi: lower,
      rhFinger: tone.finger,
      lhFinger: left[index].finger,
      label: tone.label,
    }
  })
  return { keySignature: vexKeySignature(scale.fifths), fifths: scale.fifths, events }
}
