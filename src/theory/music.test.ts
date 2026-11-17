import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { countByStatus, nextUp, normalizeProgress } from '../progress/model.ts'
import { decodeBase64, encodeBase64 } from '../progress/github.ts'
import {
  FRENCH,
  LETTERS,
  SCALE_IDS,
  fingerPattern,
  fingerSequence,
  formatFingers,
  frenchNote,
  getScale,
  isBlackPc,
  noteLabel,
  playbackTones,
  scaleRun,
  scaleTitle,
  signatureNotes,
  spellScale,
  tonicOf,
  type MinorForm,
} from './music.ts'

const FORMS: MinorForm[] = ['natural', 'harmonic', 'melodic']

function labels(id: string, form: MinorForm, direction: 'up' | 'down' = 'up'): string[] {
  const run = scaleRun(id, 'rh', form)
  const tones = direction === 'up' ? run.ascending : run.descending
  return tones.map((tone) => tone.label)
}

describe('spellings', () => {
  it('uses each letter once per octave', () => {
    for (const id of SCALE_IDS) {
      for (const form of FORMS) {
        const run = scaleRun(id, 'rh', form)
        for (const octave of [0, 1]) {
          const letters = run.ascending.slice(octave * 7, octave * 7 + 7).map((tone) => tone.note.letter)
          expect(new Set(letters).size, `${id} ${form}`).toBe(7)
          expect(letters).toEqual(expect.arrayContaining([...LETTERS]))
        }
      }
    }
  })

  it('spells the sharp and flat majors with the right accidentals', () => {
    expect(labels('C', 'harmonic').slice(0, 8)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'])
    expect(labels('F#', 'harmonic').slice(0, 8)).toEqual(['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯', 'F♯'])
    expect(labels('Db', 'harmonic').slice(0, 8)).toEqual(['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C', 'D♭'])
    expect(labels('Bb', 'harmonic').slice(0, 8)).toEqual(['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A', 'B♭'])
  })

  it('raises the 7th in harmonic minor, including double sharps', () => {
    expect(labels('Am', 'harmonic').slice(0, 8)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G♯', 'A'])
    expect(labels('Bbm', 'harmonic').slice(0, 8)).toEqual(['B♭', 'C', 'D♭', 'E♭', 'F', 'G♭', 'A', 'B♭'])
    expect(labels('G#m', 'harmonic').slice(0, 8)).toEqual(['G♯', 'A♯', 'B', 'C♯', 'D♯', 'E', 'F×', 'G♯'])
    expect(labels('D#m', 'harmonic').slice(0, 8)).toEqual(['D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B', 'C×', 'D♯'])
  })

  it('raises 6 and 7 going up in melodic minor and comes down natural', () => {
    expect(labels('Am', 'melodic').slice(0, 8)).toEqual(['A', 'B', 'C', 'D', 'E', 'F♯', 'G♯', 'A'])
    expect(labels('Am', 'melodic', 'down').slice(0, 8)).toEqual(['A', 'G', 'F', 'E', 'D', 'C', 'B', 'A'])
    expect(labels('D#m', 'melodic').slice(0, 8)).toEqual(['D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B♯', 'C×', 'D♯'])
    expect(labels('D#m', 'melodic', 'down').slice(0, 8)).toEqual(['D♯', 'C♯', 'B', 'A♯', 'G♯', 'F♯', 'E♯', 'D♯'])
    expect(labels('G#m', 'melodic').slice(0, 8)).toEqual(['G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯', 'F×', 'G♯'])
  })

  it('marks only the altered minor degrees', () => {
    const harmonic = scaleRun('Em', 'rh', 'harmonic').ascending
    expect(harmonic.filter((tone) => tone.altered).map((tone) => tone.label)).toEqual(['D♯', 'D♯'])
    const melodic = scaleRun('Am', 'rh', 'melodic')
    expect(melodic.ascending.filter((tone) => tone.altered).map((tone) => tone.label)).toEqual(['F♯', 'G♯', 'F♯', 'G♯'])
    expect(melodic.descending.some((tone) => tone.altered)).toBe(false)
  })

  it('gives French solfège beside the letter names', () => {
    expect(FRENCH).toEqual({ C: 'do', D: 'ré', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si' })
    const fSharp = tonicOf(getScale('F#'))
    expect(noteLabel(fSharp)).toBe('F♯')
    expect(frenchNote(fSharp)).toBe('fa♯')
    expect(scaleTitle(getScale('D#m'))).toBe('D♯ minor')
  })

  it('lists key-signature accidentals in order', () => {
    expect(signatureNotes(0)).toEqual([])
    expect(signatureNotes(4).map(noteLabel)).toEqual(['F♯', 'C♯', 'G♯', 'D♯'])
    expect(signatureNotes(-5).map(noteLabel)).toEqual(['B♭', 'E♭', 'A♭', 'D♭', 'G♭'])
    expect(signatureNotes(6).map(noteLabel)).toEqual(['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯'])
  })
})

describe('fingerings', () => {
  it('matches the standard patterns called out for C, F, and B', () => {
    expect(formatFingers(fingerPattern('C', 'rh', 'harmonic', 'up'))).toBe('1 2 3 1 2 3 4 1 2 3 1 2 3 4 5')
    expect(formatFingers(fingerPattern('C', 'lh', 'harmonic', 'up'))).toBe('5 4 3 2 1 3 2 1 4 3 2 1 3 2 1')
    expect(formatFingers(fingerPattern('F', 'rh', 'harmonic', 'up'))).toBe('1 2 3 4 1 2 3 1 2 3 4 1 2 3 4')
    expect(formatFingers(fingerPattern('B', 'lh', 'harmonic', 'up'))).toBe('4 3 2 1 4 3 2 1 3 2 1 4 3 2 1')
  })

  it('uses the major exceptions for F♯, D♭, B♭, E♭, and A♭', () => {
    expect(formatFingers(fingerSequence('F#', 'rh', 'harmonic', 'up'))).toBe('2 3 4 1 2 3 1 2 3 4 1 2 3 1 2')
    expect(formatFingers(fingerSequence('Db', 'rh', 'harmonic', 'up'))).toBe('2 3 1 2 3 4 1 2 3 1 2 3 4 1 2')
    expect(formatFingers(fingerSequence('Bb', 'rh', 'harmonic', 'up'))).toBe('4 1 2 3 1 2 3 4 1 2 3 1 2 3 4')
    expect(formatFingers(fingerSequence('Eb', 'rh', 'harmonic', 'up'))).toBe('3 1 2 3 4 1 2 3 1 2 3 4 1 2 3')
    expect(formatFingers(fingerSequence('Ab', 'rh', 'harmonic', 'up'))).toBe('3 4 1 2 3 1 2 3 4 1 2 3 1 2 3')
    expect(formatFingers(fingerSequence('F#', 'lh', 'harmonic', 'up'))).toBe('4 3 2 1 3 2 1 4 3 2 1 3 2 1 2')
    expect(formatFingers(fingerSequence('Db', 'lh', 'harmonic', 'up'))).toBe('3 2 1 4 3 2 1 3 2 1 4 3 2 1 2')
  })

  it('uses the minor exceptions, including melodic adjustments', () => {
    for (const id of ['F#m', 'C#m', 'G#m']) {
      expect(formatFingers(fingerPattern(id, 'rh', 'harmonic', 'up')), id).toBe('3 4 1 2 3 1 2 3 4 1 2 3 1 2 3')
    }
    expect(formatFingers(fingerPattern('D#m', 'rh', 'harmonic', 'up'))).toBe('3 1 2 3 4 1 2 3 1 2 3 4 1 2 3')
    expect(formatFingers(fingerPattern('D#m', 'lh', 'harmonic', 'up'))).toBe('2 1 4 3 2 1 3 2 1 4 3 2 1 3 2')
    expect(formatFingers(fingerPattern('Bbm', 'rh', 'harmonic', 'up'))).toBe('4 1 2 3 1 2 3 4 1 2 3 1 2 3 4')
    expect(formatFingers(fingerPattern('Bbm', 'lh', 'harmonic', 'up'))).toBe('2 1 3 2 1 4 3 2 1 3 2 1 4 3 2')
    expect(formatFingers(fingerPattern('F#m', 'rh', 'melodic', 'up'))).toBe('2 3 1 2 3 4 1 2 3 1 2 3 4 1 2')
    expect(formatFingers(fingerPattern('C#m', 'rh', 'melodic', 'up'))).toBe('2 3 1 2 3 4 1 2 3 1 2 3 4 1 2')
    expect(formatFingers(fingerSequence('F#m', 'rh', 'melodic', 'down'))).toBe('3 2 1 3 2 1 4 3 2 1 3 2 1 4 3')
    expect(formatFingers(fingerPattern('G#m', 'lh', 'natural', 'up'))).toBe('3 2 1 4 3 2 4 3 2 1 4 3 2 4 3')
  })

  it('keeps the thumb off black keys', () => {
    for (const id of SCALE_IDS) {
      for (const form of FORMS) {
        for (const hand of ['rh', 'lh'] as const) {
          const run = scaleRun(id, hand, form)
          for (const direction of ['ascending', 'descending'] as const) {
            for (const tone of run[direction]) {
              if (tone.finger !== 1) continue
              expect(isBlackPc(tone.note.pc), `${id} ${form} ${hand} ${direction} ${tone.label}`).toBe(false)
            }
          }
        }
      }
    }
  })

  it('plays 29 notes up and down, with melodic minor changing on the way down', () => {
    const playback = playbackTones(scaleRun('C', 'rh', 'harmonic'))
    expect(playback).toHaveLength(29)
    expect(playback[0].label).toBe('C')
    expect(playback[14].label).toBe('C')
    expect(playback[15].label).toBe('B')
    expect(playback[28].label).toBe('C')
    const melodic = playbackTones(scaleRun('Am', 'lh', 'melodic'))
    expect(melodic[5].label).toBe('F♯')
    expect(melodic[6].label).toBe('G♯')
    expect(melodic[15].label).toBe('G')
    expect(melodic[16].label).toBe('F')
  })
})

describe('progress file', () => {
  const bundled = normalizeProgress(
    JSON.parse(readFileSync(new URL('../../public/progress.json', import.meta.url), 'utf8')),
  )

  it('starts Jules on C, A minor, G, and D, with E minor and B minor underway', () => {
    expect(countByStatus(bundled)).toEqual({ mastered: 4, 'in-progress': 2, 'not-started': 18 })
    expect(['C', 'Am', 'G', 'D'].map((id) => bundled.scales[id].status)).toEqual([
      'mastered',
      'mastered',
      'mastered',
      'mastered',
    ])
    expect(bundled.scales.Em).toMatchObject({ status: 'in-progress', form: 'harmonic' })
    expect(bundled.scales.Bm).toMatchObject({ status: 'in-progress', form: 'harmonic' })
    expect(bundled.pieces).toEqual([])
    expect(bundled.resources).toEqual([])
    expect(nextUp(bundled)).toBe('Em')
  })

  it('walks to the next unstarted scale once nothing is in progress', () => {
    const progress = normalizeProgress({
      scales: {
        C: { status: 'mastered' },
        Am: { status: 'mastered' },
        G: { status: 'mastered' },
        Em: { status: 'mastered' },
      },
    })
    expect(nextUp(progress)).toBe('D')
  })

  it('round-trips unicode through the GitHub content encoding', () => {
    expect(decodeBase64(encodeBase64('ré mineur · F×'))).toBe('ré mineur · F×')
  })

  it('drops junk and keeps unknown future scale ids', () => {
    const progress = normalizeProgress({
      scales: { C: { status: 'nope', notes: '  warm-up  ' }, Zz: { status: 'mastered' } },
      pieces: [{ title: 'Arabesque' }, 'nope'],
      resources: null,
    })
    expect(progress.scales.C).toEqual({ status: 'not-started', notes: 'warm-up' })
    expect(progress.scales.Zz.status).toBe('mastered')
    expect(progress.pieces[0].title).toBe('Arabesque')
    expect(progress.resources).toEqual([])
  })
})

describe('scale degrees stay spelled from the tonic', () => {
  it('does not respell enharmonics inside the scale', () => {
    const spelled = spellScale(tonicOf(getScale('F#')), [0, 2, 4, 5, 7, 9, 11])
    expect(spelled.map(noteLabel).join(' ')).toBe('F♯ G♯ A♯ B C♯ D♯ E♯')
  })
})
