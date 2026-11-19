import { useEffect, useRef } from 'react'
import { Accidental, Annotation, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from 'vexflow'
import { useAudio } from '../audio/AudioProvider.tsx'
import type { ScoreEvent } from '../theory/score.ts'
import type { Hand } from '../theory/music.ts'

interface ScaleScoreProps {
  keySignature: string
  fifths: number
  events: ScoreEvent[]
  hand: Hand
  activeIndex: number | null
}

export function ScaleScore({ keySignature, fifths, events, hand, activeIndex }: ScaleScoreProps) {
  const host = useRef<HTMLDivElement>(null)
  const notes = useRef<Array<{ hand: Hand; index: number; element: SVGElement }>>([])
  const audio = useAudio()
  const audioRef = useRef(audio)

  useEffect(() => {
    audioRef.current = audio
  }, [audio])

  useEffect(() => {
    const parent = host.current
    if (!parent) return
    parent.replaceChildren()
    const width = Math.max(720, 160 + Math.abs(fifths) * 20 + events.length * 52)
    const renderer = new Renderer(parent, Renderer.Backends.SVG)
    renderer.resize(width, 460)
    const context = renderer.getContext()
    context.setFillStyle('#241c14')
    context.setStrokeStyle('#241c14')
    const staveOptions = { spacingBetweenLinesPx: 14, spaceAboveStaffLn: 6, spaceBelowStaffLn: 5 }

    const treble = new Stave(10, 36, width - 20, staveOptions)
    treble.addClef('treble').addKeySignature(keySignature).setContext(context).draw()
    const bass = new Stave(10, 250, width - 20, staveOptions)
    bass.addClef('bass').addKeySignature(keySignature).setContext(context).draw()
    const brace = new StaveConnector(treble, bass).setType('brace')
    const bar = new StaveConnector(treble, bass).setType('singleLeft')
    brace.setContext(context).draw()
    bar.setContext(context).draw()

    const right = events.map((event) => noteFor(event, 'rh'))
    const left = events.map((event) => noteFor(event, 'lh'))
    const rightVoice = new Voice({ numBeats: events.length, beatValue: 4 }).setMode(Voice.Mode.SOFT)
    const leftVoice = new Voice({ numBeats: events.length, beatValue: 4 }).setMode(Voice.Mode.SOFT)
    rightVoice.addTickables(right)
    leftVoice.addTickables(left)
    new Formatter().joinVoices([rightVoice]).joinVoices([leftVoice]).format([rightVoice, leftVoice], width - 150)
    rightVoice.draw(context, treble)
    leftVoice.draw(context, bass)

    const drawn: Array<{ hand: Hand; index: number; element: SVGElement }> = []
    const bind = (items: StaveNote[], which: Hand) => {
      items.forEach((item, index) => {
        const element = item.getSVGElement()
        if (!element) return
        element.classList.add('score-note')
        element.dataset.index = String(index)
        element.dataset.hand = which
        element.dataset.midi = String(which === 'rh' ? events[index].midi : events[index].lhMidi)
        element.setAttribute('aria-label', events[index].label)
        const play = () => {
          const midi = which === 'rh' ? events[index].midi : events[index].lhMidi
          void audioRef.current.unlock().then((running) => {
            if (running) audioRef.current.playPreview(midi)
          })
        }
        element.addEventListener('pointerdown', play)
        drawn.push({ hand: which, index, element })
      })
    }
    bind(right, 'rh')
    bind(left, 'lh')
    notes.current = drawn

    return () => {
      notes.current = []
      parent.replaceChildren()
    }
  }, [events, fifths, keySignature])

  useEffect(() => {
    for (const note of notes.current) {
      note.element.classList.toggle('is-playing', note.hand === hand && note.index === activeIndex)
    }
  }, [activeIndex, hand, events])

  return <div className="score-scroll" ref={host} role="img" aria-label="Scale on a grand staff" />
}

function noteFor(event: ScoreEvent, hand: Hand): StaveNote {
  const note = new StaveNote({
    keys: [hand === 'rh' ? event.key : event.lhKey],
    duration: 'q',
    clef: hand === 'rh' ? 'treble' : 'bass',
  })
  if (event.accidental) note.addModifier(new Accidental(event.accidental))
  const finger = new Annotation(String(hand === 'rh' ? event.rhFinger : event.lhFinger))
    .setFont('Georgia', 18, 'bold')
    .setVerticalJustification(hand === 'rh' ? Annotation.VerticalJustify.TOP : Annotation.VerticalJustify.BOTTOM)
  note.addModifier(finger)
  return note
}
