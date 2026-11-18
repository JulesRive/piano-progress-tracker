import { useEffect, useState } from 'react'
import { useProgress } from '../progress/ProgressProvider.tsx'
import {
  CATEGORY_LABELS,
  QUIZ_CATEGORIES,
  generateQuestion,
  type QuizCategory,
  type QuizQuestion,
} from '../theory/quiz.ts'

export function QuizTab() {
  const { progress, recordQuiz } = useProgress()
  const [categories, setCategories] = useState<QuizCategory[]>([...QUIZ_CATEGORIES])
  const [maxAccidentals, setMaxAccidentals] = useState(3)
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [sessionAnswered, setSessionAnswered] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    setPicked(null)
    setQuestion(categories.length ? generateQuestion({ categories, maxAccidentals }) : null)
  }, [categories, maxAccidentals])

  const answer = (id: string) => {
    if (!question || picked) return
    const correct = id === question.answerId
    const nextStreak = correct ? streak + 1 : 0
    const nextCorrect = sessionCorrect + (correct ? 1 : 0)
    setPicked(id)
    setStreak(nextStreak)
    setSessionCorrect(nextCorrect)
    setSessionAnswered((count) => count + 1)
    recordQuiz(question.category, correct, nextCorrect, nextStreak)
  }

  const next = () => {
    setPicked(null)
    setQuestion(categories.length ? generateQuestion({ categories, maxAccidentals }) : null)
  }

  const toggle = (category: QuizCategory) => {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  const quiz = progress?.quiz

  return (
    <div className="quiz">
      <header className="theory-intro">
        <h2>Quiz</h2>
        <p>
          This sitting: {sessionCorrect}/{sessionAnswered || 0}
          {sessionAnswered ? ` · streak ${streak}` : ''}. Best score {quiz?.bestScore ?? 0}, best streak {quiz?.bestStreak ?? 0}.
          Saved with the rest of your progress.
        </p>
      </header>
      <section className="theory-card">
        <fieldset>
          <legend>Categories</legend>
          <div className="check-grid">
            {QUIZ_CATEGORIES.map((category) => (
              <label key={category}>
                <input type="checkbox" checked={categories.includes(category)} onChange={() => toggle(category)} />
                {CATEGORY_LABELS[category]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="theory-picker">
          Difficulty: up to {maxAccidentals} accidental{maxAccidentals === 1 ? '' : 's'}
          <input
            type="range"
            min={0}
            max={6}
            value={maxAccidentals}
            aria-label="Maximum accidentals"
            onChange={(event) => setMaxAccidentals(Number(event.target.value))}
          />
        </label>
      </section>
      {question ? (
        <section className="theory-card" aria-live="polite">
          <p className="eyebrow">{CATEGORY_LABELS[question.category]}</p>
          <h3>{question.prompt}</h3>
          <div className="quiz-choices">
            {question.choices.map((choice) => {
              const state = picked ? (choice.id === question.answerId ? 'is-right' : choice.id === picked ? 'is-wrong' : '') : ''
              return (
                <button key={choice.id} type="button" className={state} disabled={picked !== null} onClick={() => answer(choice.id)}>
                  <span>{choice.label}</span>
                  {picked && choice.detail ? <small>{choice.detail}</small> : null}
                </button>
              )
            })}
          </div>
          {picked ? (
            <div className="quiz-feedback">
              <p>{picked === question.answerId ? 'Correct.' : 'Not quite.'} {question.explanation}</p>
              <button type="button" className="primary" onClick={next}>Next question</button>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="theory-note">Choose at least one category.</p>
      )}
    </div>
  )
}
