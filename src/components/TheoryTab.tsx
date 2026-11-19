import { useState } from 'react'
import { useAudio } from '../audio/AudioProvider.tsx'
import { PianoKeyboard, type KeyHighlight } from './PianoKeyboard.tsx'
import {
  NOTE_GUIDE,
  SHARP_ORDER,
  addToSeven,
  addedAccidental,
  chordMap,
  clockwiseMajor,
  counterMajor,
  formatBilingual,
  keyNamedBySignature,
  lowerTetrachord,
  majors,
  minors,
  octaveNotes,
  parallelMajor,
  sharesStandardMajorFingering,
  stepKinds,
  stepText,
  upperTetrachord,
} from '../theory/facts.ts'
import {
  FRENCH,
  MAJOR_STEPS,
  frenchNote,
  frenchScaleTitle,
  getScale,
  needsSpellingHint,
  noteLabel,
  scaleTitle,
  signatureNotes,
  type MinorForm,
  type ScaleDef,
  type SpelledNote,
} from '../theory/music.ts'

export function TheoryTab() {
  return (
    <div className="theory">
      <header className="theory-intro">
        <h2>Theory</h2>
        <p>English note names, with the French solfège next to them. Sharp is dièse, flat is bémol.</p>
        <ul className="note-guide">
          {NOTE_GUIDE.map((note) => (
            <li key={note.english}>
              <strong>{note.english}</strong>
              <span>{note.french}</span>
            </li>
          ))}
        </ul>
      </header>
      <MajorBuilder />
      <Signatures />
      <MinorCompare />
      <CircleNotes />
      <FingeringTips />
    </div>
  )
}

function MajorBuilder() {
  const [id, setId] = useState('C')
  const [shown, setShown] = useState(1)
  const notes = octaveNotes(id)
  const steps = stepKinds(MAJOR_STEPS)
  const next = clockwiseMajor(id)
  const visible = notes.slice(0, shown)
  const play = usePlay()

  return (
    <section className="theory-card">
      <h3>Rebuilding a major scale</h3>
      <p>
        The pattern is <strong>T T S · T · T T S</strong>. Two identical tetrachords
        (tone, tone, semitone) joined by a tone. Each letter A–G is used once, so F major is spelled with B♭, not A♯,
        and F♯ major needs E♯, not F. A major key never mixes sharps and flats.
      </p>
      <KeySelect scales={majors()} value={id} onChange={(nextId) => { setId(nextId); setShown(1) }} />
      <ol className="step-row">
        {notes.map((note, index) => (
          <li key={`${note.letter}${index}`} className={index < shown ? 'is-on' : ''}>
            <span>{index < shown ? noteLabel(note) : '·'}</span>
            <small>{index < shown ? frenchNote(note) : ''}</small>
            {index < 7 ? <em className={index < shown - 1 ? 'is-on' : ''}>{stepText(steps[index])}</em> : null}
          </li>
        ))}
      </ol>
      <div className="button-row">
        <button type="button" className="secondary" onClick={() => setShown(1)}>Start</button>
        <button type="button" className="secondary" onClick={() => setShown((count) => Math.min(8, count + 1))}>Next step</button>
        <button type="button" className="primary" onClick={() => play(midisOf(visible))}>Play</button>
      </div>
      <DemoKeys notes={visible} altered={new Set()} />
      {shown === 8 ? (
        <p className="theory-note">
          Lower tetrachord {lowerTetrachord(id).map(noteLabel).join(' ')}. Upper tetrachord{' '}
          {upperTetrachord(id).map(noteLabel).join(' ')}, which is the lower tetrachord of {scaleTitle(next)} (
          {lowerTetrachord(next.id).map(noteLabel).join(' ')}).
        </p>
      ) : null}
    </section>
  )
}

function Signatures() {
  const [id, setId] = useState('G')
  const scale = getScale(id)
  const accidentals = signatureNotes(scale.fifths)
  const named = keyNamedBySignature(scale.fifths)
  const pair = addToSeven(scale.letter)

  return (
    <section className="theory-card">
      <h3>Key signatures</h3>
      <p>
        Sharps go <strong>F C G D A E B</strong> — Father Charles Goes Down And Ends Battle. In French that is{' '}
        {SHARP_ORDER.map((letter) => FRENCH[letter]).join(' ')}. Flats are the same line backwards:{' '}
        <strong>B E A D G C F</strong>, Battle Ends And Down Goes Charles’ Father.
      </p>
      <KeySelect scales={majors()} value={id} onChange={setId} />
      <p className="sig-order" aria-label="Accidentals in order">
        {(scale.fifths >= 0 ? SHARP_ORDER : ['B', 'E', 'A', 'D', 'G', 'C', 'F'] as const).map((letter) => {
          const active = accidentals.some((note) => note.letter === letter)
          return <span key={letter} className={active ? 'is-on' : ''}>{letter} <small>{FRENCH[letter]}</small></span>
        })}
      </p>
      <p>
        {scale.fifths > 0
          ? `The last sharp plus a semitone names the key: ${formatBilingual(accidentals.at(-1)!)} leads to ${scaleTitle(scale)}.`
          : scale.fifths === -1
            ? 'One flat is F major. That one is worth memorizing; the second-to-last-flat rule needs at least two flats.'
            : scale.fifths < -1
              ? `The second-to-last flat names the key: ${formatBilingual(accidentals[accidentals.length - 2])}.`
              : 'C major has an empty signature.'}{' '}
        {named ? `Shortcut check: ${scaleTitle(named)}.` : ''}
      </p>
      {pair ? (
        <p className="theory-note">
          Add to 7: {scale.letter} major has {pair.sharpFifths} sharp{pair.sharpFifths === 1 ? '' : 's'}, and the flat key on
          the same letter has {pair.flatFifths} flat{pair.flatFifths === 1 ? '' : 's'}.
        </p>
      ) : (
        <p className="theory-note">C major is the zero point, so it has no flat twin in this rule.</p>
      )}
    </section>
  )
}

function MinorCompare() {
  const [id, setId] = useState('Am')
  const [form, setForm] = useState<MinorForm>('harmonic')
  const notes = octaveNotes(id, form, 'up')
  const natural = octaveNotes(id, 'natural')
  const altered = new Set(notes.slice(0, 7).flatMap((note, index) => (note.pc === natural[index].pc ? [] : [index])))
  const parallel = parallelMajor(id)
  const play = usePlay()
  const pattern = stepTextPattern(form)

  return (
    <section className="theory-card">
      <h3>The three minors</h3>
      <p>
        The relative minor is 3 semitones down, the 6th degree of the major. The relative major is 3 semitones up.
        The parallel major — same tonic, major instead of minor — has 3 more sharps, or 3 fewer flats.
      </p>
      <KeySelect scales={minors()} value={id} onChange={setId} />
      <div className="segmented" role="radiogroup" aria-label="Minor form">
        {(['natural', 'harmonic', 'melodic'] as const).map((item) => (
          <button key={item} type="button" className={form === item ? 'is-on' : ''} onClick={() => setForm(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <p>
        All three share the lower tetrachord {natural.slice(0, 4).map(noteLabel).join(' ')}. Only the upper half changes.
        Pattern going up: <strong>{pattern}</strong>.
      </p>
      <ul className="theory-list">
        <li><strong>Natural</strong> — sad, modal. No raised degrees. Pattern T S T T S T T.</li>
        <li><strong>Harmonic</strong> — raises the 7th so the V chord is major and there is a leading tone. The gap before it is an augmented 2nd (1½), which gives the “Middle Eastern” colour. Pattern T S T T S 1½ S.</li>
        <li><strong>Melodic</strong> — raises 6 and 7 on the way up, so that awkward augmented 2nd disappears and the scale climbs almost like a major. Coming down, it is natural again.</li>
      </ul>
      <p className="theory-note">
        Parallel major of {scaleTitle(getScale(id))} is {scaleTitle(parallel)} ({frenchScaleTitle(parallel)}). Relative major is{' '}
        {scaleTitle(getScale(getScale(id).relativeId))}.
      </p>
      <DemoKeys notes={notes} altered={altered} />
      <button type="button" className="primary" onClick={() => play(midisOf(notes))}>Play {form}</button>
    </section>
  )
}

function CircleNotes() {
  const [id, setId] = useState('C')
  const next = clockwiseMajor(id)
  const previous = counterMajor(id)
  const forward = addedAccidental(id, next.id)
  const back = addedAccidental(id, previous.id)
  const map = chordMap(id)

  return (
    <section className="theory-card">
      <h3>Circle of fifths</h3>
      <p>
        Clockwise is up a fifth and one more sharp. Counter-clockwise is up a fourth and one more flat. The new sharp
        is the 7th of the new key. The new flat is the 4th of the new key. Neighbours differ by a single note.
        F♯ wraps around to D♭, and the other enharmonic pairs are C♯/D♭ and B/C♭.
      </p>
      <KeySelect scales={majors()} value={id} onChange={setId} />
      <div className="meta-grid">
        <div>
          <span className="meta-label">Counter-clockwise · IV</span>
          <strong>{scaleTitle(previous)}</strong>
          <small>{back ? `New flat ${formatBilingual(back)}` : 'Crosses the enharmonic join'}</small>
        </div>
        <div>
          <span className="meta-label">Clockwise · V</span>
          <strong>{scaleTitle(next)}</strong>
          <small>{forward ? `New sharp ${formatBilingual(forward)}` : 'Crosses the enharmonic join'}</small>
        </div>
      </div>
      <p>
        As a chord map in {scaleTitle(map.I)}: IV is {scaleTitle(map.IV)}, V is {scaleTitle(map.V)}. Their relative
        minors are ii {scaleTitle(map.ii)}, iii {scaleTitle(map.iii)}, and vi {scaleTitle(map.vi)}.
      </p>
    </section>
  )
}

function FingeringTips() {
  return (
    <section className="theory-card">
      <h3>Fingering tips</h3>
      <p>Thumbs take white keys. Longer fingers take the black keys. C, G, D, A, and E major share the right-hand grouping 1 2 3 1 2 3 4. Learn each major with its relative minor.</p>
      <ul className="pair-list">
        {majors().map((scale) => (
          <li key={scale.id}>
            <strong>{scaleTitle(scale)}</strong>
            <span>{frenchScaleTitle(scale)}</span>
            <span>with {scaleTitle(getScale(scale.relativeId))}</span>
            {sharesStandardMajorFingering(scale.id) ? (
              <span className="hand-pair">
                <em>Left hand (LH) 54321 321</em>
                <em>Right hand (RH) 123 1234</em>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function KeySelect({ scales, value, onChange }: { scales: ScaleDef[]; value: string; onChange: (id: string) => void }) {
  return (
    <label className="theory-picker">
      Key
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {scales.map((scale) => (
          <option key={scale.id} value={scale.id}>
            {scaleTitle(scale)} · {frenchScaleTitle(scale)}
          </option>
        ))}
      </select>
    </label>
  )
}

function DemoKeys({ notes, altered }: { notes: SpelledNote[]; altered: Set<number> }) {
  if (notes.length === 0) return null
  const start = 60 + notes[0].pc
  const highlights: KeyHighlight[] = notes.map((note, index) => ({
    midi: index === notes.length - 1 && notes.length > 1 && note.pc === notes[0].pc ? start + 12 : start + ((note.pc - notes[0].pc + 12) % 12),
    finger: 0,
    hint: needsSpellingHint(note) ? noteLabel(note) : undefined,
    altered: altered.has(index),
    role: 'scale',
  }))
  return (
    <PianoKeyboard startMidi={start} endMidi={start + 12} highlights={highlights} activeMidi={null} />
  )
}

function usePlay() {
  const audio = useAudio()
  return (midis: number[]) => {
    void audio.unlock().then((running) => {
      if (!running) return
      const start = audio.currentTime()
      if (start === null) return
      midis.forEach((midi, index) => audio.playScaleNote(midi, start + index * 0.38, 0.34))
    })
  }
}

function midisOf(notes: SpelledNote[]): number[] {
  if (notes.length === 0) return []
  const start = 60 + notes[0].pc
  return notes.map((note, index) =>
    index === notes.length - 1 && note.pc === notes[0].pc ? start + 12 : start + ((note.pc - notes[0].pc + 12) % 12),
  )
}

function stepTextPattern(form: MinorForm): string {
  const steps = form === 'harmonic' ? ['T', 'S', 'T', 'T', 'S', '1½', 'S'] : form === 'melodic' ? ['T', 'S', 'T', 'T', 'T', 'T', 'S'] : ['T', 'S', 'T', 'T', 'S', 'T', 'T']
  return steps.join(' ')
}
