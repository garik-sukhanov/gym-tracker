import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addMeasurements, type MeasurementInput } from '../db'
import { METRICS } from '../lib/measurements'

interface Props {
  onSaved: () => void
  onCancel: () => void
}

function todayInput(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function MeasureForm({ onSaved, onCancel }: Props) {
  const [date, setDate] = useState(todayInput())
  const [values, setValues] = useState<Record<string, string>>({})

  // Последнее значение каждой метрики — показываем как подсказку (placeholder).
  const last = useLiveQuery(
    async () => {
      const all = await db.measurements.filter((m) => m.deleted === 0).toArray()
      const byMetric: Record<string, { v: number; at: string }> = {}
      for (const m of all) {
        const cur = byMetric[m.metric]
        if (!cur || cur.at < m.performedAt) byMetric[m.metric] = { v: m.value, at: m.performedAt }
      }
      const map: Record<string, number> = {}
      for (const k in byMetric) map[k] = byMetric[k].v
      return map
    },
    [],
    {} as Record<string, number>,
  )

  async function save() {
    const entries: MeasurementInput[] = []
    for (const m of METRICS) {
      const n = num(values[m.key] ?? '')
      if (n != null) entries.push({ metric: m.key, value: n, unit: m.unit })
    }
    if (entries.length === 0) {
      onCancel()
      return
    }
    const performedAt = new Date(`${date}T12:00:00`).toISOString()
    await addMeasurements(performedAt, entries)
    onSaved()
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__sheet card">
        <h2 className="card__title">Новый замер</h2>
        <label className="field-group">
          Дата
          <input
            type="date"
            className="field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <p className="muted small">Заполни что измерил — пустые поля не сохраняются.</p>
        <div className="measure-form">
          {METRICS.map((m) => (
            <label className="field-group" key={m.key}>
              {m.label}, {m.unit}
              <input
                className="field"
                inputMode="decimal"
                value={values[m.key] ?? ''}
                placeholder={last[m.key] != null ? String(last[m.key]) : '—'}
                onChange={(e) => setValues((v) => ({ ...v, [m.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="btn btn--primary" onClick={save}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

function num(v: string): number | null {
  const t = v.replace(',', '.').trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
