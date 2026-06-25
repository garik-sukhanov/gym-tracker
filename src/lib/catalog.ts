import type { Machine } from '../types'
import catalogJson from '../data/catalog.json'

interface CatalogFile {
  version: number
  baseUrl: string | null
  machines: Machine[]
}

const file = catalogJson as CatalogFile

export const catalog: Machine[] = file.machines
export const catalogBaseUrl: string | null = file.baseUrl

export function findMachineByNumber(n: number | null): Machine | undefined {
  if (n == null) return undefined
  return catalog.find((m) => m.number === n)
}

export interface ScanResult {
  raw: string
  url: string | null
  number: number | null
  machine: Machine | null
}

export function parseScan(text: string): ScanResult {
  const raw = text.trim()
  const url = looksLikeUrl(raw) ? raw : null
  const number = extractNumber(raw)
  return { raw, url, number, machine: findMachineByNumber(number) ?? null }
}

// Канонический ключ кода для привязки упражнений к QR.
// Один и тот же физический код всегда даёт один ключ, чтобы по нему находить
// все упражнения, созданные на этом тренажёре.
export function codeKey(scan: ScanResult): string {
  if (scan.number != null) return `n:${scan.number}`
  if (scan.url) return `u:${scan.url.replace(/\/+$/, '')}`
  return `r:${scan.raw}`
}

// Имя по умолчанию для нового упражнения, созданного из скана.
export function defaultNameFor(scan: ScanResult): string {
  if (scan.machine?.name) return scan.machine.name
  if (scan.number != null) return `Тренажёр №${scan.number}`
  return 'Новое упражнение'
}

// Имя, не конфликтующее с уже занятыми (другие упражнения на том же коде).
// Если базовое занято — добавляем число в конец: «Тяга сидя» → «Тяга сидя 2».
export function suggestUniqueName(base: string, taken: string[]): string {
  const norm = (s: string) => s.trim().toLowerCase()
  const used = new Set(taken.map(norm))
  if (!used.has(norm(base))) return base
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base} ${i}`
    if (!used.has(norm(candidate))) return candidate
  }
  return base
}

function looksLikeUrl(t: string): boolean {
  return /^https?:\/\//i.test(t)
}

// Достаём номер тренажёра из отсканированного текста.
// TODO(Фаза 0): уточнить под реальную структуру ссылки DDX, как только получим URL.
function extractNumber(text: string): number | null {
  if (looksLikeUrl(text)) {
    try {
      const u = new URL(text)
      for (const key of ['id', 'n', 'm', 'num', 'number', 'machine', 'e', 't']) {
        const v = u.searchParams.get(key)
        if (v && /^\d+$/.test(v)) return Number(v)
      }
      const segments = u.pathname.split('/').filter(Boolean)
      for (let i = segments.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(segments[i])) return Number(segments[i])
      }
    } catch {
      // не валидный URL — упадём в общий разбор ниже
    }
  }
  const tagged = text.match(/(?:№|#|no\.?\s*)(\d+)/i)
  if (tagged) return Number(tagged[1])
  return null
}
