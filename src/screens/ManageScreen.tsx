import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getExercise, softDeleteExercise, updateExercise } from '../db'
import { exerciseStats } from '../lib/stats'
import { ProgressChart, type ChartPoint } from '../components/ProgressChart'
import { unitLabel } from '../lib/units'
import { formatDay } from '../lib/format'
import type { Exercise, WorkoutSet } from '../types'

interface Props {
  onLog: (id: string) => void
  onCreate: () => void
  onEdit: (ex: Exercise) => void
  onRebind: (id: string) => void
}

export function ManageScreen({ onLog, onCreate, onEdit, onRebind }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const exercises = useLiveQuery(async () => {
    const all = await db.exercises.filter((e) => e.deleted === 0).toArray()
    all.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    return all
  }, [])

  if (selected) {
    return (
      <ExerciseDetail
        exerciseId={selected}
        onBack={() => setSelected(null)}
        onLog={onLog}
        onEdit={onEdit}
        onRebind={onRebind}
      />
    )
  }

  return (
    <div className="screen">
      <button type="button" className="btn btn--primary" onClick={onCreate}>
        + Новое упражнение
      </button>

      {!exercises || exercises.length === 0 ? (
        <p className="muted small">
          Упражнений пока нет. Отсканируй QR или создай вручную (гантели, свободные веса).
        </p>
      ) : (
        <ul className="picklist picklist--cards">
          {exercises.map((e) => (
            <li key={e.id}>
              <button type="button" className="picklist__item" onClick={() => setSelected(e.id)}>
                <span className="picklist__col">
                  <span className="picklist__name">{e.name}</span>
                  <span className="muted small">{meta(e)}</span>
                </span>
                <span className="picklist__chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function meta(e: Exercise): string {
  const parts = [unitLabel(e.unit)]
  if (e.multiplier > 1) parts.push(`×${e.multiplier}`)
  if (e.bodyweight) parts.push('свой вес')
  parts.push(e.qrCode ? (e.machineNumber != null ? `QR №${e.machineNumber}` : 'QR') : 'без QR')
  return parts.join(' · ')
}

interface DetailProps {
  exerciseId: string
  onBack: () => void
  onLog: (id: string) => void
  onEdit: (ex: Exercise) => void
  onRebind: (id: string) => void
}

function ExerciseDetail({ exerciseId, onBack, onLog, onEdit, onRebind }: DetailProps) {
  const exercise = useLiveQuery(() => getExercise(exerciseId), [exerciseId])
  const sets = useLiveQuery(
    async () => {
      const all = await db.sets
        .where('exerciseId')
        .equals(exerciseId)
        .filter((s) => s.deleted === 0)
        .toArray()
      return all
    },
    [exerciseId],
    [] as WorkoutSet[],
  )

  if (exercise === undefined) {
    return (
      <div className="screen">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ‹ Назад
        </button>
        <p className="muted small">Упражнение не найдено.</p>
      </div>
    )
  }

  const stats = exerciseStats(sets)
  const recent = [...stats].reverse()
  const points: ChartPoint[] = stats.map((s) => ({
    label: shortDay(s.date),
    value: s.maxWeight,
  }))
  const best = stats.reduce((m, s) => Math.max(m, s.maxWeight), 0)
  const bestE1rm = stats.reduce((m, s) => Math.max(m, s.e1rm), 0)

  async function unbind() {
    await updateExercise(exerciseId, { qrCode: null, machineNumber: null })
  }

  async function remove() {
    if (!window.confirm(`Удалить «${exercise!.name}»? Подходы останутся в журнале.`)) return
    await softDeleteExercise(exerciseId)
    onBack()
  }

  return (
    <div className="screen">
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ‹ Все упражнения
      </button>

      <section className="card">
        <div className="card__head">
          <h2 className="card__title card__title--lg">{exercise.name}</h2>
          {exercise.machineNumber != null && <span className="badge">№{exercise.machineNumber}</span>}
        </div>
        <p className="muted small">{meta(exercise)}</p>
        <div className="btn-grid">
          <button type="button" className="btn btn--primary" onClick={() => onLog(exerciseId)}>
            Запись
          </button>
          <button type="button" className="btn" onClick={() => onEdit(exercise)}>
            Изменить
          </button>
          <button type="button" className="btn" onClick={() => onRebind(exerciseId)}>
            Привязать QR
          </button>
          {exercise.qrCode && (
            <button type="button" className="btn" onClick={unbind}>
              Отвязать QR
            </button>
          )}
          <button type="button" className="btn btn--danger" onClick={remove}>
            Удалить
          </button>
        </div>
      </section>

      {stats.length === 0 ? (
        <section className="card">
          <p className="muted small">Ещё нет записанных подходов.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2 className="card__title">Прогресс веса</h2>
            <ProgressChart points={points} />
            <div className="stat-row">
              <div className="stat">
                <span className="stat__num">{best}</span>
                <span className="muted small">макс. вес, кг</span>
              </div>
              <div className="stat">
                <span className="stat__num">{bestE1rm}</span>
                <span className="muted small">оценка 1ПМ, кг</span>
              </div>
              <div className="stat">
                <span className="stat__num">{stats.length}</span>
                <span className="muted small">тренировок</span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="card__title">По датам</h2>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Макс. вес</th>
                  <th>Повт.</th>
                  <th>Тоннаж</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.day}>
                    <td>{formatDay(s.date)}</td>
                    <td>{s.maxWeight} кг</td>
                    <td>{s.topReps || '—'}</td>
                    <td>{s.volume} кг</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}
