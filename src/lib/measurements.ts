import type { Measurement } from '../types'
import { dayKey } from './format'

export interface MetricDef {
  key: string
  label: string
  unit: string
}

// Каталог метрик. Порядок = порядок отображения в форме и на экране.
export const METRICS: MetricDef[] = [
  { key: 'weight', label: 'Вес тела', unit: 'кг' },
  { key: 'bodyfat', label: 'Жир', unit: '%' },
  { key: 'neck', label: 'Шея', unit: 'см' },
  { key: 'shoulders', label: 'Плечи', unit: 'см' },
  { key: 'chest', label: 'Грудь', unit: 'см' },
  { key: 'waist', label: 'Талия', unit: 'см' },
  { key: 'hips', label: 'Бёдра', unit: 'см' },
  { key: 'biceps', label: 'Бицепс', unit: 'см' },
  { key: 'forearm', label: 'Предплечье', unit: 'см' },
  { key: 'thigh', label: 'Бедро', unit: 'см' },
  { key: 'calf', label: 'Голень', unit: 'см' },
]

const BY_KEY = new Map(METRICS.map((m) => [m.key, m]))

export function metricDef(key: string): MetricDef {
  return BY_KEY.get(key) ?? { key, label: key, unit: '' }
}

export interface SeriesPoint {
  date: string
  value: number
}

// Ряд значений метрики по дням (если в день несколько — берём последний), по возрастанию даты.
export function metricSeries(list: Measurement[]): SeriesPoint[] {
  const live = list.filter((m) => m.deleted === 0)
  const byDay = new Map<string, Measurement>()
  for (const m of live) {
    const k = dayKey(m.performedAt)
    const prev = byDay.get(k)
    if (!prev || prev.performedAt < m.performedAt) byDay.set(k, m)
  }
  return [...byDay.values()]
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    .map((m) => ({ date: m.performedAt, value: m.value }))
}

export interface MetricSummary {
  latest: number | null
  latestDate: string | null
  prev: number | null // предыдущее значение (для дельты)
  first: number | null
  min: number | null
  max: number | null
  count: number
}

export function metricSummary(list: Measurement[]): MetricSummary {
  const s = metricSeries(list)
  if (s.length === 0) {
    return { latest: null, latestDate: null, prev: null, first: null, min: null, max: null, count: 0 }
  }
  const values = s.map((p) => p.value)
  return {
    latest: s[s.length - 1].value,
    latestDate: s[s.length - 1].date,
    prev: s.length > 1 ? s[s.length - 2].value : null,
    first: s[0].value,
    min: Math.min(...values),
    max: Math.max(...values),
    count: s.length,
  }
}

// Метрики, по которым есть хотя бы один замер — в порядке каталога.
export function metricsWithData(all: Measurement[]): string[] {
  const present = new Set(all.filter((m) => m.deleted === 0).map((m) => m.metric))
  return METRICS.filter((m) => present.has(m.key)).map((m) => m.key)
}
