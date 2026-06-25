import { db } from '../db'
import { formatDay, formatTime } from './format'
import { unitLabel } from './units'
import { metricDef } from './measurements'

interface ExportRow {
  ISO: string // машинная метка времени — для точного реимпорта
  Дата: string
  Время: string
  Тренажёр: string
  '№': number | string
  Подход: number
  'Вес, кг': number | string
  Повторы: number | string
  'Ед.': string
  '×': number
  Введено: number | string
  RPE: number | string
  Заметка: string
}

async function buildRows(): Promise<ExportRow[]> {
  const sets = await db.sets.filter((s) => s.deleted === 0).toArray()
  sets.sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  return sets.map((s) => ({
    ISO: s.performedAt,
    Дата: formatDay(s.performedAt),
    Время: formatTime(s.performedAt),
    Тренажёр: s.machineName,
    '№': s.machineNumber ?? '',
    Подход: s.setIndex,
    'Вес, кг': s.weight ?? '',
    Повторы: s.reps ?? '',
    'Ед.': unitLabel(s.entryUnit ?? 'kg'),
    '×': s.multiplier ?? 1,
    Введено: s.entryWeight ?? '',
    RPE: s.rpe ?? '',
    Заметка: s.note ?? '',
  }))
}

interface MeasureRow {
  ISO: string
  Дата: string
  Метрика: string
  Значение: number
  'Ед.': string
}

async function buildMeasureRows(): Promise<MeasureRow[]> {
  const ms = await db.measurements.filter((m) => m.deleted === 0).toArray()
  ms.sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  return ms.map((m) => ({
    ISO: m.performedAt,
    Дата: formatDay(m.performedAt),
    Метрика: metricDef(m.metric).label,
    Значение: m.value,
    'Ед.': m.unit,
  }))
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function exportXlsx(): Promise<number> {
  const XLSX = await import('xlsx')
  const rows = await buildRows()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Тренировки')

  const mrows = await buildMeasureRows()
  if (mrows.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mrows), 'Замеры')
  }

  XLSX.writeFile(wb, `ddx-trenirovki-${stamp()}.xlsx`)
  return rows.length
}

export async function exportCsv(): Promise<number> {
  const XLSX = await import('xlsx')
  const rows = await buildRows()
  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ddx-trenirovki-${stamp()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  return rows.length
}
