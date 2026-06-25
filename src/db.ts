import Dexie, { type Table } from 'dexie'
import type { MachineName, Session, WorkoutSet } from './types'
import { newId, nowIso } from './lib/id'

export class GymDB extends Dexie {
  sets!: Table<WorkoutSet, string>
  sessions!: Table<Session, string>
  machineNames!: Table<MachineName, number>

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

export interface NewSetInput {
  machineNumber: number | null
  machineName: string
  weight: number | null
  reps: number | null
  rpe?: number | null
  note?: string | null
}

export async function addSet(input: NewSetInput): Promise<WorkoutSet> {
  const session = await getActiveSession()
  const priorCount = await db.sets
    .where('sessionId')
    .equals(session.id)
    .filter((s) => s.deleted === 0 && s.machineName === input.machineName)
    .count()

  const now = nowIso()
  const set: WorkoutSet = {
    id: newId(),
    sessionId: session.id,
    machineNumber: input.machineNumber,
    machineName: input.machineName,
    weight: input.weight,
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

// Последний записанный подход на этом тренажёре — для автоподстановки веса.
export async function lastSetForMachine(machineName: string): Promise<WorkoutSet | undefined> {
  const sets = await db.sets
    .where('machineName')
    .equals(machineName)
    .filter((s) => s.deleted === 0)
    .toArray()
  sets.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  return sets[0]
}

// Личный каталог «назвал один раз»: имя, привязанное к номеру тренажёра.
export async function getMachineName(machineNumber: number): Promise<string | undefined> {
  const row = await db.machineNames.get(machineNumber)
  return row?.name
}

export async function setMachineName(machineNumber: number, name: string): Promise<void> {
  await db.machineNames.put({ number: machineNumber, name, updatedAt: nowIso() })
}
