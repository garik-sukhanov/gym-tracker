import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { unitLabel } from '../lib/units'

interface Props {
  onPick: (id: string) => void
  onCreateNew: () => void
  onCancel: () => void
}

// Полный список упражнений — кнопка «Выбрать» в шапке.
export function ExercisePicker({ onPick, onCreateNew, onCancel }: Props) {
  const exercises = useLiveQuery(async () => {
    const all = await db.exercises.filter((e) => e.deleted === 0).toArray()
    all.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    return all
  }, [])

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__sheet card">
        <h2 className="card__title">Выбрать упражнение</h2>
        {!exercises || exercises.length === 0 ? (
          <p className="muted small">Упражнений пока нет — отсканируй QR или создай вручную.</p>
        ) : (
          <ul className="picklist">
            {exercises.map((e) => (
              <li key={e.id}>
                <button type="button" className="picklist__item" onClick={() => onPick(e.id)}>
                  <span className="picklist__col">
                    <span className="picklist__name">{e.name}</span>
                    <span className="muted small">
                      {unitLabel(e.unit)}
                      {e.multiplier > 1 ? ` · ×${e.multiplier}` : ''}
                      {e.bodyweight ? ' · свой вес' : ''}
                      {e.machineNumber != null ? ` · №${e.machineNumber}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn" onClick={onCreateNew}>
          + Новое упражнение
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  )
}
