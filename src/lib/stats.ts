import type { WorkoutSet } from '../types'
import { dayKey } from './format'

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
