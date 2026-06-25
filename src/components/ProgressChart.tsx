export interface ChartPoint {
  label: string // короткая подпись по оси X (дата)
  value: number
}

interface Props {
  points: ChartPoint[]
  unit?: string
}

// Лёгкий линейный график без зависимостей (inline SVG). Прогресс веса по датам.
export function ProgressChart({ points, unit = 'кг' }: Props) {
  if (points.length === 0) return null

  const W = 320
  const H = 150
  const padL = 34
  const padR = 12
  const padT = 14
  const padB = 22
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const values = points.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min = Math.max(0, min - 1)
    max = max + 1
  }

  const x = (i: number) =>
    padL + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1))
  const y = (v: number) => padT + innerH - (innerH * (v - min)) / (max - min)

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${padL},${padT + innerH} ${line} ${x(points.length - 1)},${padT + innerH}`
  const last = points[points.length - 1]

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="График прогресса веса">
      {/* сетка: верх/низ */}
      <line x1={padL} y1={padT} x2={W - padR} y2={padT} className="chart__grid" />
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} className="chart__grid" />
      <text x={padL - 6} y={padT + 4} className="chart__axis" textAnchor="end">
        {round(max)}
      </text>
      <text x={padL - 6} y={padT + innerH + 4} className="chart__axis" textAnchor="end">
        {round(min)}
      </text>

      {points.length > 1 && <polygon points={area} className="chart__area" />}
      {points.length > 1 && <polyline points={line} className="chart__line" />}

      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2.5} className="chart__dot" />
      ))}

      {/* подписи X: первая и последняя */}
      <text x={padL} y={H - 6} className="chart__axis" textAnchor="start">
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text x={W - padR} y={H - 6} className="chart__axis" textAnchor="end">
          {last.label}
        </text>
      )}

      {/* значение последней точки */}
      <text x={x(points.length - 1)} y={y(last.value) - 8} className="chart__value" textAnchor="middle">
        {round(last.value)} {unit}
      </text>
    </svg>
  )
}

function round(v: number): number {
  return Math.round(v * 10) / 10
}
