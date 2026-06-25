import { trimNum } from '../lib/units'

export interface SegOption<T> {
  value: T
  label: string
}

interface SegmentedProps<T extends string | number> {
  value: T
  options: SegOption<T>[]
  onChange: (v: T) => void
  ariaLabel?: string
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={o.value === value ? 'segmented__opt is-active' : 'segmented__opt'}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface StepperProps {
  label: string
  value: string
  onChange: (v: string) => void
  step: number
  inputMode?: 'decimal' | 'numeric'
  min?: number
}

// Поле с числом и стрелками сверху (▲) и снизу (▼) — менять значение кнопками,
// а не вводом. Снапит к кратным шага, чтобы числа оставались ровными.
export function Stepper({ label, value, onChange, step, inputMode = 'decimal', min = 0 }: StepperProps) {
  function bump(dir: 1 | -1) {
    const current = parseNum(value)
    const base = current == null ? 0 : current
    const snapped = Math.round(base / step) * step
    // если значение уже кратно шагу — двигаем на шаг; иначе доводим до ближайшего кратного
    const next = snapped === base || current == null ? base + dir * step : snapped + (dir > 0 ? step : 0)
    const clamped = Math.max(min, Math.round(next * 100) / 100)
    onChange(trimNum(clamped))
  }

  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <button type="button" className="stepper__btn" aria-label={`${label}: больше`} onClick={() => bump(1)}>
        ▲
      </button>
      <input
        className="field field--num"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
      <button type="button" className="stepper__btn" aria-label={`${label}: меньше`} onClick={() => bump(-1)}>
        ▼
      </button>
    </div>
  )
}

function parseNum(v: string): number | null {
  const t = v.replace(',', '.').trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
