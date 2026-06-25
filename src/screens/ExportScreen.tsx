import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { exportXlsx, exportCsv } from '../lib/export'
import { isCloudEnabled } from '../lib/supabase'
import { syncNow } from '../lib/sync'

export function ExportScreen() {
  const total = useLiveQuery(() => db.sets.filter((s) => s.deleted === 0).count(), [], 0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function doExport(kind: 'xlsx' | 'csv') {
    setBusy(true)
    setMsg(null)
    try {
      const n = kind === 'xlsx' ? await exportXlsx() : await exportCsv()
      setMsg(`Выгружено строк: ${n}`)
    } catch {
      setMsg('Ошибка экспорта')
    } finally {
      setBusy(false)
    }
  }

  async function doSync() {
    setBusy(true)
    setMsg(null)
    try {
      const r = await syncNow()
      setMsg(r ? `Синхронизировано: ↑${r.pushed} ↓${r.pulled}` : 'Облако не настроено')
    } catch (e) {
      setMsg('Ошибка синхронизации: ' + describe(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <section className="card">
        <h2 className="card__title">Экспорт в таблицу</h2>
        <p className="muted small">Всего подходов в базе: {total}</p>
        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => doExport('xlsx')}
          >
            Excel (.xlsx)
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => doExport('csv')}>
            CSV
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Облако</h2>
        {isCloudEnabled ? (
          <>
            <p className="muted small">Supabase подключён.</p>
            <button type="button" className="btn" disabled={busy} onClick={doSync}>
              Синхронизировать сейчас
            </button>
          </>
        ) : (
          <p className="muted small">
            Supabase не настроен. Добавь ключи в <code>.env</code> (см. README), чтобы включить
            бэкап и синхронизацию между устройствами.
          </p>
        )}
      </section>

      {msg && <p className="flash">{msg}</p>}
    </div>
  )
}

function describe(e: unknown): string {
  return (e as { message?: string }).message ?? 'неизвестно'
}
