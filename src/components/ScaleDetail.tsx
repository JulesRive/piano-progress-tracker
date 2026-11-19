import { useEffect, useRef, useState } from 'react'
import { useAudio } from '../audio/AudioProvider.tsx'
import { getPiano } from '../audio/engine.ts'
import { activeNoteIndex, takeScheduleSlice, type ScheduleCursor } from '../audio/schedule.ts'
import { todayISO, type ScaleEntry, type ScaleStatus } from '../progress/model.ts'
import {
  fingerSequence,
  formatFingers,
  frenchScaleTitle,
  frenchSignature,
  getScale,
  playbackTones,
  scaleRun,
  scaleTitle,
  signatureSummary,
  type Hand,
  type MinorForm,
  type ScaleTone,
} from '../theory/music.ts'
import { PianoKeyboard, type KeyHighlight } from './PianoKeyboard.tsx'

const STATUS_OPTIONS: { id: ScaleStatus; label: string }[] = [
  { id: 'not-started', label: 'Not started' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'mastered', label: 'Mastered' },
]

const FORM_OPTIONS: { id: MinorForm; label: string }[] = [
  { id: 'natural', label: 'Natural' },
  { id: 'harmonic', label: 'Harmonic' },
  { id: 'melodic', label: 'Melodic' },
]

interface ScaleDetailProps {
  scaleId: string
  entry: ScaleEntry
  onStatus: (status: ScaleStatus) => void
  onForm: (form: MinorForm) => void
  onNotes: (notes: string) => void
  onPracticed: (date: string) => void
  onOpenScale: (id: string) => void
}

interface ActiveNote {
  index: number
  midi: number
  finger: number
  label: string
  french: string
}

export function ScaleDetail({ scaleId, entry, onStatus, onForm, onNotes, onPracticed, onOpenScale }: ScaleDetailProps) {
  const audio = useAudio()
  const scale = getScale(scaleId)
  const form = entry.form ?? 'harmonic'
  const [hand, setHand] = useState<Hand>('rh')
  const [bpm, setBpm] = useState(72)
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState<ActiveNote | null>(null)
  const tokenRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const bpmRef = useRef(bpm)

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  const run = scaleRun(scale.id, hand, form)
  const sequence = playbackTones(run)
  const highlights = keyboardHighlights(run.ascending, run.descending, scale.mode === 'minor' && form === 'melodic')
  const relative = getScale(scale.relativeId)

  useEffect(() => {
    return () => {
      tokenRef.current += 1
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
      getPiano().stopAll()
    }
  }, [scaleId, hand, form])

  const stop = () => {
    tokenRef.current += 1
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    audio.stopAll()
    setPlaying(false)
    setActive(null)
  }

  const play = () => {
    void audio.unlock().then((running) => {
      if (!running) return
      stop()
      const token = tokenRef.current
      const tones = sequence
      const start = audio.currentTime()
      if (start === null || tones.length === 0) return
      let cursor: ScheduleCursor = { nextIndex: 0, lastTime: start, primed: false }
      const starts: number[] = []
      let shown = -1
      const tick = () => {
        if (tokenRef.current !== token) return
        const now = audio.currentTime()
        if (now === null) return
        const slice = takeScheduleSlice(cursor, tones.length, now, bpmRef.current)
        cursor = slice.cursor
        for (const note of slice.notes) {
          const tone = tones[note.index]
          audio.playScaleNote(tone.midi, note.when, note.duration)
          starts[note.index] = note.when
        }
        const index = activeNoteIndex(starts, now)
        if (index !== shown && index >= 0) {
          shown = index
          const tone = tones[index]
          setActive({ index, midi: tone.midi, finger: tone.finger, label: tone.label, french: tone.french })
        }
        const lastStart = starts[tones.length - 1]
        if (cursor.nextIndex >= tones.length && lastStart !== undefined && now >= lastStart + 0.12) {
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
          }
          setPlaying(false)
          setActive(null)
        }
      }
      setPlaying(true)
      tick()
      const timer = window.setInterval(tick, 25)
      if (tokenRef.current !== token) {
        window.clearInterval(timer)
        return
      }
      timerRef.current = timer
    })
  }

  return (
    <section className="detail" id="scale-detail">
      <header className="detail-head">
        <p className="eyebrow">{scale.mode === 'major' ? 'Major' : 'Minor'}</p>
        <h2>{scaleTitle(scale)}</h2>
        <p className="french-title">{frenchScaleTitle(scale)}</p>
        {scale.enharmonic ? (
          <p className="enharmonic">
            Also {scale.enharmonic}
            {scale.enharmonicFrench ? ` · ${scale.enharmonicFrench}` : ''}
          </p>
        ) : null}
      </header>

      <div className="segmented" role="radiogroup" aria-label="Status">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={entry.status === option.id}
            className={entry.status === option.id ? `is-on status-${option.id}` : `status-${option.id}`}
            onClick={() => onStatus(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="meta-grid">
        <div>
          <span className="meta-label">Key signature</span>
          <strong>{signatureSummary(scale.fifths)}</strong>
          {frenchSignature(scale.fifths) ? <small>{frenchSignature(scale.fifths)}</small> : null}
        </div>
        <button type="button" className="relative-link" onClick={() => onOpenScale(relative.id)}>
          <span className="meta-label">{scale.mode === 'major' ? 'Relative minor' : 'Relative major'}</span>
          <strong>{scaleTitle(relative)}</strong>
          <small>{frenchScaleTitle(relative)}</small>
        </button>
      </div>

      {scale.mode === 'minor' ? (
        <div className="form-block">
          <div className="segmented" role="radiogroup" aria-label="Minor form">
            {FORM_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={form === option.id}
                className={form === option.id ? 'is-on' : ''}
                onClick={() => onForm(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="form-note">
            {form === 'harmonic'
              ? 'Harmonic minor raises the 7th. That raised note is highlighted.'
              : form === 'melodic'
                ? 'Melodic minor raises 6 and 7 on the way up, then comes down as the natural minor.'
                : 'Natural minor keeps the key signature, with no raised degrees.'}
          </p>
        </div>
      ) : null}

      <NoteRow title="Ascending" tones={run.ascending} activeIndex={active && active.index < 15 ? active.index : null} />
      {scale.mode === 'minor' && form === 'melodic' ? (
        <NoteRow
          title="Descending"
          tones={run.descending}
          activeIndex={active && active.index >= 15 ? active.index - 14 : null}
        />
      ) : null}

      <div className="keyboard-block">
        <div className="keyboard-tools">
          <div className="segmented" role="radiogroup" aria-label="Hand">
            <button type="button" role="radio" aria-checked={hand === 'lh'} className={hand === 'lh' ? 'is-on' : ''} onClick={() => setHand('lh')}>
              Left hand (LH)
            </button>
            <button type="button" role="radio" aria-checked={hand === 'rh'} className={hand === 'rh' ? 'is-on' : ''} onClick={() => setHand('rh')}>
              Right hand (RH)
            </button>
          </div>
          <p className="now-playing" aria-live="polite">
            {active ? `${active.label} · ${active.french} · finger ${active.finger}` : 'Click a key to hear it'}
          </p>
        </div>
        <PianoKeyboard
          startMidi={run.ascending[0].midi}
          endMidi={run.ascending[14].midi}
          highlights={highlights}
          activeMidi={active?.midi ?? null}
        />
      </div>

      <div className="transport">
        <button type="button" className="primary" onClick={play}>
          Play scale
        </button>
        <button type="button" className="secondary" onClick={stop} disabled={!playing}>
          Stop
        </button>
        <label className="tempo">
          <span>Tempo {bpm} BPM</span>
          <input
            type="range"
            min={40}
            max={160}
            value={bpm}
            aria-label="Tempo in BPM"
            onChange={(event) => {
              const next = Number(event.target.value)
              bpmRef.current = next
              setBpm(next)
            }}
          />
        </label>
      </div>

      <div className="finger-grid">
        {(['lh', 'rh'] as const).map((item) => (
          <div key={item} className={item === hand ? 'finger-card is-current' : 'finger-card'}>
            <span>{item === 'lh' ? 'Left hand (LH)' : 'Right hand (RH)'}</span>
            <p>
              <i>Up</i> {formatFingers(fingerSequence(scale.id, item, form, 'up'))}
            </p>
            <p>
              <i>Down</i> {formatFingers(fingerSequence(scale.id, item, form, 'down'))}
            </p>
          </div>
        ))}
      </div>
      <p className="finger-hint">
        Standard two-octave fingerings. The keyboard shows the ascending fingers; descending uses the same finger on each key.
      </p>

      <div className="practice-fields">
        <label>
          Notes
          <textarea
            rows={3}
            value={entry.notes ?? ''}
            placeholder="Optional notes for this scale"
            onChange={(event) => onNotes(event.target.value)}
          />
        </label>
        <label>
          Last practiced
          <span className="date-row">
            <input type="date" value={entry.lastPracticed ?? ''} onChange={(event) => onPracticed(event.target.value)} />
            <button type="button" className="secondary" onClick={() => onPracticed(todayISO())}>
              Today
            </button>
          </span>
        </label>
      </div>
    </section>
  )
}

function NoteRow({ title, tones, activeIndex }: { title: string; tones: ScaleTone[]; activeIndex: number | null }) {
  return (
    <div className="note-block">
      <span className="meta-label">{title}</span>
      <ol className="note-row">
        {tones.map((tone, index) => (
          <li
            key={`${tone.midi}-${index}`}
            className={[tone.altered ? 'is-altered' : '', activeIndex === index ? 'is-active' : ''].filter(Boolean).join(' ')}
          >
            <span>{tone.label}</span>
            <small>{tone.french}</small>
          </li>
        ))}
      </ol>
    </div>
  )
}

function keyboardHighlights(ascending: ScaleTone[], descending: ScaleTone[], melodic: boolean): KeyHighlight[] {
  const map = new Map<number, KeyHighlight>()
  for (const tone of ascending) {
    map.set(tone.midi, {
      midi: tone.midi,
      finger: tone.finger,
      hint: tone.hint ? tone.label : undefined,
      altered: tone.altered,
      role: 'scale',
    })
  }
  if (melodic) {
    for (const tone of descending) {
      if (!map.has(tone.midi)) {
        map.set(tone.midi, {
          midi: tone.midi,
          finger: tone.finger,
          hint: tone.hint ? tone.label : undefined,
          altered: false,
          role: 'descending',
        })
      }
    }
  }
  return [...map.values()]
}
