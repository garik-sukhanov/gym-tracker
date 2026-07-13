import { db } from '../db'
import { newId, nowIso } from './id'
import type { Exercise, Measurement, Session, Unit, WorkoutSet } from '../types'

const APP = 'ddx-gym-tracker'
const BACKUP_VERSION = 1

export interface Backup {
  app: string
  version: number
  exportedAt: string
  exercises: Exercise[]
  sessions: Session[]
  sets: WorkoutSet[]
  measurements: Measurement[]
}

export interface ImportResult {
  exercises: number
  sessions: number
  sets: number
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Полная резервная копия — упражнения, сессии, подходы. Точный round-trip.
export async function exportJson(): Promise<number> {
  const [exercises, sessions, sets, measurements] = await Promise.all([
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
    db.measurements.toArray(),
  ])
  const backup: Backup = {
    app: APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    sessions,
    sets,
    measurements,
  }
  download(JSON.stringify(backup, null, 2), `backup-${stamp()}.json`, 'application/json')
  return sets.length
}

export async function importFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.json')) return importJson(await file.text())
  return importSheet(file)
}

// Восстановление из JSON: слияние по id (bulkPut перезаписывает существующие записи).
async function importJson(text: string): Promise<ImportResult> {
  let data: Partial<Backup>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Файл не читается как JSON')
  }
  if (!data || !Array.isArray(data.sets)) throw new Error('Не похоже на резервную копию')

  const exercises = (data.exercises ?? []) as Exercise[]
  const sessions = (data.sessions ?? []) as Session[]
  const sets = data.sets as WorkoutSet[]
  const measurements = (data.measurements ?? []) as Measurement[]

  await db.transaction(
    'rw',
    db.exercises,
    db.sessions,
    db.sets,
    db.measurements,
    async () => {
      if (exercises.length) await db.exercises.bulkPut(exercises)
      if (sessions.length) await db.sessions.bulkPut(sessions)
      if (sets.length) await db.sets.bulkPut(sets)
      if (measurements.length) await db.measurements.bulkPut(measurements)
    },
  )
  return { exercises: exercises.length, sessions: sessions.length, sets: sets.length }
}

// Импорт из xlsx/csv (наш формат экспорта). Дедуп по составному ключу,
// упражнения переиспользуются по имени или создаются. Время берём из колонки ISO.
async function importSheet(file: File): Promise<ImportResult> {
  const XLSX = await import('xlsx')
  const lower = file.name.toLowerCase()
  const wb = lower.endsWith('.csv')
    ? XLSX.read(await file.text(), { type: 'string' })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  if (!rows.length) return { exercises: 0, sessions: 0, sets: 0 }

  const existingEx = (await db.exercises.toArray()).filter((e) => e.deleted === 0)
  const exByName = new Map(existingEx.map((e) => [e.name, e]))
  const newExercises: Exercise[] = []

  const seen = new Set((await db.sets.toArray()).map(setKey))
  const now = nowIso()
  const newSets: WorkoutSet[] = []

  for (const r of rows) {
    const name = str(r['Тренажёр']) || 'Импорт'
    const number = numOrNull(r['№'])
    const entryUnit: Unit = str(r['Ед.']) === 'lbs' ? 'lbs' : 'kg'
    const multiplier = numOrNull(r['×']) ?? 1
    const bodyweight = isYes(r['Свой вес']) ? 1 : 0

    let ex = exByName.get(name)
    if (!ex) {
      ex = {
        id: newId(),
        name,
        qrCode: number != null ? `n:${number}` : null,
        machineNumber: number,
        unit: entryUnit,
        multiplier,
        bodyweight,
        note: null,
        createdAt: now,
        updatedAt: now,
        deleted: 0,
      }
      exByName.set(name, ex)
      newExercises.push(ex)
    }

    const weight = numOrNull(r['Вес, кг'])
    const reps = numOrNull(r['Повторы'])
    const entryWeight =
      numOrNull(r['Введено']) ??
      (weight != null ? Math.round((weight / (multiplier || 1)) * 100) / 100 : null)

    const candidate: WorkoutSet = {
      id: newId(),
      sessionId: 'import',
      exerciseId: ex.id,
      machineNumber: ex.machineNumber,
      machineName: name,
      weight,
      entryWeight,
      entryUnit,
      multiplier,
      bodyweight,
      reps,
      setIndex: numOrNull(r['Подход']) ?? 1,
      rpe: numOrNull(r['RPE']),
      note: str(r['Заметка']) || null,
      performedAt: isoOf(r['ISO'], now),
      updatedAt: now,
      deleted: 0,
      synced: 0,
    }
    const k = setKey(candidate)
    if (seen.has(k)) continue
    seen.add(k)
    newSets.push(candidate)
  }

  if (!newSets.length && !newExercises.length) return { exercises: 0, sessions: 0, sets: 0 }

  const session: Session = {
    id: newId(),
    title: 'Импорт',
    startedAt: now,
    endedAt: now,
    updatedAt: now,
    deleted: 0,
    synced: 0,
  }
  for (const s of newSets) s.sessionId = session.id

  await db.transaction('rw', db.exercises, db.sessions, db.sets, async () => {
    if (newExercises.length) await db.exercises.bulkAdd(newExercises)
    if (newSets.length) {
      await db.sessions.add(session)
      await db.sets.bulkAdd(newSets)
    }
  })
  return { exercises: newExercises.length, sessions: newSets.length ? 1 : 0, sets: newSets.length }
}

function setKey(s: WorkoutSet): string {
  return `${s.exerciseId}|${s.performedAt}|${s.setIndex}|${s.weight}|${s.reps}`
}

function str(v: unknown): string {
  return String(v ?? '').trim()
}

function numOrNull(v: unknown): number | null {
  const t = str(v).replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function isYes(v: unknown): boolean {
  const t = str(v).toLowerCase()
  return t === 'да' || t === '1' || t === 'true' || t === 'yes'
}

function isoOf(v: unknown, fallback: string): string {
  const s = str(v)
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s))) return s
  return fallback
}
