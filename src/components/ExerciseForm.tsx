import { useState } from 'react'
import type { Exercise, Unit } from '../types'
import { createExercise, updateExercise } from '../db'
import { SegmentedControl } from './controls'

export interface ExercisePrefill {
  name?: string
  qrCode?: string | null
  machineNumber?: number | null
  unit?: Unit
  multiplier?: number
  existingOnCode?: string[] // имена упражнений, уже привязанных к этому коду
}

interface Props {
  exercise?: Exercise // режим редактирования
  prefill?: ExercisePrefill // режим создания
  onSaved: (id: string, opts?: { bindQr?: boolean }) => void
  onCancel: () => void
}

export function ExerciseForm({ exercise, prefill, onSaved, onCancel }: Props) {
  const [name, setName] = useState(exercise?.name ?? prefill?.name ?? '')
  const [unit, setUnit] = useState<Unit>(exercise?.unit ?? prefill?.unit ?? 'kg')
  const [multiplier, setMultiplier] = useState<number>(
    exercise?.multiplier ?? prefill?.multiplier ?? 1,
  )
  const [bodyweight, setBodyweight] = useState<boolean>(!!exercise?.bodyweight)
  const [note, setNote] = useState(exercise?.note ?? '')

  const qrCode = exercise?.qrCode ?? prefill?.qrCode ?? null
  const machineNumber = exercise?.machineNumber ?? prefill?.machineNumber ?? null
  const existingOnCode = prefill?.existingOnCode ?? []

  // Выбор «Без QR / С QR» — только при ручном создании (нет ни упражнения, ни кода из скана).
  const canChooseQr = !exercise && !qrCode
  const [wantsQr, setWantsQr] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (exercise) {
      await updateExercise(exercise.id, {
        name: trimmed,
        unit,
        multiplier,
        bodyweight: bodyweight ? 1 : 0,
        note: note.trim() || null,
      })
      onSaved(exercise.id)
    } else {
      const ex = await createExercise({
        name: trimmed,
        unit,
        multiplier,
        bodyweight: bodyweight ? 1 : 0,
        note: note.trim() || null,
        qrCode,
        machineNumber,
      })
      onSaved(ex.id, { bindQr: canChooseQr && wantsQr })
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__sheet card">
        <h2 className="card__title">{exercise ? 'Изменить упражнение' : 'Новое упражнение'}</h2>

        {existingOnCode.length > 0 && (
          <p className="notice">
            На этом коде уже есть: {existingOnCode.join(', ')}. Создаём ещё одно — назови иначе, чтобы
            различать.
          </p>
        )}

        <label className="field-group">
          Название
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Напр. Жим ногами"
            autoFocus
          />
        </label>

        <div className="field-group">
          Единица ввода
          <SegmentedControl<Unit>
            value={unit}
            ariaLabel="Единица ввода"
            options={[
              { value: 'kg', label: 'кг' },
              { value: 'lbs', label: 'lbs' },
            ]}
            onChange={setUnit}
          />
        </div>

        <div className="field-group">
          Множитель веса
          <SegmentedControl<number>
            value={multiplier}
            ariaLabel="Множитель веса"
            options={[
              { value: 1, label: '×1' },
              { value: 2, label: '×2 (на каждую руку)' },
            ]}
            onChange={setMultiplier}
          />
        </div>

        <div className="field-group">
          Собственный вес
          <SegmentedControl<'no' | 'yes'>
            value={bodyweight ? 'yes' : 'no'}
            ariaLabel="Упражнение с собственным весом"
            options={[
              { value: 'no', label: 'Нет' },
              { value: 'yes', label: 'Да' },
            ]}
            onChange={(v) => setBodyweight(v === 'yes')}
          />
          {bodyweight && (
            <span className="muted small">
              Вводимый вес — это отягощение сверх своего веса. Оставь пустым (или 0) для подхода
              только со своим весом.
            </span>
          )}
        </div>

        <label className="field-group">
          Заметка
          <input
            className="field"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="необязательно"
          />
        </label>

        {canChooseQr ? (
          <div className="field-group">
            QR-код тренажёра
            <SegmentedControl<'no' | 'yes'>
              value={wantsQr ? 'yes' : 'no'}
              ariaLabel="Привязка к QR-коду"
              options={[
                { value: 'no', label: 'Без QR' },
                { value: 'yes', label: 'С QR — сканировать' },
              ]}
              onChange={(v) => setWantsQr(v === 'yes')}
            />
            {wantsQr && (
              <span className="muted small">
                После сохранения откроется сканер, чтобы привязать код.
              </span>
            )}
          </div>
        ) : (
          <p className="muted small">
            {machineNumber != null
              ? `Привязано к QR · №${machineNumber}`
              : qrCode
                ? 'Привязано к QR-коду'
                : 'Без QR-кода'}
          </p>
        )}

        <div className="row">
          <button type="button" className="btn" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="btn btn--primary" onClick={save} disabled={!name.trim()}>
            {canChooseQr && wantsQr ? 'Сохранить и сканировать' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
