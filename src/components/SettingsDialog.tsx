import { useEffect, useRef, useState } from 'react'
import { fetchProgressFromGitHub, saveProgressToGitHub } from '../progress/github.ts'
import { normalizeProgress, TOKEN_KEY, type ProgressFile } from '../progress/model.ts'
import { useAudio } from '../audio/AudioProvider.tsx'

interface SettingsDialogProps {
  open: boolean
  progress: ProgressFile | null
  onClose: () => void
  onReplace: (progress: ProgressFile) => void
  onReset: () => Promise<void>
}

export function SettingsDialog({ open, progress, onClose, onReplace, onReset }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const audio = useAudio()
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [showToken, setShowToken] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const rememberToken = (value: string) => {
    setToken(value)
    if (value.trim()) localStorage.setItem(TOKEN_KEY, value.trim())
    else localStorage.removeItem(TOKEN_KEY)
  }

  const report = (next: string | null, problem: string | null) => {
    setMessage(next)
    setError(problem)
  }

  const save = async () => {
    if (!progress) return
    const trimmed = token.trim()
    if (!trimmed) {
      report(null, 'Paste a token first.')
      return
    }
    setBusy(true)
    report(null, null)
    try {
      await saveProgressToGitHub(trimmed, progress)
      report('Saved progress.json to GitHub.', null)
    } catch (reason) {
      report(null, reason instanceof Error ? reason.message : 'Could not save to GitHub.')
    } finally {
      setBusy(false)
    }
  }

  const load = async () => {
    const trimmed = token.trim()
    if (!trimmed) {
      report(null, 'Paste a token first.')
      return
    }
    setBusy(true)
    report(null, null)
    try {
      const next = await fetchProgressFromGitHub(trimmed)
      onReplace(next)
      report('Loaded the latest progress.json from GitHub.', null)
    } catch (reason) {
      report(null, reason instanceof Error ? reason.message : 'Could not load from GitHub.')
    } finally {
      setBusy(false)
    }
  }

  const exportJson = () => {
    if (!progress) return
    const blob = new Blob([`${JSON.stringify(progress, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'progress.json'
    link.click()
    URL.revokeObjectURL(url)
    report('Downloaded progress.json.', null)
  }

  const importJson = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    report(null, null)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (typeof parsed !== 'object' || parsed === null) throw new Error('That file is not progress JSON.')
      onReplace(normalizeProgress(parsed))
      report('Imported progress into this browser.', null)
    } catch (reason) {
      report(null, reason instanceof Error ? reason.message : 'Could not import that file.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const reset = async () => {
    if (!window.confirm('Replace this browser’s progress with the committed progress.json?')) return
    setBusy(true)
    report(null, null)
    try {
      await onReset()
      report('Restored the committed progress.json.', null)
    } catch (reason) {
      report(null, reason instanceof Error ? reason.message : 'Could not restore progress.json.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-panel">
        <header className="dialog-head">
          <h2>Settings</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </header>

        <section>
          <h3>On this device</h3>
          <p>
            Every change is saved in this browser’s localStorage. The first visit, with nothing stored yet, loads{' '}
            <code>progress.json</code>.
          </p>
        </section>

        <section>
          <h3>GitHub sync</h3>
          <p>
            A fine-grained personal access token lets progress follow you to another device. The token is stored only in
            this browser’s localStorage. It is sent only to <code>api.github.com</code> when you choose Save or Load.
            Give it Contents read and write on <code>JulesRive/piano-progress-tracker</code>, and nothing else. Do not
            commit the token.
          </p>
          <label>
            Personal access token
            <span className="token-row">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => rememberToken(event.target.value)}
              />
              <button type="button" className="secondary" onClick={() => setShowToken((value) => !value)}>
                {showToken ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <div className="button-row">
            <button type="button" className="primary" disabled={busy || !progress} onClick={() => void save()}>
              Save to GitHub
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => void load()}>
              Load from GitHub
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                rememberToken('')
                report('Token removed from this browser.', null)
              }}
            >
              Forget token
            </button>
          </div>
          <p className="fine-print">
            Save commits <code>public/progress.json</code> on <code>main</code>, which also redeploys the site. If GitHub
            has a newer file, load it before saving again.
          </p>
        </section>

        <section>
          <h3>File backup</h3>
          <div className="button-row">
            <button type="button" className="secondary" disabled={!progress} onClick={exportJson}>
              Export JSON
            </button>
            <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
              Import JSON
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => void reset()}>
              Reset to committed file
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void importJson(event.target.files?.[0])}
          />
        </section>

        <section>
          <h3>Sound</h3>
          <p>
            {audio.timbre === 'piano'
              ? 'Using acoustic grand samples.'
              : 'Using the built-in piano synth. Acoustic grand samples load after the first tap, if the soundfont can be reached.'}{' '}
            The mute and volume controls in the header are saved in this browser.
          </p>
        </section>

        {message ? <p className="form-success" role="status">{message}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
    </dialog>
  )
}
