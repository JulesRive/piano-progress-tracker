import { SCALE_IDS, type MinorForm } from '../theory/music.ts'

export type ScaleStatus = 'not-started' | 'in-progress' | 'mastered'

export interface ScaleEntry {
  status: ScaleStatus
  notes?: string
  /** Local calendar date, YYYY-MM-DD. */
  lastPracticed?: string
  form?: MinorForm
}

export interface PieceEntry {
  id: string
  title: string
  composer?: string
  status?: ScaleStatus
  sheetUrl?: string
  notes?: string
}

export interface ResourceEntry {
  id: string
  title: string
  url?: string
  kind?: 'sheet' | 'article' | 'video' | 'book' | 'other'
  notes?: string
}

export interface QuizCategoryStats {
  answered: number
  correct: number
}

export interface QuizStats {
  /** Most correct answers in one sitting. */
  bestScore: number
  bestStreak: number
  answered: number
  correct: number
  byCategory: Record<string, QuizCategoryStats>
}

export interface ProgressFile {
  version: 2
  scales: Record<string, ScaleEntry>
  pieces: PieceEntry[]
  resources: ResourceEntry[]
  quiz: QuizStats
}

export const PROGRESS_KEY = 'ppt.progress.v1'
export const AUDIO_KEY = 'ppt.audio.v1'
export const THEME_KEY = 'ppt.theme.v1'
export const TOKEN_KEY = 'ppt.githubToken.v1'

const STATUSES: ScaleStatus[] = ['not-started', 'in-progress', 'mastered']
const FORMS: MinorForm[] = ['natural', 'harmonic', 'melodic']
const DATE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, max)
}

function cleanScaleEntry(value: unknown): ScaleEntry {
  const record = isRecord(value) ? value : {}
  const status = STATUSES.includes(record.status as ScaleStatus) ? (record.status as ScaleStatus) : 'not-started'
  const entry: ScaleEntry = { status }
  const notes = cleanString(record.notes, 4000)
  if (notes) entry.notes = notes
  if (typeof record.lastPracticed === 'string' && DATE.test(record.lastPracticed)) {
    entry.lastPracticed = record.lastPracticed
  }
  if (FORMS.includes(record.form as MinorForm)) entry.form = record.form as MinorForm
  return entry
}

function cleanPieces(value: unknown): PieceEntry[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((item, index) => {
    const piece: PieceEntry = {
      id: cleanString(item.id, 80) ?? `piece-${index + 1}`,
      title: cleanString(item.title, 200) ?? 'Untitled',
    }
    const composer = cleanString(item.composer, 200)
    if (composer) piece.composer = composer
    if (STATUSES.includes(item.status as ScaleStatus)) piece.status = item.status as ScaleStatus
    const sheetUrl = cleanString(item.sheetUrl, 500)
    if (sheetUrl) piece.sheetUrl = sheetUrl
    const notes = cleanString(item.notes, 4000)
    if (notes) piece.notes = notes
    return piece
  })
}

function cleanResources(value: unknown): ResourceEntry[] {
  if (!Array.isArray(value)) return []
  const kinds = ['sheet', 'article', 'video', 'book', 'other'] as const
  return value.filter(isRecord).map((item, index) => {
    const resource: ResourceEntry = {
      id: cleanString(item.id, 80) ?? `resource-${index + 1}`,
      title: cleanString(item.title, 200) ?? 'Untitled',
    }
    const url = cleanString(item.url, 500)
    if (url) resource.url = url
    if (kinds.includes(item.kind as (typeof kinds)[number])) resource.kind = item.kind as ResourceEntry['kind']
    const notes = cleanString(item.notes, 4000)
    if (notes) resource.notes = notes
    return resource
  })
}

export function emptyQuiz(): QuizStats {
  return { bestScore: 0, bestStreak: 0, answered: 0, correct: 0, byCategory: {} }
}

function cleanQuiz(value: unknown): QuizStats {
  const quiz = emptyQuiz()
  if (!isRecord(value)) return quiz
  const bestScore = Number(value.bestScore)
  const bestStreak = Number(value.bestStreak)
  const answered = Number(value.answered)
  const correct = Number(value.correct)
  if (Number.isFinite(bestScore) && bestScore > 0) quiz.bestScore = Math.floor(bestScore)
  if (Number.isFinite(bestStreak) && bestStreak > 0) quiz.bestStreak = Math.floor(bestStreak)
  if (Number.isFinite(answered) && answered > 0) quiz.answered = Math.floor(answered)
  if (Number.isFinite(correct) && correct > 0) quiz.correct = Math.min(quiz.answered, Math.floor(correct))
  if (isRecord(value.byCategory)) {
    for (const [category, stats] of Object.entries(value.byCategory)) {
      if (!isRecord(stats)) continue
      const categoryAnswered = Math.max(0, Math.floor(Number(stats.answered)) || 0)
      const categoryCorrect = Math.min(categoryAnswered, Math.max(0, Math.floor(Number(stats.correct)) || 0))
      if (categoryAnswered > 0) quiz.byCategory[category.slice(0, 40)] = { answered: categoryAnswered, correct: categoryCorrect }
    }
  }
  return quiz
}

export function emptyProgress(): ProgressFile {
  const scales: Record<string, ScaleEntry> = {}
  for (const id of SCALE_IDS) scales[id] = { status: 'not-started' }
  return { version: 2, scales, pieces: [], resources: [], quiz: emptyQuiz() }
}

/** Accepts version 1 files (no quiz block) and anything newer that still has scales. */
export function normalizeProgress(raw: unknown): ProgressFile {
  const base = emptyProgress()
  if (!isRecord(raw)) return base
  const source = isRecord(raw.scales) ? raw.scales : {}
  for (const id of Object.keys(source)) {
    base.scales[id] = cleanScaleEntry(source[id])
  }
  base.pieces = cleanPieces(raw.pieces)
  base.resources = cleanResources(raw.resources)
  base.quiz = cleanQuiz(raw.quiz)
  return base
}

export function applyQuizAnswer(
  stats: QuizStats,
  category: string,
  correct: boolean,
  sessionCorrect: number,
  streak: number,
): QuizStats {
  const byCategory = { ...stats.byCategory }
  const previous = byCategory[category] ?? { answered: 0, correct: 0 }
  byCategory[category] = {
    answered: previous.answered + 1,
    correct: previous.correct + (correct ? 1 : 0),
  }
  return {
    bestScore: Math.max(stats.bestScore, sessionCorrect),
    bestStreak: Math.max(stats.bestStreak, streak),
    answered: stats.answered + 1,
    correct: stats.correct + (correct ? 1 : 0),
    byCategory,
  }
}

export function statusOf(progress: ProgressFile, id: string): ScaleStatus {
  return progress.scales[id]?.status ?? 'not-started'
}

export function countByStatus(progress: ProgressFile): Record<ScaleStatus, number> {
  const counts: Record<ScaleStatus, number> = { mastered: 0, 'in-progress': 0, 'not-started': 0 }
  for (const id of SCALE_IDS) counts[statusOf(progress, id)] += 1
  return counts
}

/**
 * Walk clockwise from C and continue the first in-progress scale.
 * If nothing is underway, suggest the first scale not yet started.
 */
export function nextUp(progress: ProgressFile): string | null {
  const inProgress = SCALE_IDS.find((id) => statusOf(progress, id) === 'in-progress')
  if (inProgress) return inProgress
  return SCALE_IDS.find((id) => statusOf(progress, id) === 'not-started') ?? null
}

export function todayISO(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export async function loadBundledProgress(): Promise<ProgressFile> {
  const response = await fetch(`${import.meta.env.BASE_URL}progress.json`)
  if (!response.ok) throw new Error('Could not load progress.json')
  return normalizeProgress(await response.json())
}

export function readStoredProgress(): ProgressFile | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return null
    return normalizeProgress(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeStoredProgress(progress: ProgressFile): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}
