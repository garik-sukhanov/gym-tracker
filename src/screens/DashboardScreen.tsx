import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { totals, weeklyVolume, recentExercises, weekStartIso } from '../lib/stats'
import { metricSeries } from '../lib/measurements'
import { ProgressChart, type ChartPoint } from '../components/ProgressChart'
import { trimNum } from '../lib/units'
import type { Measurement, WorkoutSet } from '../types'

interface Props {
  onLog: (id: string) => void
  onScan: () => void
  onCreate: () => void
}

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

export function DashboardScreen({ onLog, onScan, onCreate }: Props) {
  const sets = useLiveQuery(
    async () => db.sets.filter((s) => s.deleted === 0).toArray(),
    [],
    [] as WorkoutSet[],
  )
  const weight = useLiveQuery(
    async () => db.measurements.filter((m) => m.deleted === 0 && m.metric === 'weight').toArray(),
    [],
    [] as Measurement[],
  )

  const t = totals(sets)
  const weightSeries = metricSeries(weight)

  if (t.sets === 0 && weightSeries.length === 0) {
    return (
      <div className="screen screen--empty">
        <p className="muted">Здесь будет твой прогресс. Запиши первый подход или замер.</p>
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
  const volumePoints: ChartPoint[] = weekly.map((w) => ({ label: w.label, value: w.volume }))
  const weightPoints: ChartPoint[] = weightSeries.map((p) => ({
    label: shortDay(p.date),
    value: p.value,
  }))
  const weightFirst = weightSeries[0]?.value
  const weightLast = weightSeries[weightSeries.length - 1]?.value
  const weightDelta =
    weightFirst != null && weightLast != null
      ? Math.round((weightLast - weightFirst) * 100) / 100
      : null

  function shortDate(iso: string): string {
    if (iso.slice(0, 10) === todayKey) return 'сегодня'
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="screen">
      {t.sets > 0 && (
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
      )}

      {t.sets > 0 && (
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
      )}

      {t.sets > 0 && (
        <section className="card">
          <h2 className="card__title">Объём по неделям</h2>
          <ProgressChart points={volumePoints} />
        </section>
      )}

      {weightSeries.length > 0 && (
        <section className="card">
          <h2 className="card__title">Вес тела</h2>
          <ProgressChart points={weightPoints} unit="кг" />
          <p className="muted small center">
            Сейчас {trimNum(weightLast!)} кг
            {weightDelta != null && weightDelta !== 0
              ? ` · с начала ${weightDelta > 0 ? '+' : ''}${trimNum(weightDelta)} кг`
              : ''}
          </p>
        </section>
      )}

      {t.sets > 0 && (
        <section className="card">
          <h2 className="card__title">Недавние упражнения</h2>
          <ul className="picklist">
            {recent.map((r) => (
              <li key={r.exerciseId}>
                <button
                  type="button"
                  className="picklist__item"
                  onClick={() => onLog(r.exerciseId)}
                >
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
      )}
    </div>
  )
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU')
}
