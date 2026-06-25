import { useLiveQuery } from 'dexie-react-hooks'
import { db, softDeleteSet } from '../db'
import { dayKey, formatDay, formatTime } from '../lib/format'
import { trimNum, unitLabel } from '../lib/units'
import type { WorkoutSet } from '../types'

interface ExGroup {
  key: string
  name: string
  number: number | null
  items: WorkoutSet[]
}
interface DayGroup {
  key: string
  date: string
  total: number
  groups: ExGroup[]
}

export function HistoryScreen() {
  const sets = useLiveQuery(
    async () => {
      const all = await db.sets.filter((s) => s.deleted === 0).toArray()
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

  const days = groupByDayExercise(sets)

  return (
    <div className="screen">
      {days.map((d) => (
        <section className="card" key={d.key}>
          <h2 className="card__title">{formatDay(d.date)}</h2>
          <p className="muted small">
            {d.total} подходов · {d.groups.length} упражнений
          </p>
          {d.groups.map((g) => (
            <div className="exblock" key={g.key}>
              <div className="exblock__head">
                <span className="exblock__name">{g.name}</span>
                {g.number != null && <span className="badge">№{g.number}</span>}
              </div>
              <ul className="setlist">
                {g.items.map((s) => (
                  <li key={s.id} className="setlist__item">
                    <span className="setlist__idx">#{s.setIndex}</span>
                    <span className="setlist__main">
                      {s.weight ?? '—'} кг × {s.reps ?? '—'}
                    </span>
                    {(s.multiplier > 1 || s.entryUnit === 'lbs') && s.entryWeight != null && (
                      <span className="muted small">
                        {trimNum(s.entryWeight)}
                        {unitLabel(s.entryUnit)}
                        {s.multiplier > 1 ? `×${s.multiplier}` : ''}
                      </span>
                    )}
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
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function groupByDayExercise(sets: WorkoutSet[]): DayGroup[] {
  const days = new Map<string, Map<string, WorkoutSet[]>>()
  for (const s of sets) {
    const dk = dayKey(s.performedAt)
    let exMap = days.get(dk)
    if (!exMap) {
      exMap = new Map()
      days.set(dk, exMap)
    }
    const exKey = s.exerciseId || s.machineName
    const arr = exMap.get(exKey)
    if (arr) arr.push(s)
    else exMap.set(exKey, [s])
  }

  const out: DayGroup[] = []
  for (const [dk, exMap] of days) {
    const groups: ExGroup[] = []
    let total = 0
    for (const [key, items] of exMap) {
      items.sort((a, b) => a.performedAt.localeCompare(b.performedAt))
      total += items.length
      groups.push({ key, name: items[0].machineName, number: items[0].machineNumber, items })
    }
    // упражнения внутри дня — по времени последнего подхода (свежие выше)
    groups.sort((a, b) =>
      b.items[b.items.length - 1].performedAt.localeCompare(a.items[a.items.length - 1].performedAt),
    )
    out.push({ key: dk, date: groups[0].items[groups[0].items.length - 1].performedAt, total, groups })
  }
  out.sort((a, b) => b.key.localeCompare(a.key))
  return out
}
