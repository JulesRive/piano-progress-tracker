import { useEffect, useRef } from 'react'
import { isBlackPc, midiToScientific } from '../theory/music.ts'
import { useAudio } from '../audio/AudioProvider.tsx'

const WHITE_WIDTH = 34
const WHITE_HEIGHT = 122
const BLACK_WIDTH = 20
const BLACK_HEIGHT = 76
const LABEL_HEIGHT = 34

export interface KeyHighlight {
  midi: number
  finger: number
  hint?: string
  altered: boolean
  role: 'scale' | 'descending'
}

interface PianoKeyboardProps {
  startMidi: number
  endMidi: number
  highlights: KeyHighlight[]
  activeMidi: number | null
}

export function PianoKeyboard({ startMidi, endMidi, highlights, activeMidi }: PianoKeyboardProps) {
  const audio = useAudio()
  const timer = useRef<number | null>(null)
  const byMidi = new Map(highlights.map((highlight) => [highlight.midi, highlight]))
  const midis: number[] = []
  for (let midi = startMidi; midi <= endMidi; midi += 1) midis.push(midi)
  const whites = midis.filter((midi) => !isBlackPc(midi % 12))
  const whiteIndex = new Map(whites.map((midi, index) => [midi, index]))
  const leftPad = isBlackPc(startMidi % 12) ? 16 : 1
  const width = leftPad + whites.length * WHITE_WIDTH + 1
  const height = LABEL_HEIGHT + WHITE_HEIGHT

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  const playNow = (midi: number) => {
    cancel()
    void audio.unlock().then((running) => {
      if (running) audio.playPreview(midi)
    })
  }

  const schedule = (midi: number) => {
    cancel()
    timer.current = window.setTimeout(() => audio.playPreview(midi), 80)
  }

  return (
    <svg
      className="keyboard-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Two-octave keyboard"
    >
      {whites.map((midi) => {
        const index = whiteIndex.get(midi) ?? 0
        return (
          <KeyShape
            key={midi}
            midi={midi}
            x={leftPad + index * WHITE_WIDTH}
            y={LABEL_HEIGHT}
            width={WHITE_WIDTH}
            height={WHITE_HEIGHT}
            black={false}
            highlight={byMidi.get(midi)}
            active={midi === activeMidi}
            onEnter={() => schedule(midi)}
            onLeave={cancel}
            onPlay={() => playNow(midi)}
          />
        )
      })}
      {midis
        .filter((midi) => isBlackPc(midi % 12))
        .map((midi) => {
          const previous = whiteIndex.get(midi - 1)
          const x = previous === undefined ? 1 : leftPad + previous * WHITE_WIDTH + WHITE_WIDTH - BLACK_WIDTH / 2
          return (
            <KeyShape
              key={midi}
              midi={midi}
              x={x}
              y={LABEL_HEIGHT}
              width={BLACK_WIDTH}
              height={BLACK_HEIGHT}
              black
              highlight={byMidi.get(midi)}
              active={midi === activeMidi}
              onEnter={() => schedule(midi)}
              onLeave={cancel}
              onPlay={() => playNow(midi)}
            />
          )
        })}
      {highlights.map((highlight) => {
        const x = keyCenter(highlight.midi, whiteIndex, leftPad)
        return (
          <g key={`label-${highlight.midi}`} className="key-labels" aria-hidden="true">
            <text className="finger-label" x={x} y={14}>
              {highlight.finger}
            </text>
            {highlight.hint ? (
              <text className="hint-label" x={x} y={26}>
                {highlight.hint}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function keyCenter(midi: number, whiteIndex: Map<number, number>, leftPad: number): number {
  if (!isBlackPc(midi % 12)) {
    const index = whiteIndex.get(midi) ?? 0
    return leftPad + index * WHITE_WIDTH + WHITE_WIDTH / 2
  }
  const previous = whiteIndex.get(midi - 1)
  const x = previous === undefined ? 1 : leftPad + previous * WHITE_WIDTH + WHITE_WIDTH - BLACK_WIDTH / 2
  return x + BLACK_WIDTH / 2
}

function KeyShape({
  midi,
  x,
  y,
  width,
  height,
  black,
  highlight,
  active,
  onEnter,
  onLeave,
  onPlay,
}: {
  midi: number
  x: number
  y: number
  width: number
  height: number
  black: boolean
  highlight?: KeyHighlight
  active: boolean
  onEnter: () => void
  onLeave: () => void
  onPlay: () => void
}) {
  const classes = ['key-shape', black ? 'key-black' : 'key-white']
  if (highlight?.role === 'descending') classes.push('key-down')
  else if (highlight?.altered) classes.push('key-altered')
  else if (highlight) classes.push('key-scale')
  if (active) classes.push('key-active')
  const name = highlight?.hint ?? midiToScientific(midi).replace('#', '♯')
  return (
    <rect
      className={classes.join(' ')}
      x={x}
      y={y}
      width={width - (black ? 0 : 1)}
      height={height}
      rx={black ? 0 : 2}
      role="button"
      tabIndex={0}
      aria-label={name}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onEnter()
      }}
      onPointerLeave={onLeave}
      onPointerDown={(event) => {
        if (event.pointerType !== 'mouse') onPlay()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPlay()
        }
      }}
    />
  )
}
