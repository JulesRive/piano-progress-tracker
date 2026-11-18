/** How far ahead of the audio clock the scale scheduler may place a note. */
export const SCHEDULE_AHEAD_SEC = 0.1

export interface ScheduleCursor {
  nextIndex: number
  /** Start time of the previous note. Before the first note, this is the play start. */
  lastTime: number
  /** False until the first note has been placed. */
  primed: boolean
}

export interface ScheduledNote {
  index: number
  when: number
  duration: number
}

/**
 * Schedule every scale note that falls inside the lookahead window.
 * The gap before a note is `60 / bpm` read at the moment that note is scheduled,
 * so a later call with a new tempo moves the next note that has not been placed yet.
 */
export function takeScheduleSlice(
  cursor: ScheduleCursor,
  length: number,
  now: number,
  bpm: number,
  horizon = SCHEDULE_AHEAD_SEC,
): { cursor: ScheduleCursor; notes: ScheduledNote[] } {
  const notes: ScheduledNote[] = []
  let { nextIndex, lastTime, primed } = cursor
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 60
  const limit = now + horizon
  while (nextIndex < length) {
    const interval = 60 / safeBpm
    const when = primed ? lastTime + interval : lastTime
    if (when >= limit) break
    notes.push({
      index: nextIndex,
      when,
      duration: Math.max(0.05, interval * 0.92),
    })
    lastTime = when
    primed = true
    nextIndex += 1
  }
  return { cursor: { nextIndex, lastTime, primed }, notes }
}

/** Index of the note that should be lit at `now`, or -1 before the first one. */
export function activeNoteIndex(starts: readonly number[], now: number): number {
  let shown = -1
  for (let index = 0; index < starts.length; index += 1) {
    if (starts[index] <= now) shown = index
  }
  return shown
}
