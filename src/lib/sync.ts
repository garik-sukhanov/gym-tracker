import { db } from '../db'
import { isCloudEnabled, supabase } from './supabase'
import { nowIso } from './id'
import type { Session, WorkoutSet } from '../types'

const LAST_PULL_KEY = 'ddx.lastPull'

type Row = Record<string, unknown>

function setToRow(s: WorkoutSet): Row {
  return {
    id: s.id,
    session_id: s.sessionId,
    machine_number: s.machineNumber,
    machine_name: s.machineName,
    weight: s.weight,
    reps: s.reps,
    set_index: s.setIndex,
    rpe: s.rpe,
    note: s.note,
    performed_at: s.performedAt,
    updated_at: s.updatedAt,
    deleted: s.deleted === 1,
  }
}

function rowToSet(r: Row): WorkoutSet {
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    machineNumber: (r.machine_number as number | null) ?? null,
    machineName: r.machine_name as string,
    weight: (r.weight as number | null) ?? null,
    reps: (r.reps as number | null) ?? null,
    setIndex: r.set_index as number,
    rpe: (r.rpe as number | null) ?? null,
    note: (r.note as string | null) ?? null,
    performedAt: r.performed_at as string,
    updatedAt: r.updated_at as string,
    deleted: r.deleted ? 1 : 0,
    synced: 1,
  }
}

function sessionToRow(s: Session): Row {
  return {
    id: s.id,
    title: s.title,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    updated_at: s.updatedAt,
    deleted: s.deleted === 1,
  }
}

function rowToSession(r: Row): Session {
  return {
    id: r.id as string,
    title: (r.title as string | null) ?? null,
    startedAt: r.started_at as string,
    endedAt: (r.ended_at as string | null) ?? null,
    updatedAt: r.updated_at as string,
    deleted: r.deleted ? 1 : 0,
    synced: 1,
  }
}

export interface SyncResult {
  pushed: number
  pulled: number
}

// Простая двусторонняя синхронизация (last-write-wins по updated_at).
// Требует таблиц sets/sessions в Supabase — SQL см. в README.
export async function syncNow(): Promise<SyncResult | null> {
  if (!isCloudEnabled || !supabase) return null
  let pushed = 0
  let pulled = 0

  const dirtySets = await db.sets.where('synced').equals(0).toArray()
  if (dirtySets.length) {
    const { error } = await supabase.from('sets').upsert(dirtySets.map(setToRow))
    if (error) throw error
    await db.sets.bulkPut(dirtySets.map((s) => ({ ...s, synced: 1 })))
    pushed += dirtySets.length
  }

  const dirtySessions = await db.sessions.where('synced').equals(0).toArray()
  if (dirtySessions.length) {
    const { error } = await supabase.from('sessions').upsert(dirtySessions.map(sessionToRow))
    if (error) throw error
    await db.sessions.bulkPut(dirtySessions.map((s) => ({ ...s, synced: 1 })))
    pushed += dirtySessions.length
  }

  const since = localStorage.getItem(LAST_PULL_KEY) ?? '1970-01-01T00:00:00.000Z'

  const remoteSets = await supabase.from('sets').select('*').gt('updated_at', since)
  if (remoteSets.error) throw remoteSets.error
  for (const row of remoteSets.data ?? []) {
    const incoming = rowToSet(row as Row)
    const local = await db.sets.get(incoming.id)
    if (!local || local.updatedAt < incoming.updatedAt) {
      await db.sets.put(incoming)
      pulled += 1
    }
  }

  const remoteSessions = await supabase.from('sessions').select('*').gt('updated_at', since)
  if (remoteSessions.error) throw remoteSessions.error
  for (const row of remoteSessions.data ?? []) {
    const incoming = rowToSession(row as Row)
    const local = await db.sessions.get(incoming.id)
    if (!local || local.updatedAt < incoming.updatedAt) {
      await db.sessions.put(incoming)
      pulled += 1
    }
  }

  localStorage.setItem(LAST_PULL_KEY, nowIso())
  return { pushed, pulled }
}
