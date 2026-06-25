import Dexie, { type Table } from 'dexie'
import type { Exercise, MachineName, Measurement, Session, Unit, WorkoutSet } from './types'
import { newId, nowIso } from './lib/id'
import { toKg } from './lib/units'

export class GymDB extends Dexie {
  sets!: Table<WorkoutSet, string>
  sessions!: Table<Session, string>
  machineNames!: Table<MachineName, number>
  exercises!: Table<Exercise, string>
  measurements!: Table<Measurement, string>

  constructor() {
    super('ddx-gym-tracker')
    this.version(1).stores({
      sets: 'id, sessionId, machineNumber, machineName, performedAt, updatedAt, synced, deleted',
      sessions: 'id, startedAt, updatedAt, synced, deleted',
    })
    this.version(2).stores({
      sets: 'id, sessionId, machineNumber, machineName, performedAt, updatedAt, synced, deleted',
      sessions: 'id, startedAt, updatedAt, synced, deleted',
      machineNames: 'number, updatedAt',
    })
    // v3: первоклассные упражнения. Создаём их из существующих подходов и связываем.
    this.version(3)
      .stores({
        sets: 'id, sessionId, exerciseId, machineNumber, machineName, performedAt, updatedAt, synced, deleted',
        sessions: 'id, startedAt, updatedAt, synced, deleted',
        machineNames: 'number, updatedAt',
        exercises: 'id, qrCode, machineNumber, name, updatedAt, deleted',
      })
      .upgrade(async (tx) => {
        const sets = await tx.table('sets').toArray()
        const now = nowIso()
        const byName = new Map<string, Exercise>()

        for (const s of sets as WorkoutSet[]) {
          const name = s.machineName || 'Без названия'
          if (!byName.has(name)) {
            byName.set(name, {
              id: newId(),
              name,
              qrCode: s.machineNumber != null ? `n:${s.machineNumber}` : null,
              machineNumber: s.machineNumber ?? null,
              unit: 'kg',
              multiplier: 1,
              note: null,
              createdAt: s.performedAt ?? now,
              updatedAt: now,
              deleted: 0,
            })
          }
        }

        if (byName.size) await tx.table('exercises').bulkAdd([...byName.values()])

        for (const s of sets as WorkoutSet[]) {
          const ex = byName.get(s.machineName || 'Без названия')!
          await tx.table('sets').update(s.id, {
            exerciseId: ex.id,
            entryWeight: s.weight ?? null,
            entryUnit: 'kg',
            multiplier: 1,
          })
        }
      })
    // v4: замеры тела (вес, обхваты, состав).
    this.version(4).stores({
      sets: 'id, sessionId, exerciseId, machineNumber, machineName, performedAt, updatedAt, synced, deleted',
      sessions: 'id, startedAt, updatedAt, synced, deleted',
      machineNames: 'number, updatedAt',
      exercises: 'id, qrCode, machineNumber, name, updatedAt, deleted',
      measurements: 'id, metric, performedAt, updatedAt, deleted',
    })
  }
}

export const db = new GymDB()

const ACTIVE_KEY = 'ddx.activeSessionId'

export async function startSession(title: string | null = null): Promise<Session> {
  const now = nowIso()
  const session: Session = {
    id: newId(),
    title,
    startedAt: now,
    endedAt: null,
    updatedAt: now,
    deleted: 0,
    synced: 0,
  }
  await db.sessions.add(session)
  localStorage.setItem(ACTIVE_KEY, session.id)
  return session
}

export async function getActiveSession(): Promise<Session> {
  const id = localStorage.getItem(ACTIVE_KEY)
  if (id) {
    const existing = await db.sessions.get(id)
    if (existing && existing.deleted === 0 && !existing.endedAt) return existing
  }
  return startSession()
}

export async function endActiveSession(): Promise<void> {
  const id = localStorage.getItem(ACTIVE_KEY)
  if (!id) return
  await db.sessions.update(id, { endedAt: nowIso(), updatedAt: nowIso(), synced: 0 })
  localStorage.removeItem(ACTIVE_KEY)
}

// --- Упражнения -----------------------------------------------------------

export interface NewExerciseInput {
  name: string
  qrCode?: string | null
  machineNumber?: number | null
  unit?: Unit
  multiplier?: number
  note?: string | null
}

export async function createExercise(input: NewExerciseInput): Promise<Exercise> {
  const now = nowIso()
  const ex: Exercise = {
    id: newId(),
    name: input.name.trim() || 'Без названия',
    qrCode: input.qrCode ?? null,
    machineNumber: input.machineNumber ?? null,
    unit: input.unit ?? 'kg',
    multiplier: input.multiplier ?? 1,
    note: input.note ?? null,
    createdAt: now,
    updatedAt: now,
    deleted: 0,
  }
  await db.exercises.add(ex)
  return ex
}

export async function updateExercise(
  id: string,
  patch: Partial<Omit<Exercise, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.exercises.update(id, { ...patch, updatedAt: nowIso() })
}

export async function softDeleteExercise(id: string): Promise<void> {
  await db.exercises.update(id, { deleted: 1, updatedAt: nowIso() })
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  return db.exercises.get(id)
}

// Все упражнения, привязанные к данному коду (для разбора скана).
export async function findExercisesByCode(key: string): Promise<Exercise[]> {
  const rows = await db.exercises.where('qrCode').equals(key).toArray()
  return rows.filter((e) => e.deleted === 0)
}

// --- Подходы --------------------------------------------------------------

export interface NewSetInput {
  exerciseId: string
  machineName: string
  machineNumber: number | null
  entryWeight: number | null
  entryUnit: Unit
  multiplier: number
  reps: number | null
  rpe?: number | null
  note?: string | null
}

export async function addSet(input: NewSetInput): Promise<WorkoutSet> {
  const session = await getActiveSession()
  const priorCount = await db.sets
    .where('sessionId')
    .equals(session.id)
    .filter((s) => s.deleted === 0 && s.exerciseId === input.exerciseId)
    .count()

  const now = nowIso()
  const weightKg =
    input.entryWeight == null
      ? null
      : Math.round(toKg(input.entryWeight, input.entryUnit) * input.multiplier * 100) / 100

  const set: WorkoutSet = {
    id: newId(),
    sessionId: session.id,
    exerciseId: input.exerciseId,
    machineNumber: input.machineNumber,
    machineName: input.machineName,
    weight: weightKg,
    entryWeight: input.entryWeight,
    entryUnit: input.entryUnit,
    multiplier: input.multiplier,
    reps: input.reps,
    setIndex: priorCount + 1,
    rpe: input.rpe ?? null,
    note: input.note ?? null,
    performedAt: now,
    updatedAt: now,
    deleted: 0,
    synced: 0,
  }
  await db.sets.add(set)
  return set
}

export async function softDeleteSet(id: string): Promise<void> {
  await db.sets.update(id, { deleted: 1, updatedAt: nowIso(), synced: 0 })
}

// Последний записанный подход на этом упражнении — для автоподстановки веса.
export async function lastSetForExercise(exerciseId: string): Promise<WorkoutSet | undefined> {
  const sets = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter((s) => s.deleted === 0)
    .toArray()
  sets.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  return sets[0]
}

// --- Замеры ---------------------------------------------------------------

export interface MeasurementInput {
  metric: string
  value: number
  unit: string
}

export async function addMeasurements(
  performedAt: string,
  entries: MeasurementInput[],
): Promise<number> {
  const now = nowIso()
  const rows: Measurement[] = entries.map((e) => ({
    id: newId(),
    metric: e.metric,
    value: e.value,
    unit: e.unit,
    performedAt,
    note: null,
    updatedAt: now,
    deleted: 0,
  }))
  if (rows.length) await db.measurements.bulkAdd(rows)
  return rows.length
}

export async function softDeleteMeasurement(id: string): Promise<void> {
  await db.measurements.update(id, { deleted: 1, updatedAt: nowIso() })
}
