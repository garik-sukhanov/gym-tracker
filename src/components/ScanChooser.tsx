import type { Exercise } from '../types'

interface Props {
  matches: Exercise[]
  onPick: (id: string) => void
  onCreateNew: () => void
  onCancel: () => void
}

// Несколько упражнений на одном QR-коде (многозадачный тренажёр) — выбираем нужное.
export function ScanChooser({ matches, onPick, onCreateNew, onCancel }: Props) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__sheet card">
        <h2 className="card__title">Что выполняем?</h2>
        <p className="muted small">На этом коде несколько упражнений.</p>
        <ul className="picklist">
          {matches.map((e) => (
            <li key={e.id}>
              <button type="button" className="picklist__item" onClick={() => onPick(e.id)}>
                <span className="picklist__name">{e.name}</span>
                {e.machineNumber != null && <span className="badge">№{e.machineNumber}</span>}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn" onClick={onCreateNew}>
          + Новое упражнение на этом коде
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  )
}
