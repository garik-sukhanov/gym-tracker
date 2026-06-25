import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  addSet,
  softDeleteSet,
  lastSetForMachine,
  getMachineName,
  setMachineName,
} from '../db'
import { formatTime } from '../lib/format'
import type { ActiveMachine, WorkoutSet } from '../types'

interface Props {
  machine: ActiveMachine | null
  onScanRequest: () => void
}

export function LogScreen({ machine, onScanRequest }: Props) {
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!machine) return
    let cancelled = false
    ;(async () => {
      let resolved = machine.name
      if (machine.number != null) {
        const custom = await getMachineName(machine.number)
        if (custom) resolved = custom
      }
      if (cancelled) return
      setName(resolved)
      const last = await lastSetForMachine(resolved)
      if (last && !cancelled) {
        setWeight(last.weight != null ? String(last.weight) : '')
        setReps(last.reps != null ? String(last.reps) : '')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [machine])

  const sets = useLiveQuery(
    async () => {
      const key = name.trim()
      if (!key) return []
      const all = await db.sets
        .where('machineName')
        .equals(key)
        .filter((s) => s.deleted === 0)
        .toArray()
      all.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      return all.slice(0, 15)
    },
    [name],
    [] as WorkoutSet[],
  )

  async function save() {
    const key = name.trim()
    if (!key) return
    await addSet({
      machineNumber: machine?.number ?? null,
      machineName: key,
      weight: num(weight),
      reps: num(reps),
    })
    if (machine?.number != null) await setMachineName(machine.number, key)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 900)
  }

  if (!machine && !name) {
    return (
      <div className="screen screen--empty">
        <p className="muted">Отсканируй QR на тренажёре, чтобы начать запись подходов.</p>
        <button type="button" className="btn btn--primary btn--big" onClick={onScanRequest}>
          Сканировать QR
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <section className="card">
        <input
          className="field field--title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название тренажёра"
        />
        {machine?.number != null && <span className="badge">№{machine.number}</span>}
        {machine && !machine.known && machine.url && (
          <a className="muted small" href={machine.url} target="_blank" rel="noreferrer">
            {machine.url}
          </a>
        )}
        {machine?.description && <p className="muted small">{machine.description}</p>}

        <div className="row">
          <label className="field-group">
            Вес, кг
            <input
              className="field field--num"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <label className="field-group">
            Повторы
            <input
              className="field field--num"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </label>
        </div>

        <button type="button" className="btn btn--primary btn--big" onClick={save}>
          {flash ? 'Записано ✓' : 'Записать подход'}
        </button>
      </section>

      <section className="card">
        <h2 className="card__title">Сегодня · {name.trim() || 'тренажёр'}</h2>
        {sets.length === 0 ? (
          <p className="muted small">Пока нет подходов.</p>
        ) : (
          <ul className="setlist">
            {sets.map((s) => (
              <li key={s.id} className="setlist__item">
                <span className="setlist__idx">#{s.setIndex}</span>
                <span className="setlist__main">
                  {s.weight ?? '—'} кг × {s.reps ?? '—'}
                </span>
                <span className="muted small">{formatTime(s.performedAt)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Удалить подход"
                  onClick={() => softDeleteSet(s.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function num(v: string): number | null {
  const t = v.replace(',', '.').trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
