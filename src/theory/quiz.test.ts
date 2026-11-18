import { describe, expect, it } from 'vitest'
import { noteLabel, scaleTitle } from './music.ts'
import { applyQuizAnswer, emptyQuiz, normalizeProgress } from '../progress/model.ts'
import { flatSteps, majors, minors, octaveNotes, sharpSteps } from './facts.ts'
import {
  correctLabel,
  countLabel,
  generateQuestion,
  questionAddedAccidental,
  questionMinorSeventh,
  questionRelativeMajor,
  questionRelativeMinor,
  questionSignatureCount,
  questionSignatureKey,
  questionSpellScale,
  spellingLabel,
  withinAccidentals,
  type QuizQuestion,
} from './quiz.ts'
import { bilingual } from './facts.ts'

function expectAnswer(question: QuizQuestion, label: string) {
  expect(question.choices.map((choice) => choice.id)).toContain(question.answerId)
  expect(new Set(question.choices.map((choice) => choice.id)).size).toBe(question.choices.length)
  expect(correctLabel(question)).toBe(label)
}

describe('quiz questions for every key', () => {
  it('counts signatures, names keys, and spells majors', () => {
    for (const scale of majors()) {
      expectAnswer(questionSignatureCount(scale, () => 0), countLabel(scale.fifths))
      expectAnswer(questionSignatureKey(scale, () => 0), scaleTitle(scale))
      expectAnswer(questionRelativeMinor(scale, () => 0), scaleTitle(minors().find((item) => item.id === scale.relativeId)!))
      expectAnswer(questionSpellScale(scale, () => 0), spellingLabel(scale.id))
      expect(spellingLabel(scale.id)).toBe(octaveNotes(scale.id).slice(0, 7).map(noteLabel).join(' '))
    }
  })

  it('names relative majors and harmonic sevenths for every minor', () => {
    for (const scale of minors()) {
      expectAnswer(questionRelativeMajor(scale, () => 0), scaleTitle(majors().find((item) => item.id === scale.relativeId)!))
      const seventh = octaveNotes(scale.id, 'harmonic')[6]
      expectAnswer(questionMinorSeventh(scale, () => 0), `${noteLabel(seventh)} · ${bilingual(seventh).french}`)
    }
  })

  it('names the accidental added on each circle step', () => {
    for (const step of sharpSteps()) {
      const question = questionAddedAccidental(
        { ...step, added: { english: noteLabel(step.added) } },
        'sharp',
        () => 0,
      )
      expectAnswer(question, noteLabel(step.added))
      expect(noteLabel(octaveNotes(step.to.id)[6])).toBe(noteLabel(step.added))
    }
    for (const step of flatSteps()) {
      const question = questionAddedAccidental(
        { ...step, added: { english: noteLabel(step.added) } },
        'flat',
        () => 0,
      )
      expectAnswer(question, noteLabel(step.added))
      expect(noteLabel(octaveNotes(step.to.id)[3])).toBe(noteLabel(step.added))
    }
  })

  it('keeps generated questions inside the accidental limit', () => {
    const rng = () => 0.1
    for (let max = 0; max <= 6; max += 1) {
      for (let index = 0; index < 12; index += 1) {
        const question = generateQuestion({ maxAccidentals: max, rng })
        const subject = [...majors(), ...minors()].find((scale) => scale.id === question.subjectId)
        expect(subject && withinAccidentals(subject, max), question.prompt).toBe(true)
        expect(question.choices.some((choice) => choice.id === question.answerId)).toBe(true)
      }
    }
  })
})

describe('quiz progress migration', () => {
  it('keeps version 1 scale progress and starts quiz stats at zero', () => {
    const progress = normalizeProgress({
      version: 1,
      scales: { C: { status: 'mastered' }, Em: { status: 'in-progress', form: 'harmonic' } },
      pieces: [],
      resources: [],
    })
    expect(progress.version).toBe(2)
    expect(progress.scales.C.status).toBe('mastered')
    expect(progress.scales.Em).toMatchObject({ status: 'in-progress', form: 'harmonic' })
    expect(progress.quiz).toEqual(emptyQuiz())
    const next = applyQuizAnswer(progress.quiz, 'spell-scale', true, 1, 1)
    expect(next.correct).toBe(1)
    expect(next.bestStreak).toBe(1)
    expect(next.byCategory['spell-scale']).toEqual({ answered: 1, correct: 1 })
  })
})
