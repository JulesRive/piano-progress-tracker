import { describe, expect, it } from 'vitest'
import { activeNoteIndex, takeScheduleSlice, type ScheduleCursor } from './schedule.ts'

describe('scale lookahead scheduler', () => {
  it('spaces the next unscheduled note with the tempo at schedule time', () => {
    let cursor: ScheduleCursor = { nextIndex: 0, lastTime: 0, primed: false }
    const first = takeScheduleSlice(cursor, 16, 0, 60)
    expect(first.notes.map((note) => note.when)).toEqual([0])
    expect(first.notes[0].duration).toBeCloseTo(0.92)
    cursor = first.cursor

    const second = takeScheduleSlice(cursor, 16, 0.95, 60)
    expect(second.notes.map((note) => note.when)).toEqual([1])
    cursor = second.cursor

    const third = takeScheduleSlice(cursor, 16, 1.45, 120)
    expect(third.notes.map((note) => note.when)).toEqual([1.5])
    expect(third.notes[0].duration).toBeCloseTo(0.46)
    expect(third.notes[0].when - second.notes[0].when).toBeCloseTo(0.5)
    expect(second.notes[0].when - first.notes[0].when).toBeCloseTo(1)
  })

  it('does not schedule past the end of the scale', () => {
    const slice = takeScheduleSlice({ nextIndex: 2, lastTime: 1, primed: true }, 3, 5, 120)
    expect(slice.notes).toHaveLength(1)
    expect(slice.notes[0].when).toBeCloseTo(1.5)
    expect(slice.cursor.nextIndex).toBe(3)
    const done = takeScheduleSlice(slice.cursor, 3, 6, 120)
    expect(done.notes).toEqual([])
  })

  it('lights the note whose start time has arrived', () => {
    expect(activeNoteIndex([], 1)).toBe(-1)
    expect(activeNoteIndex([0, 1, 1.5], 0)).toBe(0)
    expect(activeNoteIndex([0, 1, 1.5], 1.2)).toBe(1)
    expect(activeNoteIndex([0, 1, 1.5], 1.5)).toBe(2)
  })
})