import type { Unit } from '../types'

export const LB_TO_KG = 0.45359237

// Шаг степпера в каждой единице (вес) и для повторов.
export const WEIGHT_STEP: Record<Unit, number> = { kg: 2.5, lbs: 5 }
export const REPS_STEP = 1

export function toKg(value: number, unit: Unit): number {
  return unit === 'lbs' ? value * LB_TO_KG : value
}

export function fromKg(kg: number, unit: Unit): number {
  return unit === 'lbs' ? kg / LB_TO_KG : kg
}

// Округление для отображения: кг до 0.5 (плитки стека обычно кратны), lbs до 0.5.
export function roundDisplay(value: number, unit: Unit): number {
  const q = unit === 'lbs' ? 0.5 : 0.5
  return Math.round(value / q) * q
}

// Аккуратное число без лишних нулей: 50, 52.5.
export function trimNum(value: number): string {
  return String(Math.round(value * 100) / 100)
}

export function unitLabel(unit: Unit): string {
  return unit === 'lbs' ? 'lbs' : 'кг'
}
