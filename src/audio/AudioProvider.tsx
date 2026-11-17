import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getPiano, subscribePiano, type PianoEngine } from './engine.ts'

interface AudioContextValue {
  muted: boolean
  volume: number
  unlocked: boolean
  timbre: 'synth' | 'piano'
  toggleMuted: () => void
  setVolume: (volume: number) => void
  unlock: () => Promise<boolean>
  playPreview: (midi: number) => void
  playScaleNote: (midi: number, when: number, duration: number) => void
  stopAll: () => void
  currentTime: () => number | null
}

const AudioContext = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const engine = getPiano()
  const [snapshot, setSnapshot] = useState(() => readSnapshot(engine))

  useEffect(() => {
    const unlock = () => {
      void getPiano().unlock()
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    const unsubscribe = subscribePiano(() => setSnapshot(readSnapshot(getPiano())))
    return () => {
      unsubscribe()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const value = useMemo<AudioContextValue>(
    () => ({
      ...snapshot,
      toggleMuted: () => {
        if (engine.muted) {
          engine.setMuted(false)
          if (engine.volume === 0) engine.setVolume(0.8)
        } else {
          engine.setMuted(true)
        }
      },
      setVolume: (volume) => engine.setVolume(volume),
      unlock: () => engine.unlock(),
      playPreview: (midi) => engine.playPreview(midi),
      playScaleNote: (midi, when, duration) => engine.playScaleNote(midi, when, duration),
      stopAll: () => engine.stopAll(),
      currentTime: () => engine.currentTime(),
    }),
    [engine, snapshot],
  )

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export function useAudio(): AudioContextValue {
  const value = useContext(AudioContext)
  if (!value) throw new Error('useAudio must be used within AudioProvider')
  return value
}

function readSnapshot(engine: PianoEngine) {
  return {
    muted: engine.muted,
    volume: engine.volume,
    unlocked: engine.unlocked,
    timbre: engine.timbre,
  }
}
