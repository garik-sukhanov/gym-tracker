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
}

interface Props {
  exercise?: Exercise // режим редактирования
  prefill?: ExercisePrefill // режим создания
  onSaved: (id: string) => void
  onCancel: () => void
}

export function ExerciseForm({ exercise, prefill, onSaved, onCancel }: Props) {
  const [name, setName] = useState(exercise?.name ?? prefill?.name ?? '')
  const [unit, setUnit] = useState<Unit>(exercise?.unit ?? prefill?.unit ?? 'kg')
  const [multiplier, setMultiplier] = useState<number>(
    exercise?.multiplier ?? prefill?.multiplier ?? 1,
  )
  const [note, setNote] = useState(exercise?.note ?? '')

  const qrCode = exercise?.qrCode ?? prefill?.qrCode ?? null
  const machineNumber = exercise?.machineNumber ?? prefill?.machineNumber ?? null

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (exercise) {
      await updateExercise(exercise.id, {
        name: trimmed,
        unit,
        multiplier,
        note: note.trim() || null,
      })
      onSaved(exercise.id)
    } else {
      const ex = await createExercise({
        name: trimmed,
        unit,
        multiplier,
        note: note.trim() || null,
        qrCode,
        machineNumber,
      })
      onSaved(ex.id)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__sheet card">
        <h2 className="card__title">{exercise ? 'Изменить упражнение' : 'Новое упражнение'}</h2>

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

        <label className="field-group">
          Заметка
          <input
            className="field"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="необязательно"
          />
        </label>

        <p className="muted small">
          {machineNumber != null
            ? `Привязано к QR · №${machineNumber}`
            : qrCode
              ? 'Привязано к QR-коду'
              : 'Без QR-кода'}
        </p>

        <div className="row">
          <button type="button" className="btn" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="btn btn--primary" onClick={save} disabled={!name.trim()}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
