import { AUDIO_KEY } from '../progress/model.ts'

export interface AudioPrefs {
  muted: boolean
  volume: number
}

type NoteHandle = { stop: (when?: number) => void }

interface SoundfontPlayer {
  play: (note: number | string, when?: number, options?: { duration?: number; gain?: number }) => NoteHandle
  stop: (when?: number) => void
}

type InstrumentFactory = (
  ctx: AudioContext,
  name: string,
  options?: {
    soundfont?: string
    format?: string
    destination?: AudioNode
    notes?: number[]
    gain?: number
  },
) => Promise<SoundfontPlayer>

const SAMPLE_NOTES = Array.from({ length: 37 }, (_, index) => 60 + index)

export function readAudioPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(AUDIO_KEY)
    if (!raw) return { muted: false, volume: 0.8 }
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>
    const volume = typeof parsed.volume === 'number' ? Math.min(1, Math.max(0, parsed.volume)) : 0.8
    return { muted: Boolean(parsed.muted), volume }
  } catch {
    return { muted: false, volume: 0.8 }
  }
}

export function writeAudioPrefs(prefs: AudioPrefs): void {
  localStorage.setItem(AUDIO_KEY, JSON.stringify(prefs))
}

/**
 * Piano playback. Acoustic grand samples load after the first gesture;
 * a tuned additive synth covers the wait and any failed download.
 */
export class PianoEngine {
  muted: boolean
  volume: number
  unlocked = false
  timbre: 'synth' | 'piano' = 'synth'
  onChange: (() => void) | null = null

  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private piano: SoundfontPlayer | null = null
  private loading = false
  private noise: AudioBuffer | null = null
  private preview: NoteHandle | null = null
  private active: NoteHandle[] = []

  constructor(prefs: AudioPrefs) {
    this.muted = prefs.muted
    this.volume = prefs.volume
  }

  private emit(): void {
    this.onChange?.()
  }

  unlock(): void {
    const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return
    if (!this.ctx) {
      this.ctx = new Context()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume
      const compressor = this.ctx.createDynamicsCompressor()
      compressor.threshold.value = -12
      compressor.knee.value = 18
      compressor.ratio.value = 3
      compressor.attack.value = 0.004
      compressor.release.value = 0.18
      this.master.connect(compressor)
      compressor.connect(this.ctx.destination)
    }
    if (this.ctx.state !== 'running') void this.ctx.resume()
    this.unlocked = true
    this.emit()
    this.loadSamples()
  }

  currentTime(): number | null {
    return this.ctx?.currentTime ?? null
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyGain()
    writeAudioPrefs(this.prefs())
    this.emit()
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
    if (this.volume === 0) this.muted = true
    else if (this.muted && volume > 0) this.muted = false
    this.applyGain()
    writeAudioPrefs(this.prefs())
    this.emit()
  }

  /** Short tonic for the circle. Replaces the previous preview without stopping a scale. */
  playPreview(midi: number): void {
    this.unlock()
    this.preview?.stop()
    this.preview = this.startNote(midi, 0.4, 0.62)
  }

  playScaleNote(midi: number, when: number, duration: number): void {
    this.unlock()
    const handle = this.startNote(midi, duration, 0.78, when)
    if (handle) this.active.push(handle)
  }

  stopAll(): void {
    const when = this.ctx?.currentTime
    this.preview?.stop(when)
    this.preview = null
    for (const handle of this.active) handle.stop(when)
    this.active = []
    try {
      this.piano?.stop(when)
    } catch {
      /* already stopped */
    }
  }

  private prefs(): AudioPrefs {
    return { muted: this.muted, volume: this.volume }
  }

  private applyGain(): void {
    if (!this.ctx || !this.master) return
    const value = this.muted ? 0 : this.volume
    this.master.gain.cancelScheduledValues(this.ctx.currentTime)
    this.master.gain.setTargetAtTime(Math.max(value, 0.0001), this.ctx.currentTime, 0.015)
    if (value === 0) this.master.gain.setValueAtTime(0, this.ctx.currentTime + 0.05)
  }

  private loadSamples(): void {
    if (!this.ctx || !this.master || this.piano || this.loading) return
    this.loading = true
    const ctx = this.ctx
    const destination = this.master
    void import('soundfont-player')
      .then((mod) => {
        const loaded = mod as unknown as {
          instrument?: InstrumentFactory
          default?: { instrument?: InstrumentFactory }
        }
        const instrument = loaded.instrument ?? loaded.default?.instrument
        if (!instrument) throw new Error('missing instrument')
        return instrument(ctx, 'acoustic_grand_piano', {
          soundfont: 'MusyngKite',
          format: 'mp3',
          destination,
          notes: SAMPLE_NOTES,
          gain: 0.9,
        })
      })
      .then((piano) => {
        this.piano = piano
        this.timbre = 'piano'
        this.loading = false
        this.emit()
      })
      .catch(() => {
        this.loading = false
        this.timbre = 'synth'
        this.emit()
      })
  }

  private startNote(midi: number, duration: number, velocity: number, when?: number): NoteHandle | null {
    if (!this.ctx || !this.master) return null
    const time = when ?? this.ctx.currentTime
    if (this.piano) {
      try {
        return this.piano.play(midi, time, { duration, gain: velocity })
      } catch {
        this.piano = null
        this.timbre = 'synth'
        this.emit()
      }
    }
    return this.playSynth(midi, time, duration, velocity)
  }

  private playSynth(midi: number, when: number, duration: number, velocity: number): NoteHandle {
    const ctx = this.ctx!
    const dest = this.master!
    const freq = 440 * 2 ** ((midi - 69) / 12)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.7
    filter.frequency.setValueAtTime(1400 + velocity * 2600 + Math.max(0, midi - 60) * 18, when)
    filter.frequency.exponentialRampToValueAtTime(700, when + Math.min(0.45, duration))
    filter.connect(dest)

    const noise = ctx.createBufferSource()
    noise.buffer = this.hammerNoise()
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.value = 1100
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.09 * velocity, when)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045)
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(dest)
    noise.start(when)
    noise.stop(when + 0.05)

    const partials = [1, 2, 3, 4, 5, 6, 8]
    const amps = [1, 0.48, 0.24, 0.13, 0.07, 0.04, 0.018]
    const stiffness = 0.00018 + Math.max(0, 58 - midi) * 0.000015
    const body = Math.min(2.6, Math.max(0.55, 1.35 + (64 - midi) * 0.035))
    const releaseAt = when + Math.max(0.12, duration)
    const oscillators: OscillatorNode[] = []

    partials.forEach((partial, index) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq * partial * Math.sqrt(1 + stiffness * partial * partial), when)
      const gain = ctx.createGain()
      const peak = Math.max(0.0002, velocity * 0.16 * amps[index])
      const decay = Math.max(0.18, body / partial ** 0.62)
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.exponentialRampToValueAtTime(peak, when + 0.007)
      gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.42, 0.0001), when + Math.min(0.11, releaseAt - when))
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(releaseAt, when + decay * 0.55))
      osc.connect(gain)
      gain.connect(filter)
      osc.start(when)
      osc.stop(releaseAt + 0.08)
      oscillators.push(osc)
    })

    return {
      stop: (at?: number) => {
        const stopAt = at ?? ctx.currentTime
        try {
          noise.stop(stopAt)
        } catch {
          /* already stopped */
        }
        for (const osc of oscillators) {
          try {
            osc.stop(stopAt + 0.02)
          } catch {
            /* already stopped */
          }
        }
      },
    }
  }

  private hammerNoise(): AudioBuffer {
    if (this.noise && this.ctx) return this.noise
    const ctx = this.ctx!
    const length = Math.floor(ctx.sampleRate * 0.05)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) {
      const envelope = (1 - index / length) ** 3
      data[index] = (Math.random() * 2 - 1) * envelope
    }
    this.noise = buffer
    return buffer
  }
}

let singleton: PianoEngine | null = null

export function getPiano(): PianoEngine {
  if (!singleton) singleton = new PianoEngine(readAudioPrefs())
  return singleton
}

export function subscribePiano(listener: () => void): () => void {
  const piano = getPiano()
  piano.onChange = listener
  return () => {
    if (piano.onChange === listener) piano.onChange = null
  }
}
