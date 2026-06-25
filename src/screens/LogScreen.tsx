import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addSet, softDeleteSet, lastSetForExercise, getExercise, updateExercise } from '../db'
import { formatTime } from '../lib/format'
import { Stepper, SegmentedControl } from '../components/controls'
import { fromKg, toKg, trimNum, unitLabel, WEIGHT_STEP, REPS_STEP } from '../lib/units'
import type { Exercise, Unit, WorkoutSet } from '../types'

interface Props {
  exerciseId: string | null
  onScanRequest: () => void
  onPickExercise: () => void
  onCreate: () => void
  onAddVariant: (ex: Exercise) => void
}

export function LogScreen({
  exerciseId,
  onScanRequest,
  onPickExercise,
  onCreate,
  onAddVariant,
}: Props) {
  const exercise = useLiveQuery(
    () => (exerciseId ? getExercise(exerciseId) : Promise.resolve(undefined)),
    [exerciseId],
  )

  const [unit, setUnit] = useState<Unit>('kg')
  const [multiplier, setMultiplier] = useState(1)
  const [weight, setWeight] = useState('') // введённое значение в текущей единице, на одну сторону
  const [reps, setReps] = useState('')
  const [flash, setFlash] = useState(false)

  // Смена упражнения: подставляем его настройки и последний подход.
  useEffect(() => {
    if (!exercise) return
    let cancelled = false
    const u = exercise.unit
    const m = exercise.multiplier || 1
    setUnit(u)
    setMultiplier(m)
    ;(async () => {
      const last = await lastSetForExercise(exercise.id)
      if (cancelled) return
      if (last && last.weight != null) {
        const perSideKg = last.weight / m
        setWeight(trimNum(Math.round(fromKg(perSideKg, u) * 100) / 100))
      } else {
        setWeight('')
      }
      setReps(last?.reps != null ? String(last.reps) : '')
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id])

  const sets = useLiveQuery(
    async () => {
      if (!exercise) return [] as WorkoutSet[]
      const all = await db.sets
        .where('exerciseId')
        .equals(exercise.id)
        .filter((s) => s.deleted === 0)
        .toArray()
      all.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      return all.slice(0, 15)
    },
    [exercise?.id],
    [] as WorkoutSet[],
  )

  function changeUnit(next: Unit) {
    const n = num(weight)
    if (n != null) {
      const kg = toKg(n, unit)
      setWeight(trimNum(Math.round(fromKg(kg, next) * 100) / 100))
    }
    setUnit(next)
  }

  const entry = num(weight)
  const totalKg = entry == null ? null : Math.round(toKg(entry, unit) * multiplier * 100) / 100

  async function save() {
    if (!exercise) return
    await addSet({
      exerciseId: exercise.id,
      machineName: exercise.name,
      machineNumber: exercise.machineNumber,
      entryWeight: entry,
      entryUnit: unit,
      multiplier,
      reps: num(reps),
    })
    if (exercise.unit !== unit || exercise.multiplier !== multiplier) {
      await updateExercise(exercise.id, { unit, multiplier })
    }
    setFlash(true)
    window.setTimeout(() => setFlash(false), 900)
  }

  if (!exercise) {
    return (
      <div className="screen screen--empty">
        <p className="muted">Отсканируй QR на тренажёре или выбери упражнение.</p>
        <button type="button" className="btn btn--primary btn--big" onClick={onScanRequest}>
          Сканировать QR
        </button>
        <button type="button" className="btn" onClick={onPickExercise}>
          Выбрать из списка
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCreate}>
          + Создать без QR
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <section className="card">
        <div className="card__head">
          <h2 className="card__title card__title--lg">{exercise.name}</h2>
          {exercise.machineNumber != null && <span className="badge">№{exercise.machineNumber}</span>}
        </div>

        {exercise.qrCode && (
          <button type="button" className="btn--link" onClick={() => onAddVariant(exercise)}>
            + Другое упражнение на этом тренажёре
          </button>
        )}

        <div className="row">
          <div className="field-group">
            Единица
            <SegmentedControl<Unit>
              value={unit}
              ariaLabel="Единица ввода"
              options={[
                { value: 'kg', label: 'кг' },
                { value: 'lbs', label: 'lbs' },
              ]}
              onChange={changeUnit}
            />
          </div>
          <div className="field-group">
            Множитель
            <SegmentedControl<number>
              value={multiplier}
              ariaLabel="Множитель веса"
              options={[
                { value: 1, label: '×1' },
                { value: 2, label: '×2' },
              ]}
              onChange={setMultiplier}
            />
          </div>
        </div>

        <div className="row row--steppers">
          <Stepper
            label={`Вес, ${unitLabel(unit)}${multiplier > 1 ? ` (×${multiplier})` : ''}`}
            value={weight}
            onChange={setWeight}
            step={WEIGHT_STEP[unit]}
            inputMode="decimal"
          />
          <Stepper
            label="Повторы"
            value={reps}
            onChange={setReps}
            step={REPS_STEP}
            inputMode="numeric"
          />
        </div>

        {totalKg != null && (unit === 'lbs' || multiplier > 1) && (
          <p className="muted small center">Итого: {trimNum(totalKg)} кг</p>
        )}

        <button type="button" className="btn btn--primary btn--big" onClick={save}>
          {flash ? 'Записано ✓' : 'Записать подход'}
        </button>
      </section>

      <section className="card">
        <h2 className="card__title">Сегодня · {exercise.name}</h2>
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
