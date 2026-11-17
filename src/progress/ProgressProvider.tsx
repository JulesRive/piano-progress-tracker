import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  emptyProgress,
  loadBundledProgress,
  readStoredProgress,
  todayISO,
  writeStoredProgress,
  type ProgressFile,
  type ScaleEntry,
  type ScaleStatus,
} from './model.ts'

interface ProgressContextValue {
  progress: ProgressFile | null
  updateScale: (id: string, patch: Partial<ScaleEntry>) => void
  setStatus: (id: string, status: ScaleStatus) => void
  replaceProgress: (progress: ProgressFile) => void
  resetToBundled: () => Promise<void>
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressFile | null>(() => readStoredProgress())

  useEffect(() => {
    if (progress) return
    let cancelled = false
    loadBundledProgress()
      .then((bundled) => {
        if (!cancelled) setProgress(bundled)
      })
      .catch(() => {
        if (!cancelled) setProgress(emptyProgress())
      })
    return () => {
      cancelled = true
    }
  }, [progress])

  useEffect(() => {
    if (progress) writeStoredProgress(progress)
  }, [progress])

  const value = useMemo<ProgressContextValue>(() => {
    const updateScale = (id: string, patch: Partial<ScaleEntry>) => {
      setProgress((current) => {
        if (!current) return current
        const previous = current.scales[id] ?? { status: 'not-started' }
        const next: ScaleEntry = { ...previous, ...patch }
        if (patch.notes !== undefined) {
          const notes = patch.notes.trim()
          if (notes) next.notes = notes
          else delete next.notes
        }
        if (!next.lastPracticed) delete next.lastPracticed
        if (!next.form) delete next.form
        return { ...current, scales: { ...current.scales, [id]: next } }
      })
    }
    return {
      progress,
      updateScale,
      setStatus: (id, status) => {
        const patch: Partial<ScaleEntry> = { status }
        if (status !== 'not-started') patch.lastPracticed = todayISO()
        updateScale(id, patch)
      },
      replaceProgress: (next) => setProgress(next),
      resetToBundled: async () => {
        const bundled = await loadBundledProgress()
        setProgress(bundled)
      },
    }
  }, [progress])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext)
  if (!value) throw new Error('useProgress must be used within ProgressProvider')
  return value
}
