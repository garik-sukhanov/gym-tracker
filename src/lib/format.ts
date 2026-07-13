import type { WorkoutSet } from '../types'
import { trimNum } from './units'

export function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

// Основная строка подхода. Для упражнений со своим весом вес — это отягощение
// сверх собственного: «+15 кг × 10», а пустой/нулевой вес — «Свой вес × 10».
export function setMainLine(s: WorkoutSet): string {
  const reps = s.reps ?? '—'
  if (s.bodyweight) {
    const w = s.weight ?? 0
    return w > 0 ? `+${trimNum(w)} кг × ${reps}` : `Свой вес × ${reps}`
  }
  return `${s.weight ?? '—'} кг × ${reps}`
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
