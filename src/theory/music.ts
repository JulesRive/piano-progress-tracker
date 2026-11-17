export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export type Letter = (typeof LETTERS)[number]

export const NATURAL_PC: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

export const FRENCH: Record<Letter, string> = {
  C: 'do',
  D: 'ré',
  E: 'mi',
  F: 'fa',
  G: 'sol',
  A: 'la',
  B: 'si',
}

export interface SpelledNote {
  letter: Letter
  /** -2 double flat, -1 flat, 0 natural, 1 sharp, 2 double sharp. */
  accidental: number
  /** Pitch class 0–11, C = 0. */
  pc: number
}

export const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]
export const NATURAL_STEPS = [0, 2, 3, 5, 7, 8, 10]
export const HARMONIC_STEPS = [0, 2, 3, 5, 7, 8, 11]
export const MELODIC_STEPS = [0, 2, 3, 5, 7, 9, 11]

const SHARP_ORDER: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER: Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

export type Mode = 'major' | 'minor'
export type MinorForm = 'natural' | 'harmonic' | 'melodic'
export type Hand = 'rh' | 'lh'

export interface ScaleDef {
  id: string
  mode: Mode
  letter: Letter
  accidental: number
  /** 0 = C at the top, increasing clockwise (fifths). */
  position: number
  /** Positive = sharps, negative = flats. */
  fifths: number
  relativeId: string
  enharmonic?: string
  enharmonicFrench?: string
}

interface CircleSlot {
  majorId: string
  minorId: string
  fifths: number
  major: { letter: Letter; accidental: number; enharmonic?: string; enharmonicFrench?: string }
  minor: { letter: Letter; accidental: number; enharmonic?: string; enharmonicFrench?: string }
}

const CIRCLE_SLOTS: CircleSlot[] = [
  { majorId: 'C', minorId: 'Am', fifths: 0, major: { letter: 'C', accidental: 0 }, minor: { letter: 'A', accidental: 0 } },
  { majorId: 'G', minorId: 'Em', fifths: 1, major: { letter: 'G', accidental: 0 }, minor: { letter: 'E', accidental: 0 } },
  { majorId: 'D', minorId: 'Bm', fifths: 2, major: { letter: 'D', accidental: 0 }, minor: { letter: 'B', accidental: 0 } },
  { majorId: 'A', minorId: 'F#m', fifths: 3, major: { letter: 'A', accidental: 0 }, minor: { letter: 'F', accidental: 1 } },
  { majorId: 'E', minorId: 'C#m', fifths: 4, major: { letter: 'E', accidental: 0 }, minor: { letter: 'C', accidental: 1 } },
  { majorId: 'B', minorId: 'G#m', fifths: 5, major: { letter: 'B', accidental: 0 }, minor: { letter: 'G', accidental: 1 } },
  {
    majorId: 'F#',
    minorId: 'D#m',
    fifths: 6,
    major: { letter: 'F', accidental: 1, enharmonic: 'G♭', enharmonicFrench: 'sol♭' },
    minor: { letter: 'D', accidental: 1, enharmonic: 'E♭m', enharmonicFrench: 'mi♭' },
  },
  { majorId: 'Db', minorId: 'Bbm', fifths: -5, major: { letter: 'D', accidental: -1 }, minor: { letter: 'B', accidental: -1 } },
  { majorId: 'Ab', minorId: 'Fm', fifths: -4, major: { letter: 'A', accidental: -1 }, minor: { letter: 'F', accidental: 0 } },
  { majorId: 'Eb', minorId: 'Cm', fifths: -3, major: { letter: 'E', accidental: -1 }, minor: { letter: 'C', accidental: 0 } },
  { majorId: 'Bb', minorId: 'Gm', fifths: -2, major: { letter: 'B', accidental: -1 }, minor: { letter: 'G', accidental: 0 } },
  { majorId: 'F', minorId: 'Dm', fifths: -1, major: { letter: 'F', accidental: 0 }, minor: { letter: 'D', accidental: 0 } },
]

function defineScale(
  id: string,
  mode: Mode,
  position: number,
  fifths: number,
  relativeId: string,
  spelling: CircleSlot['major'],
): ScaleDef {
  return {
    id,
    mode,
    letter: spelling.letter,
    accidental: spelling.accidental,
    position,
    fifths,
    relativeId,
    enharmonic: spelling.enharmonic,
    enharmonicFrench: spelling.enharmonicFrench,
  }
}

export const SCALES: ScaleDef[] = CIRCLE_SLOTS.flatMap((slot, position) => [
  defineScale(slot.majorId, 'major', position, slot.fifths, slot.minorId, slot.major),
  defineScale(slot.minorId, 'minor', position, slot.fifths, slot.majorId, slot.minor),
])

const SCALE_BY_ID = new Map(SCALES.map((scale) => [scale.id, scale]))

export function getScale(id: string): ScaleDef {
  const scale = SCALE_BY_ID.get(id)
  if (!scale) throw new Error(`Unknown scale ${id}`)
  return scale
}

export function circleOrderIds(): string[] {
  return SCALES.map((scale) => scale.id)
}

export const SCALE_IDS = circleOrderIds()

export function accidentalGlyph(accidental: number): string {
  if (accidental === 2) return '×'
  if (accidental === 1) return '♯'
  if (accidental === -1) return '♭'
  if (accidental === -2) return '♭♭'
  return ''
}

export function spellPitch(letter: Letter, pc: number): SpelledNote {
  const wrapped = ((pc % 12) + 12) % 12
  let diff = wrapped - NATURAL_PC[letter]
  if (diff > 6) diff -= 12
  if (diff < -6) diff += 12
  return { letter, accidental: diff, pc: wrapped }
}

export function noteLabel(note: SpelledNote): string {
  return `${note.letter}${accidentalGlyph(note.accidental)}`
}

export function frenchNote(note: SpelledNote): string {
  return `${FRENCH[note.letter]}${accidentalGlyph(note.accidental)}`
}

export function tonicOf(scale: ScaleDef): SpelledNote {
  return spellPitch(scale.letter, (NATURAL_PC[scale.letter] + scale.accidental + 12) % 12)
}

export function scaleTitle(scale: ScaleDef): string {
  const name = noteLabel(tonicOf(scale))
  return scale.mode === 'major' ? `${name} major` : `${name} minor`
}

export function frenchScaleTitle(scale: ScaleDef): string {
  const name = frenchNote(tonicOf(scale))
  return scale.mode === 'major' ? `${name} majeur` : `${name} mineur`
}

export function shortName(scale: ScaleDef): string {
  const name = noteLabel(tonicOf(scale))
  return scale.mode === 'minor' ? `${name}m` : name
}

export function signatureNotes(fifths: number): SpelledNote[] {
  if (fifths > 0) {
    return SHARP_ORDER.slice(0, fifths).map((letter) => spellPitch(letter, (NATURAL_PC[letter] + 1) % 12))
  }
  if (fifths < 0) {
    return FLAT_ORDER.slice(0, -fifths).map((letter) => spellPitch(letter, (NATURAL_PC[letter] + 11) % 12))
  }
  return []
}

export function signatureBadge(fifths: number): string {
  if (fifths === 0) return ''
  if (fifths > 0) return `${fifths}♯`
  return `${-fifths}♭`
}

export function signatureSummary(fifths: number): string {
  const notes = signatureNotes(fifths)
  if (notes.length === 0) return 'No sharps or flats'
  const listed = notes.map(noteLabel).join(' ')
  if (fifths === 1) return `1 sharp · ${listed}`
  if (fifths === -1) return `1 flat · ${listed}`
  if (fifths > 0) return `${fifths} sharps · ${listed}`
  return `${-fifths} flats · ${listed}`
}

export function frenchSignature(fifths: number): string {
  const notes = signatureNotes(fifths)
  if (notes.length === 0) return ''
  return notes.map(frenchNote).join(' ')
}

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

/** True when the spelling is not the ordinary key name (E♯, B♯, F×, C×, …). */
export function needsSpellingHint(note: SpelledNote): boolean {
  const label = noteLabel(note)
  return label !== SHARP_NAMES[note.pc] && label !== FLAT_NAMES[note.pc]
}

export function isBlackPc(pc: number): boolean {
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10
}

export function spellScale(tonic: SpelledNote, steps: number[]): SpelledNote[] {
  const start = LETTERS.indexOf(tonic.letter)
  return steps.map((step, degree) => {
    const letter = LETTERS[(start + degree) % 7]
    return spellPitch(letter, (tonic.pc + step) % 12)
  })
}

export function stepsFor(mode: Mode, form: MinorForm, direction: 'up' | 'down'): number[] {
  if (mode === 'major') return MAJOR_STEPS
  if (form === 'harmonic') return HARMONIC_STEPS
  if (form === 'melodic' && direction === 'up') return MELODIC_STEPS
  return NATURAL_STEPS
}

/**
 * Standard 2-octave fingerings, ascending, bottom to top.
 * Descending uses the same finger on each key (the written descending
 * pattern is this sequence reversed). Sources: ABRSM-style conservatory
 * fingerings. C, F, and B match the usual groupings; F♯, D♭, B♭, E♭, and
 * A♭ are the major exceptions. Minor defaults are the harmonic-minor
 * fingerings (F♯m, C♯m, G♯m, D♯m, B♭m differ from a plain C pattern).
 * Melodic ascending overrides keep the thumb off black keys when the raised
 * 6th would otherwise land under it. G♯ minor natural / melodic descending
 * in the left hand moves the 7th off the thumb so F♯ is not played by it.
 */
const SF_RH = [1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5]
const SF_LH = [5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1]
const F_RH = [1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 4]
const B_LH = [4, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1]
const FS_RH = [2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2]
const FS_LH = [4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 2]
const DB_RH = [2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2]
const FLAT_LH = [3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 2]
const AB_RH = [3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3]
const EB_RH = [3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3]
const BB_RH = [4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4]
const SHARP_MIN_RH = [3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3]
const DSM_LH = [2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2]
const BBM_LH = [2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2]
const MELODIC_BLACK_KEY_RH = [2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2]
const GSM_NATURAL_LH = [3, 2, 1, 4, 3, 2, 4, 3, 2, 1, 4, 3, 2, 4, 3]

interface FingeringSet {
  rh: number[]
  lh: number[]
  melodicAscRh?: number[]
  naturalLh?: number[]
}

const FINGERINGS: Record<string, FingeringSet> = {
  C: { rh: SF_RH, lh: SF_LH },
  G: { rh: SF_RH, lh: SF_LH },
  D: { rh: SF_RH, lh: SF_LH },
  A: { rh: SF_RH, lh: SF_LH },
  E: { rh: SF_RH, lh: SF_LH },
  B: { rh: SF_RH, lh: B_LH },
  'F#': { rh: FS_RH, lh: FS_LH },
  Db: { rh: DB_RH, lh: FLAT_LH },
  Ab: { rh: AB_RH, lh: FLAT_LH },
  Eb: { rh: EB_RH, lh: FLAT_LH },
  Bb: { rh: BB_RH, lh: FLAT_LH },
  F: { rh: F_RH, lh: SF_LH },
  Am: { rh: SF_RH, lh: SF_LH },
  Em: { rh: SF_RH, lh: SF_LH },
  Bm: { rh: SF_RH, lh: B_LH },
  'F#m': { rh: SHARP_MIN_RH, lh: FS_LH, melodicAscRh: MELODIC_BLACK_KEY_RH },
  'C#m': { rh: SHARP_MIN_RH, lh: FLAT_LH, melodicAscRh: MELODIC_BLACK_KEY_RH },
  'G#m': { rh: SHARP_MIN_RH, lh: FLAT_LH, naturalLh: GSM_NATURAL_LH },
  'D#m': { rh: EB_RH, lh: DSM_LH },
  Bbm: { rh: BB_RH, lh: BBM_LH },
  Fm: { rh: F_RH, lh: SF_LH },
  Cm: { rh: SF_RH, lh: SF_LH },
  Gm: { rh: SF_RH, lh: SF_LH },
  Dm: { rh: SF_RH, lh: SF_LH },
}

/** Fingers aligned bottom-to-top with the notes of that direction. */
export function fingerPattern(id: string, hand: Hand, form: MinorForm, direction: 'up' | 'down'): number[] {
  const set = FINGERINGS[id]
  if (!set) throw new Error(`No fingering for ${id}`)
  const scale = getScale(id)
  let pattern = hand === 'rh' ? set.rh : set.lh
  if (scale.mode === 'minor') {
    const melodicUp = form === 'melodic' && direction === 'up'
    const naturalSet = form === 'natural' || (form === 'melodic' && direction === 'down')
    if (melodicUp && hand === 'rh' && set.melodicAscRh) pattern = set.melodicAscRh
    if (naturalSet && hand === 'lh' && set.naturalLh) pattern = set.naturalLh
  }
  return pattern
}

/** Fingers in the order they are played. */
export function fingerSequence(id: string, hand: Hand, form: MinorForm, direction: 'up' | 'down'): number[] {
  const pattern = fingerPattern(id, hand, form, direction)
  return direction === 'up' ? pattern : [...pattern].reverse()
}

export function formatFingers(fingers: number[]): string {
  return fingers.join(' ')
}

export interface ScaleTone {
  midi: number
  note: SpelledNote
  label: string
  french: string
  degree: number
  finger: number
  altered: boolean
  hint: boolean
}

const START_MIDI_C4 = 60

function buildDirection(scale: ScaleDef, form: MinorForm, hand: Hand, direction: 'up' | 'down'): ScaleTone[] {
  const steps = stepsFor(scale.mode, form, direction)
  const tonic = tonicOf(scale)
  const tonicMidi = START_MIDI_C4 + tonic.pc
  const spelled = spellScale(tonic, steps)
  const fingers = fingerPattern(scale.id, hand, form, direction)
  const tones: ScaleTone[] = []
  for (let octave = 0; octave < 2; octave += 1) {
    for (let degree = 0; degree < 7; degree += 1) {
      const note = spelled[degree]
      tones.push({
        midi: tonicMidi + steps[degree] + 12 * octave,
        note,
        label: noteLabel(note),
        french: frenchNote(note),
        degree,
        finger: fingers[octave * 7 + degree],
        altered: scale.mode === 'minor' && steps[degree] !== NATURAL_STEPS[degree],
        hint: needsSpellingHint(note),
      })
    }
  }
  const top = spelled[0]
  tones.push({
    midi: tonicMidi + 24,
    note: top,
    label: noteLabel(top),
    french: frenchNote(top),
    degree: 0,
    finger: fingers[14],
    altered: false,
    hint: needsSpellingHint(top),
  })
  return tones
}

export interface ScaleRun {
  ascending: ScaleTone[]
  descending: ScaleTone[]
}

export function scaleRun(id: string, hand: Hand, form: MinorForm): ScaleRun {
  const scale = getScale(id)
  const ascending = buildDirection(scale, form, hand, 'up')
  const descendingForm: MinorForm = scale.mode === 'minor' && form === 'melodic' ? 'natural' : form
  const descending = [...buildDirection(scale, descendingForm, hand, 'down')].reverse()
  return { ascending, descending }
}

/** Two octaves up, then down, without repeating the top note. */
export function playbackTones(run: ScaleRun): ScaleTone[] {
  return [...run.ascending, ...run.descending.slice(1)]
}

export function midiToScientific(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return `${names[pc]}${octave}`
}
