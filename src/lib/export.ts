import { db } from '../db'
import { formatDay, formatTime } from './format'

interface ExportRow {
  Дата: string
  Время: string
  Тренажёр: string
  '№': number | string
  Подход: number
  'Вес, кг': number | string
  Повторы: number | string
  RPE: number | string
  Заметка: string
}

async function buildRows(): Promise<ExportRow[]> {
  const sets = await db.sets.filter((s) => s.deleted === 0).toArray()
  sets.sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  return sets.map((s) => ({
    Дата: formatDay(s.performedAt),
    Время: formatTime(s.performedAt),
    Тренажёр: s.machineName,
    '№': s.machineNumber ?? '',
    Подход: s.setIndex,
    'Вес, кг': s.weight ?? '',
    Повторы: s.reps ?? '',
    RPE: s.rpe ?? '',
    Заметка: s.note ?? '',
  }))
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function exportXlsx(): Promise<number> {
  const XLSX = await import('xlsx')
  const rows = await buildRows()
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Тренировки')
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
