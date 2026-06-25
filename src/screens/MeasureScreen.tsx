import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, softDeleteMeasurement } from '../db'
import { metricDef, metricSeries, metricSummary, metricsWithData } from '../lib/measurements'
import { ProgressChart } from '../components/ProgressChart'
import { MeasureForm } from '../components/MeasureForm'
import { trimNum } from '../lib/units'
import { formatDay } from '../lib/format'
import type { Measurement } from '../types'

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

export function MeasureScreen() {
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const all = useLiveQuery(
    () => db.measurements.filter((m) => m.deleted === 0).toArray(),
    [],
    [] as Measurement[],
  )

  const withData = metricsWithData(all)
  const weightSeries = metricSeries(all.filter((m) => m.metric === 'weight'))

  return (
    <div className="screen">
      <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
        + Добавить замер
      </button>

      {selected ? (
        <MeasureDetail all={all} metric={selected} onBack={() => setSelected(null)} />
      ) : withData.length === 0 ? (
        <p className="muted small">
          Замеров пока нет. Запиши вес и обхваты — здесь появятся графики динамики.
        </p>
      ) : (
        <>
          {weightSeries.length > 0 && (
            <section className="card">
              <h2 className="card__title">Вес тела</h2>
              <ProgressChart
                points={weightSeries.map((p) => ({ label: shortDay(p.date), value: p.value }))}
                unit="кг"
              />
            </section>
          )}

          <section className="card">
            <h2 className="card__title">Замеры</h2>
            <div className="tile-grid">
              {withData.map((key) => {
                const d = metricDef(key)
                const s = metricSummary(all.filter((m) => m.metric === key))
                const delta = s.latest != null && s.prev != null ? s.latest - s.prev : null
                return (
                  <button
                    type="button"
                    className="tile"
                    key={key}
                    onClick={() => setSelected(key)}
                  >
                    <span className="tile__label">{d.label}</span>
                    <span className="tile__val">
                      {s.latest != null ? trimNum(s.latest) : '—'} <small>{d.unit}</small>
                    </span>
                    {delta != null && delta !== 0 && (
                      <span className={`tile__delta ${delta > 0 ? 'is-up' : 'is-down'}`}>
                        {delta > 0 ? '▲' : '▼'} {trimNum(Math.abs(Math.round(delta * 100) / 100))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}

      {adding && <MeasureForm onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />}
    </div>
  )
}

interface DetailProps {
  all: Measurement[]
  metric: string
  onBack: () => void
}

function MeasureDetail({ all, metric, onBack }: DetailProps) {
  const d = metricDef(metric)
  const list = all.filter((m) => m.metric === metric)
  const series = metricSeries(list)
  const s = metricSummary(list)
  const rows = [...list].sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  const sinceFirst =
    s.first != null && s.latest != null ? Math.round((s.latest - s.first) * 100) / 100 : null

  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ‹ Все замеры
      </button>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title card__title--lg">{d.label}</h2>
          {s.latest != null && (
            <span className="badge">
              {trimNum(s.latest)} {d.unit}
            </span>
          )}
        </div>
        <ProgressChart
          points={series.map((p) => ({ label: shortDay(p.date), value: p.value }))}
          unit={d.unit}
        />
        <div className="stat-row">
          <div className="stat">
            <span className="stat__num">{s.min != null ? trimNum(s.min) : '—'}</span>
            <span className="muted small">мин</span>
          </div>
          <div className="stat">
            <span className="stat__num">{s.max != null ? trimNum(s.max) : '—'}</span>
            <span className="muted small">макс</span>
          </div>
          <div className="stat">
            <span className="stat__num">
              {sinceFirst != null ? (sinceFirst > 0 ? `+${trimNum(sinceFirst)}` : trimNum(sinceFirst)) : '—'}
            </span>
            <span className="muted small">с начала</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">История</h2>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>{d.unit}</th>
              <th aria-label="Удалить" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDay(r.performedAt)}</td>
                <td>{trimNum(r.value)}</td>
                <td>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Удалить замер"
                    onClick={() => softDeleteMeasurement(r.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
