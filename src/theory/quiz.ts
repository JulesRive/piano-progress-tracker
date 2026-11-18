import { noteLabel, scaleTitle, type ScaleDef } from './music.ts'
import {
  addedAccidental,
  bilingual,
  flatSteps,
  formatBilingual,
  majors,
  minors,
  octaveNotes,
  sharpSteps,
} from './facts.ts'

export const QUIZ_CATEGORIES = [
  'signature-count',
  'signature-key',
  'relative-minor',
  'relative-major',
  'spell-scale',
  'minor-degree',
  'added-accidental',
] as const

export type QuizCategory = (typeof QUIZ_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<QuizCategory, string> = {
  'signature-count': 'How many sharps or flats',
  'signature-key': 'Name the key',
  'relative-minor': 'Relative minor',
  'relative-major': 'Relative major',
  'spell-scale': 'Spell the scale',
  'minor-degree': 'Harmonic minor 7th',
  'added-accidental': 'Accidental added on the circle',
}

export interface QuizChoice {
  id: string
  label: string
  detail?: string
}

export interface QuizQuestion {
  id: string
  category: QuizCategory
  subjectId: string
  prompt: string
  choices: QuizChoice[]
  answerId: string
  explanation: string
}

export function withinAccidentals(scale: ScaleDef, maxAccidentals: number): boolean {
  return Math.abs(scale.fifths) <= maxAccidentals
}

export function countLabel(fifths: number): string {
  if (fifths === 0) return 'No sharps or flats'
  if (fifths === 1) return '1 sharp'
  if (fifths === -1) return '1 flat'
  if (fifths > 0) return `${fifths} sharps`
  return `${-fifths} flats`
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

function pick<T>(items: T[], count: number, rng: () => number): T[] {
  return shuffle(items, rng).slice(0, count)
}

function choice(label: string, detail?: string): QuizChoice {
  return detail ? { id: label, label, detail } : { id: label, label }
}

function withChoices(answer: QuizChoice, distractors: QuizChoice[], rng: () => number): QuizChoice[] {
  const unique = new Map<string, QuizChoice>()
  unique.set(answer.id, answer)
  for (const item of distractors) {
    if (unique.size >= 4) break
    if (!unique.has(item.id)) unique.set(item.id, item)
  }
  return shuffle([...unique.values()], rng)
}

export function questionSignatureCount(scale: ScaleDef, rng: () => number = Math.random): QuizQuestion {
  const answer = countLabel(scale.fifths)
  const distractors = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]
    .map(countLabel)
    .filter((label) => label !== answer)
    .map((label) => choice(label))
  return {
    id: `signature-count:${scale.id}`,
    category: 'signature-count',
    subjectId: scale.id,
    prompt: `How many sharps or flats are in ${scaleTitle(scale)}?`,
    choices: withChoices(choice(answer), pick(distractors, 6, rng), rng),
    answerId: answer,
    explanation: `${scaleTitle(scale)} has ${answer.toLowerCase()}.`,
  }
}

export function questionSignatureKey(scale: ScaleDef, rng: () => number = Math.random): QuizQuestion {
  const answer = scaleTitle(scale)
  const distractors = majors()
    .filter((item) => item.id !== scale.id)
    .map((item) => choice(scaleTitle(item)))
  return {
    id: `signature-key:${scale.id}`,
    category: 'signature-key',
    subjectId: scale.id,
    prompt: `Which major key has ${countLabel(scale.fifths).toLowerCase()}?`,
    choices: withChoices(choice(answer), pick(distractors, 6, rng), rng),
    answerId: answer,
    explanation: `${countLabel(scale.fifths)} is ${answer}.`,
  }
}

export function questionRelativeMinor(scale: ScaleDef, rng: () => number = Math.random): QuizQuestion {
  const relative = scaleTitle(getMinor(scale.relativeId))
  const distractors = minors()
    .filter((item) => item.id !== scale.relativeId)
    .map((item) => choice(scaleTitle(item)))
  return {
    id: `relative-minor:${scale.id}`,
    category: 'relative-minor',
    subjectId: scale.id,
    prompt: `What is the relative minor of ${scaleTitle(scale)}?`,
    choices: withChoices(choice(relative), pick(distractors, 6, rng), rng),
    answerId: relative,
    explanation: `${relative} sits a minor third (3 semitones) below ${scaleTitle(scale)}.`,
  }
}

export function questionRelativeMajor(scale: ScaleDef, rng: () => number = Math.random): QuizQuestion {
  const relative = scaleTitle(getMajor(scale.relativeId))
  const distractors = majors()
    .filter((item) => item.id !== scale.relativeId)
    .map((item) => choice(scaleTitle(item)))
  return {
    id: `relative-major:${scale.id}`,
    category: 'relative-major',
    subjectId: scale.id,
    prompt: `What is the relative major of ${scaleTitle(scale)}?`,
    choices: withChoices(choice(relative), pick(distractors, 6, rng), rng),
    answerId: relative,
    explanation: `${relative} sits a minor third (3 semitones) above ${scaleTitle(scale)}.`,
  }
}

export function spellingLabel(id: string, form: 'major' | 'harmonic' = 'major'): string {
  const formName = form === 'major' ? 'harmonic' : 'harmonic'
  return octaveNotes(id, formName).slice(0, 7).map(noteLabel).join(' ')
}

function wrongSpelling(id: string): string[] {
  const notes = octaveNotes(id).slice(0, 7).map((note) => ({ ...note }))
  const wrong: string[] = []
  for (const degree of [3, 6, 2]) {
    const copy = notes.map((note) => ({ ...note }))
    const target = copy[degree]
    target.accidental = Math.max(-2, Math.min(2, target.accidental + (target.accidental < 0 ? -1 : 1)))
    const label = copy.map(noteLabel).join(' ')
    if (label !== notes.map(noteLabel).join(' ') && !wrong.includes(label)) wrong.push(label)
  }
  return wrong
}

export function questionSpellScale(scale: ScaleDef, rng: () => number = Math.random): QuizQuestion {
  const answer = spellingLabel(scale.id)
  const distractors = wrongSpelling(scale.id).map((label) => choice(label))
  return {
    id: `spell-scale:${scale.id}`,
    category: 'spell-scale',
    subjectId: scale.id,
    prompt: `Which spelling is ${scaleTitle(scale)}? One letter each, no mixed sharps and flats.`,
    choices: withChoices(choice(answer), distractors, rng),
    answerId: answer,
    explanation: `${answer}. Each letter A–G appears once.`,
  }
}

export function questionMinorSeventh(scale: ScaleDef, rng: () => number = Math.random): QuizQuestion {
  const harmonic = octaveNotes(scale.id, 'harmonic')
  const natural = octaveNotes(scale.id, 'natural')
  const answerNote = harmonic[6]
  const answer = formatBilingual(answerNote)
  const pool = [natural[6], natural[5], harmonic[5], harmonic[0], harmonic[4]]
  const distractors = pool
    .map(formatBilingual)
    .filter((label) => label !== answer)
    .map((label) => choice(label))
  const names = bilingual(answerNote)
  return {
    id: `minor-degree:${scale.id}`,
    category: 'minor-degree',
    subjectId: scale.id,
    prompt: `What is the 7th note of ${scaleTitle(scale)} harmonic?`,
    choices: withChoices(choice(answer, names.french), distractors, rng),
    answerId: answer,
    explanation: `Harmonic minor raises the 7th, so it is ${names.english} (${names.french}), not ${noteLabel(natural[6])}.`,
  }
}

export function questionAddedAccidental(
  step: { from: ScaleDef; to: ScaleDef; added: { english: string } },
  kind: 'sharp' | 'flat',
  rng: () => number = Math.random,
): QuizQuestion {
  const answer = step.added.english
  const pool = (kind === 'sharp' ? sharpSteps() : flatSteps()).map((item) => formatBilingual(item.added).split(' · ')[0])
  const distractors = [...new Set(pool)].filter((label) => label !== answer).map((label) => choice(label))
  const direction = kind === 'sharp' ? 'up a fifth' : 'up a fourth'
  return {
    id: `added-accidental:${step.from.id}:${step.to.id}`,
    category: 'added-accidental',
    subjectId: step.from.id,
    prompt: `Which ${kind} is added going from ${scaleTitle(step.from)} to ${scaleTitle(step.to)} (${direction})?`,
    choices: withChoices(choice(answer), distractors, rng),
    answerId: answer,
    explanation:
      kind === 'sharp'
        ? `${answer} is the new sharp, and it is the 7th of ${scaleTitle(step.to)}.`
        : `${answer} is the new flat, and it is the 4th of ${scaleTitle(step.to)}.`,
  }
}

function getMajor(id: string): ScaleDef {
  const scale = majors().find((item) => item.id === id)
  if (!scale) throw new Error(id)
  return scale
}

function getMinor(id: string): ScaleDef {
  const scale = minors().find((item) => item.id === id)
  if (!scale) throw new Error(id)
  return scale
}

function addedSteps(maxAccidentals: number): { step: { from: ScaleDef; to: ScaleDef; added: ReturnType<typeof addedAccidental> }; kind: 'sharp' | 'flat' }[] {
  const sharps = sharpSteps()
    .filter((step) => withinAccidentals(step.from, maxAccidentals) && withinAccidentals(step.to, maxAccidentals))
    .map((step) => ({ step, kind: 'sharp' as const }))
  const flats = flatSteps()
    .filter((step) => withinAccidentals(step.from, maxAccidentals) && withinAccidentals(step.to, maxAccidentals))
    .map((step) => ({ step, kind: 'flat' as const }))
  return [...sharps, ...flats]
}

export function generateQuestion(options: {
  categories?: readonly QuizCategory[]
  maxAccidentals: number
  rng?: () => number
}): QuizQuestion {
  const rng = options.rng ?? Math.random
  const categories = options.categories?.length ? [...options.categories] : [...QUIZ_CATEGORIES]
  const order = shuffle(categories, rng)
  for (const category of order) {
    const question = questionForCategory(category, options.maxAccidentals, rng)
    if (question) return question
  }
  const fallback = majors().filter((scale) => withinAccidentals(scale, options.maxAccidentals))
  return questionSignatureCount(fallback[0] ?? getMajor('C'), rng)
}

function questionForCategory(category: QuizCategory, maxAccidentals: number, rng: () => number): QuizQuestion | null {
  if (category === 'signature-count' || category === 'signature-key' || category === 'relative-minor' || category === 'spell-scale') {
    const pool = majors().filter((scale) => withinAccidentals(scale, maxAccidentals))
    if (pool.length === 0) return null
    const scale = pool[Math.floor(rng() * pool.length)]
    if (category === 'signature-count') return questionSignatureCount(scale, rng)
    if (category === 'signature-key') return questionSignatureKey(scale, rng)
    if (category === 'relative-minor') return questionRelativeMinor(scale, rng)
    return questionSpellScale(scale, rng)
  }
  if (category === 'relative-major' || category === 'minor-degree') {
    const pool = minors().filter((scale) => withinAccidentals(scale, maxAccidentals))
    if (pool.length === 0) return null
    const scale = pool[Math.floor(rng() * pool.length)]
    return category === 'relative-major' ? questionRelativeMajor(scale, rng) : questionMinorSeventh(scale, rng)
  }
  const steps = addedSteps(maxAccidentals)
  if (steps.length === 0) return null
  const picked = steps[Math.floor(rng() * steps.length)]
  const added = picked.step.added
  if (!added) return null
  const names = bilingual(added)
  return questionAddedAccidental({ ...picked.step, added: { english: names.english } }, picked.kind, rng)
}

export function correctLabel(question: QuizQuestion): string {
  return question.choices.find((choice) => choice.id === question.answerId)?.label ?? ''
}
