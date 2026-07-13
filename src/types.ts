// Единица ввода веса. Хранение всегда в кг (canonical).
export type Unit = 'kg' | 'lbs'

// Тренажёр из встроенного каталога (Фаза 0, собирается из QR-страниц тренажёров).
export interface Machine {
  number: number
  slug: string
  name: string
  muscleGroup?: string
  description?: string
  brand?: string
  url?: string
}

// Упражнение — то, против чего пишем подходы.
// На один QR-код может приходиться несколько упражнений (многозадачный тренажёр).
// qrCode === null — упражнение без кода (гантели, свободные веса и т.п.).
export interface Exercise {
  id: string
  name: string
  qrCode: string | null // нормализованный ключ скана (см. lib/scan.ts codeKey)
  machineNumber: number | null
  unit: Unit // единица ввода по умолчанию
  multiplier: number // множитель веса (1 — обычно, 2 — вес навешивается на каждую руку)
  bodyweight: number // 0 | 1 — упражнение с собственным весом; вводимый вес — отягощение сверх своего
  note: string | null
  createdAt: string
  updatedAt: string
  deleted: number // 0 | 1
}

// Один записанный подход. weight — итоговый вес в кг (entryWeight * множитель, переведённый в кг).
export interface WorkoutSet {
  id: string
  sessionId: string
  exerciseId: string
  machineNumber: number | null
  machineName: string // снимок имени на момент записи (для экспорта и устойчивости)
  weight: number | null // итог в кг (canonical) — используется в статистике и экспорте
  entryWeight: number | null // что ввёл пользователь (в entryUnit, на одну сторону, до множителя)
  entryUnit: Unit
  multiplier: number
  bodyweight: number // 0 | 1 — снимок: упражнение со своим весом (вес = отягощение сверх своего)
  reps: number | null
  setIndex: number
  rpe: number | null
  note: string | null
  performedAt: string
  updatedAt: string
  deleted: number // 0 | 1 (Dexie индексирует числа лучше, чем boolean)
  synced: number // 0 | 1
}

// Личный каталог «назвал один раз» (legacy v2, мигрирует в exercises на v3).
export interface MachineName {
  number: number
  name: string
  updatedAt: string
}

// Замер тела: вес или обхват/состав. metric — ключ из lib/measurements.ts.
export interface Measurement {
  id: string
  metric: string
  value: number
  unit: string
  performedAt: string
  note: string | null
  updatedAt: string
  deleted: number // 0 | 1
}

// Тренировочная сессия (один поход в зал).
export interface Session {
  id: string
  title: string | null
  startedAt: string
  endedAt: string | null
  updatedAt: string
  deleted: number
  synced: number
}
