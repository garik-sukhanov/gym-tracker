import { useLiveQuery } from 'dexie-react-hooks'
import { db, softDeleteSet } from '../db'
import { dayKey, formatDay, formatTime } from '../lib/format'
import type { WorkoutSet } from '../types'

interface DayGroup {
  key: string
  items: WorkoutSet[]
}

export function HistoryScreen() {
  const sets = useLiveQuery(
    async () => {
      const all = await db.sets.filter((s) => s.deleted === 0).toArray()
      all.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      return all
    },
    [],
    [] as WorkoutSet[],
  )

  if (sets.length === 0) {
    return (
      <div className="screen screen--empty">
        <p className="muted">Журнал пуст. Запиши первый подход на вкладке «Запись».</p>
      </div>
    )
  }

  const days = groupByDay(sets)

  return (
    <div className="screen">
      {days.map((d) => (
        <section className="card" key={d.key}>
          <h2 className="card__title">{formatDay(d.items[0].performedAt)}</h2>
          <p className="muted small">
            {d.items.length} подходов · {countMachines(d.items)} тренажёров
          </p>
          <ul className="setlist">
            {d.items.map((s) => (
              <li key={s.id} className="setlist__item">
                <span className="setlist__main">
                  {s.machineName}
                  {s.machineNumber != null ? ` №${s.machineNumber}` : ''}
                </span>
                <span>
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
        </section>
      ))}
    </div>
  )
}

function groupByDay(sets: WorkoutSet[]): DayGroup[] {
  const map = new Map<string, WorkoutSet[]>()
  for (const s of sets) {
    const k = dayKey(s.performedAt)
    const arr = map.get(k)
    if (arr) arr.push(s)
    else map.set(k, [s])
  }
  return [...map.entries()].map(([key, items]) => ({ key, items }))
}

function countMachines(items: WorkoutSet[]): number {
  return new Set(items.map((s) => s.machineName)).size
}
