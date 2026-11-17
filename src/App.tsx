import { useEffect, useState } from 'react'
import { useAudio } from './audio/AudioProvider.tsx'
import { CircleOfFifths } from './components/CircleOfFifths.tsx'
import { ScaleDetail } from './components/ScaleDetail.tsx'
import { SettingsDialog } from './components/SettingsDialog.tsx'
import { useProgress } from './progress/ProgressProvider.tsx'
import { countByStatus, nextUp, THEME_KEY, type ScaleStatus } from './progress/model.ts'
import { frenchScaleTitle, getScale, scaleTitle } from './theory/music.ts'

type Tab = 'scales' | 'pieces' | 'resources'
type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const audio = useAudio()
  const { progress, setStatus, updateScale, replaceProgress, resetToBundled } = useProgress()
  const [tab, setTab] = useState<Tab>('scales')
  const [selected, setSelected] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(initialTheme)

  if (progress && selected === null) {
    setSelected(nextUp(progress) ?? 'C')
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem(THEME_KEY, theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141210' : '#efe8da')
  }, [theme])

  const selectScale = (id: string) => {
    setSelected(id)
    setTab('scales')
    if (window.matchMedia('(max-width: 960px)').matches) {
      window.setTimeout(() => {
        document.getElementById('scale-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 40)
    }
  }

  const counts = progress ? countByStatus(progress) : null
  const upcoming = progress ? nextUp(progress) : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <h1>Piano Progress</h1>
            <p>Hands together</p>
          </div>
        </div>
        <div className="top-actions">
          <div className="volume">
            <button
              type="button"
              className="icon-button"
              aria-pressed={audio.unlocked ? audio.muted : false}
              aria-label={audio.unlocked ? (audio.muted ? 'Unmute' : 'Mute') : 'Enable sound'}
              title={
                audio.unlocked
                  ? audio.muted
                    ? 'Unmute'
                    : audio.timbre === 'piano'
                      ? 'Mute · acoustic grand'
                      : 'Mute · piano synth'
                  : 'Enable sound'
              }
              onClick={() => {
                if (!audio.unlocked) void audio.unlock()
                else audio.toggleMuted()
              }}
            >
              {audio.muted || audio.volume === 0 ? <SpeakerOff /> : <SpeakerOn />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audio.muted ? 0 : audio.volume}
              aria-label="Volume"
              onChange={(event) => audio.setVolume(Number(event.target.value))}
            />
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button type="button" className="icon-button" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            <GearIcon />
          </button>
        </div>
      </header>
      {!audio.unlocked ? (
        <button type="button" className="unlock-hint" onClick={() => void audio.unlock()}>
          Enable sound
        </button>
      ) : null}

      <nav className="tabs" aria-label="Sections">
        {(
          [
            ['scales', 'Scales'],
            ['pieces', 'Pieces'],
            ['resources', 'Resources'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'tab is-on' : 'tab'} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main>
        {!progress || !counts ? (
          <p className="loading">Loading your progress…</p>
        ) : tab === 'scales' ? (
          <div className="scales-layout">
            <div className="circle-column">
              <section className="summary">
                <p className="summary-counts">
                  <strong>{counts.mastered}</strong> mastered
                  <span aria-hidden="true">·</span>
                  <strong>{counts['in-progress']}</strong> in progress
                  <span aria-hidden="true">·</span>
                  <strong>{counts['not-started']}</strong> not started
                </p>
                {upcoming ? (
                  <button type="button" className="next-up" onClick={() => selectScale(upcoming)}>
                    <span className="eyebrow">Next up</span>
                    <span className="next-name">{scaleTitle(getScale(upcoming))}</span>
                    <span className="next-french">{frenchScaleTitle(getScale(upcoming))}</span>
                  </button>
                ) : (
                  <p className="next-done">All 24 scales mastered.</p>
                )}
                <p className="fine-print">Saved on this device. Next up walks clockwise from C.</p>
              </section>
              <CircleOfFifths progress={progress} selectedId={selected} onSelect={selectScale} />
              <Legend />
            </div>
            {selected ? (
              <ScaleDetail
                scaleId={selected}
                entry={progress.scales[selected] ?? { status: 'not-started' }}
                onStatus={(status: ScaleStatus) => setStatus(selected, status)}
                onForm={(form) => updateScale(selected, { form })}
                onNotes={(notes) => updateScale(selected, { notes })}
                onPracticed={(date) => updateScale(selected, { lastPracticed: date })}
                onOpenScale={selectScale}
              />
            ) : null}
          </div>
        ) : (
          <section className="placeholder">
            <h2>{tab === 'pieces' ? 'Pieces' : 'Resources'}</h2>
            <p>
              {tab === 'pieces'
                ? 'Pieces you are learning, a wishlist, and sheet-music links will live here.'
                : 'Tutorials, editions, and other learning links will live here.'}{' '}
              The progress file already has {tab === 'pieces' ? `a pieces list (${progress.pieces.length})` : `a resources list (${progress.resources.length})`} ready for that.
            </p>
          </section>
        )}
      </main>

      <SettingsDialog
        open={settingsOpen}
        progress={progress}
        onClose={() => setSettingsOpen(false)}
        onReplace={replaceProgress}
        onReset={resetToBundled}
      />
    </div>
  )
}

function Legend() {
  return (
    <ul className="legend">
      <li>
        <span className="swatch swatch-mastered" /> Mastered
      </li>
      <li>
        <span className="swatch swatch-progress" /> In progress
      </li>
      <li>
        <span className="swatch swatch-not" /> Not started
      </li>
    </ul>
  )
}

function SpeakerOn() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h3.2L11 6.5v11L7.2 14H4v-4z" fill="currentColor" />
      <path d="M14.5 9.2a3.2 3.2 0 0 1 0 5.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.6 7a6 6 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SpeakerOff() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h3.2L11 6.5v11L7.2 14H4v-4z" fill="currentColor" />
      <path d="M15 10l4 4M19 10l-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.5 3.8A7.8 7.8 0 1 0 20.2 15 6.2 6.2 0 0 1 15.5 3.8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.8v2.1M12 18.1v2.1M3.8 12h2.1M18.1 12h2.1M6.2 6.2l1.5 1.5M16.3 16.3l1.5 1.5M17.8 6.2l-1.5 1.5M7.7 16.3l-1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
