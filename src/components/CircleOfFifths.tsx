import { useEffect, useRef } from 'react'
import { statusOf, type ProgressFile, type ScaleStatus } from '../progress/model.ts'
import {
  SCALES,
  frenchNote,
  frenchScaleTitle,
  getScale,
  scaleTitle,
  shortName,
  signatureBadge,
  signatureSummary,
  tonicOf,
  type ScaleDef,
} from '../theory/music.ts'
import { useAudio } from '../audio/AudioProvider.tsx'

const CX = 230
const CY = 230
const STATUS_LABEL: Record<ScaleStatus, string> = {
  mastered: 'Mastered',
  'in-progress': 'In progress',
  'not-started': 'Not started',
}

interface LabelLine {
  text: string
  kind: 'name' | 'sub' | 'sig'
}

interface CircleProps {
  progress: ProgressFile
  selectedId: string | null
  onSelect: (id: string) => void
}

export function CircleOfFifths({ progress, selectedId, onSelect }: CircleProps) {
  const audio = useAudio()
  const hoverTimer = useRef<number | null>(null)
  const mastered = SCALES.filter((scale) => statusOf(progress, scale.id) === 'mastered').length
  const radius = 104
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    return () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current)
    }
  }, [])

  const cancelHover = () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = null
  }

  const scheduleTonic = (scale: ScaleDef) => {
    cancelHover()
    const midi = 60 + tonicOf(scale).pc
    hoverTimer.current = window.setTimeout(() => audio.playPreview(midi), 150)
  }

  const playTonic = (scale: ScaleDef) => {
    cancelHover()
    audio.playPreview(60 + tonicOf(scale).pc)
  }

  const focusScale = (id: string) => {
    onSelect(id)
    window.requestAnimationFrame(() => document.getElementById(`scale-${id}`)?.focus())
  }

  return (
    <div className="circle-wrap">
      <h2 className="sr-only">Circle of fifths</h2>
      <svg className="circle-svg" viewBox="0 0 460 460" role="group" aria-label="Circle of fifths">
        <circle className="disc" cx={CX} cy={CY} r={216} />
        {SCALES.map((scale) => {
          const status = statusOf(progress, scale.id)
          const outer = scale.mode === 'major'
          const inner = outer ? 164 : 112
          const outerR = outer ? 210 : 156
          const labelR = outer ? 187 : 134
          const start = scale.position * 30 - 15 + 1.35
          const end = scale.position * 30 + 15 - 1.35
          const mid = scale.position * 30
          const point = polar(CX, CY, labelR, mid)
          const lines = labelLines(scale)
          return (
            <g
              key={scale.id}
              id={`scale-${scale.id}`}
              className={scale.id === selectedId ? 'wedge is-selected' : 'wedge'}
              role="button"
              tabIndex={0}
              aria-pressed={scale.id === selectedId}
              aria-label={`${scaleTitle(scale)}, ${frenchScaleTitle(scale)}, ${STATUS_LABEL[status]}, ${signatureSummary(scale.fifths)}`}
              onClick={() => onSelect(scale.id)}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') scheduleTonic(scale)
              }}
              onPointerLeave={cancelHover}
              onPointerDown={(event) => {
                if (event.pointerType !== 'mouse') playTonic(scale)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  playTonic(scale)
                  onSelect(scale.id)
                }
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault()
                  const delta = event.key === 'ArrowRight' ? 1 : -1
                  const next = SCALES.find(
                    (item) => item.mode === scale.mode && item.position === (scale.position + delta + 12) % 12,
                  )
                  if (next) {
                    playTonic(next)
                    focusScale(next.id)
                  }
                }
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  focusScale(getScale(scale.relativeId).id)
                }
              }}
            >
              <path className="segment" data-status={status} d={wedge(CX, CY, inner, outerR, start, end)} />
              <text className="wedge-label" x={point.x} y={point.y}>
                {lines.map((line, index) => (
                  <tspan
                    key={`${line.kind}-${line.text}`}
                    x={point.x}
                    dy={index === 0 ? `${-((lines.length - 1) * 0.58)}em` : '1.18em'}
                    className={line.kind}
                  >
                    {line.text}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}
        <circle className="hub" cx={CX} cy={CY} r={100} />
        <circle className="hub-track" cx={CX} cy={CY} r={radius} />
        <circle
          className="hub-arc"
          cx={CX}
          cy={CY}
          r={radius}
          strokeDasharray={`${(mastered / SCALES.length) * circumference} ${circumference}`}
        />
        <text className="hub-count" x={CX} y={CY - 4}>
          {mastered}
          <tspan className="hub-of">/{SCALES.length}</tspan>
        </text>
        <text className="hub-label" x={CX} y={CY + 20}>
          mastered
        </text>
      </svg>
    </div>
  )
}

function labelLines(scale: ScaleDef): LabelLine[] {
  const french = frenchNote(tonicOf(scale))
  if (scale.enharmonic) {
    if (scale.mode === 'major') {
      return [
        { text: `${shortName(scale)}/${scale.enharmonic}`, kind: 'name' },
        { text: french, kind: 'sub' },
        { text: signatureBadge(scale.fifths), kind: 'sig' },
      ]
    }
    return [
      { text: shortName(scale), kind: 'name' },
      { text: scale.enharmonic, kind: 'sub' },
      { text: french, kind: 'sig' },
    ]
  }
  const lines: LabelLine[] = [
    { text: shortName(scale), kind: 'name' },
    { text: french, kind: 'sub' },
  ]
  const badge = scale.mode === 'major' ? signatureBadge(scale.fifths) : ''
  if (badge) lines.push({ text: badge, kind: 'sig' })
  return lines
}

function polar(cx: number, cy: number, radius: number, degrees: number): { x: number; y: number } {
  const radians = ((degrees - 90) * Math.PI) / 180
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

function wedge(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
  const outerStart = polar(cx, cy, outer, start)
  const outerEnd = polar(cx, cy, outer, end)
  const innerEnd = polar(cx, cy, inner, end)
  const innerStart = polar(cx, cy, inner, start)
  const large = end - start > 180 ? 1 : 0
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}
