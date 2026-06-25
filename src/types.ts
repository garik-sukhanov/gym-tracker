// Тренажёр из каталога (собирается в Фазе 0 из QR-страниц DDX).
export interface Machine {
  number: number
  slug: string
  name: string
  muscleGroup?: string
  description?: string
  brand?: string
  url?: string
}

// Тренажёр, выбранный прямо сейчас (после скана или вручную).
export interface ActiveMachine {
  number: number | null
  name: string
  description: string | null
  url: string | null
  known: boolean
  raw: string
}

// Один записанный подход.
export interface WorkoutSet {
  id: string
  sessionId: string
  machineNumber: number | null
  machineName: string
  weight: number | null
  reps: number | null
  setIndex: number
  rpe: number | null
  note: string | null
  performedAt: string
  updatedAt: string
  deleted: number // 0 | 1 (Dexie индексирует числа лучше, чем boolean)
  synced: number // 0 | 1
}

// Имя тренажёра, заданное пользователем для номера (личный каталог «назвал один раз»).
export interface MachineName {
  number: number
  name: string
  updatedAt: string
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
