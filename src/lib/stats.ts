import type { WorkoutSet } from '../types'
import { dayKey } from './format'

function volumeOf(s: WorkoutSet): number {
  return (s.weight ?? 0) * (s.reps ?? 0)
}

// Понедельник недели набора (ISO-дата YYYY-MM-DD). Браузерный Date — ок.
export function weekStartIso(iso: string): string {
  const d = new Date(iso)
  const mondayOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - mondayOffset)
  d.setHours(0, 0, 0, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface Totals {
  sets: number
  days: number
  volume: number
  exercises: number
}

export function totals(sets: WorkoutSet[]): Totals {
  const live = sets.filter((s) => s.deleted === 0)
  const days = new Set<string>()
  const exs = new Set<string>()
  let volume = 0
  for (const s of live) {
    days.add(dayKey(s.performedAt))
    exs.add(s.exerciseId)
    volume += volumeOf(s)
  }
  return { sets: live.length, days: days.size, volume: Math.round(volume), exercises: exs.size }
}

export interface WeekPoint {
  weekStart: string
  label: string // дд.мм
  volume: number
  days: number
}

// Тоннаж по неделям, последние `weeks` недель с данными.
export function weeklyVolume(sets: WorkoutSet[], weeks = 8): WeekPoint[] {
  const live = sets.filter((s) => s.deleted === 0)
  const byWeek = new Map<string, { volume: number; days: Set<string> }>()
  for (const s of live) {
    const ws = weekStartIso(s.performedAt)
    let e = byWeek.get(ws)
    if (!e) {
      e = { volume: 0, days: new Set() }
      byWeek.set(ws, e)
    }
    e.volume += volumeOf(s)
    e.days.add(dayKey(s.performedAt))
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-weeks)
    .map(([weekStart, e]) => ({
      weekStart,
      label: `${weekStart.slice(8, 10)}.${weekStart.slice(5, 7)}`,
      volume: Math.round(e.volume),
      days: e.days.size,
    }))
}

export interface RecentExercise {
  exerciseId: string
  name: string
  number: number | null
  weight: number | null
  reps: number | null
  date: string
}

// Недавно тренированные упражнения (по времени последнего подхода).
export function recentExercises(sets: WorkoutSet[], limit = 6): RecentExercise[] {
  const live = sets.filter((s) => s.deleted === 0)
  const byEx = new Map<string, WorkoutSet[]>()
  for (const s of live) {
    const arr = byEx.get(s.exerciseId)
    if (arr) arr.push(s)
    else byEx.set(s.exerciseId, [s])
  }
  const out: RecentExercise[] = []
  for (const [exerciseId, arr] of byEx) {
    arr.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    const last = arr[0]
    out.push({
      exerciseId,
      name: last.machineName,
      number: last.machineNumber,
      weight: last.weight,
      reps: last.reps,
      date: last.performedAt,
    })
  }
  out.sort((a, b) => b.date.localeCompare(a.date))
  return out.slice(0, limit)
}

export interface DayStat {
  day: string // YYYY-MM-DD
  date: string // performedAt последнего подхода в этот день
  maxWeight: number // лучший вес за день, кг
  topReps: number // повторы на лучшем весе
  volume: number // тоннаж Σ(вес × повторы)
  e1rm: number // оценка 1ПМ (Epley), кг
  sets: number
}

// Агрегаты по дням для одного упражнения. Вход — все подходы упражнения.
export function exerciseStats(sets: WorkoutSet[]): DayStat[] {
  const live = sets.filter((s) => s.deleted === 0)
  const byDay = new Map<string, WorkoutSet[]>()
  for (const s of live) {
    const k = dayKey(s.performedAt)
    const arr = byDay.get(k)
    if (arr) arr.push(s)
    else byDay.set(k, [s])
  }

  const out: DayStat[] = []
  for (const [day, arr] of byDay) {
    let maxWeight = 0
    let topReps = 0
    let volume = 0
    let e1rm = 0
    let latest = arr[0].performedAt
    for (const s of arr) {
      const w = s.weight ?? 0
      const r = s.reps ?? 0
      volume += w * r
      if (w > maxWeight) {
        maxWeight = w
        topReps = r
      }
      const est = r > 0 ? w * (1 + r / 30) : w
      if (est > e1rm) e1rm = est
      if (s.performedAt > latest) latest = s.performedAt
    }
    out.push({
      day,
      date: latest,
      maxWeight: Math.round(maxWeight * 100) / 100,
      topReps,
      volume: Math.round(volume),
      e1rm: Math.round(e1rm * 10) / 10,
      sets: arr.length,
    })
  }
  out.sort((a, b) => a.day.localeCompare(b.day))
  return out
}
