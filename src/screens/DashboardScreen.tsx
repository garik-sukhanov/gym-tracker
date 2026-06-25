import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { totals, weeklyVolume, recentExercises, weekStartIso } from '../lib/stats'
import { ProgressChart, type ChartPoint } from '../components/ProgressChart'
import type { WorkoutSet } from '../types'

interface Props {
  onLog: (id: string) => void
  onScan: () => void
  onCreate: () => void
}

export function DashboardScreen({ onLog, onScan, onCreate }: Props) {
  const sets = useLiveQuery(
    async () => db.sets.filter((s) => s.deleted === 0).toArray(),
    [],
    [] as WorkoutSet[],
  )

  const t = totals(sets)

  if (t.sets === 0) {
    return (
      <div className="screen screen--empty">
        <p className="muted">Здесь будет твой прогресс. Запиши первый подход.</p>
        <button type="button" className="btn btn--primary btn--big" onClick={onScan}>
          Сканировать QR
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCreate}>
          + Создать без QR
        </button>
      </div>
    )
  }

  const todayKey = new Date().toISOString().slice(0, 10)
  const currentWeek = weekStartIso(new Date().toISOString())
  const weekSets = sets.filter((s) => weekStartIso(s.performedAt) === currentWeek)
  const wt = totals(weekSets)
  const weekly = weeklyVolume(sets, 8)
  const recent = recentExercises(sets, 6)
  const points: ChartPoint[] = weekly.map((w) => ({ label: w.label, value: w.volume }))

  function shortDate(iso: string): string {
    if (iso.slice(0, 10) === todayKey) return 'сегодня'
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="screen">
      <section className="card">
        <h2 className="card__title">Всего</h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat__num">{t.days}</span>
            <span className="muted small">тренировок</span>
          </div>
          <div className="stat">
            <span className="stat__num">{t.sets}</span>
            <span className="muted small">подходов</span>
          </div>
          <div className="stat">
            <span className="stat__num">{fmt(t.volume)}</span>
            <span className="muted small">тоннаж, кг</span>
          </div>
        </div>
        <p className="muted small center">{t.exercises} упражнений в базе</p>
      </section>

      <section className="card">
        <h2 className="card__title">Эта неделя</h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat__num">{wt.days}</span>
            <span className="muted small">тренировок</span>
          </div>
          <div className="stat">
            <span className="stat__num">{wt.sets}</span>
            <span className="muted small">подходов</span>
          </div>
          <div className="stat">
            <span className="stat__num">{fmt(wt.volume)}</span>
            <span className="muted small">тоннаж, кг</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Объём по неделям</h2>
        <ProgressChart points={points} />
      </section>

      <section className="card">
        <h2 className="card__title">Недавние упражнения</h2>
        <ul className="picklist">
          {recent.map((r) => (
            <li key={r.exerciseId}>
              <button type="button" className="picklist__item" onClick={() => onLog(r.exerciseId)}>
                <span className="picklist__col">
                  <span className="picklist__name">{r.name}</span>
                  <span className="muted small">
                    {shortDate(r.date)}
                    {r.number != null ? ` · №${r.number}` : ''}
                  </span>
                </span>
                <span className="picklist__val">
                  {r.weight ?? '—'} кг × {r.reps ?? '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU')
}
