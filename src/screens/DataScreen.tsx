import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { exportXlsx, exportCsv } from '../lib/export'
import { exportJson, importFile } from '../lib/backup'
import { checkForUpdate, storageInfo, type StorageInfo } from '../lib/pwa'

export function DataScreen() {
  const total = useLiveQuery(() => db.sets.filter((s) => s.deleted === 0).count(), [], 0)
  const exCount = useLiveQuery(() => db.exercises.filter((e) => e.deleted === 0).count(), [], 0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [storage, setStorage] = useState<StorageInfo>({ persisted: false, usageMb: null })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    storageInfo().then(setStorage)
  }, [])

  async function run(fn: () => Promise<unknown>, ok: (r: unknown) => string) {
    setBusy(true)
    setMsg(null)
    try {
      setMsg(ok(await fn()))
    } catch (e) {
      setMsg('Ошибка: ' + describe(e))
    } finally {
      setBusy(false)
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await run(
      () => importFile(file),
      (r) => {
        const res = r as { exercises: number; sets: number }
        return `Импортировано: упражнений ${res.exercises}, подходов ${res.sets}`
      },
    )
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="screen">
      <section className="card">
        <h2 className="card__title">Экспорт</h2>
        <p className="muted small">
          В базе: {total} подходов · {exCount} упражнений
        </p>
        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => run(exportXlsx, (n) => `Выгружено строк: ${n}`)}
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => run(exportCsv, (n) => `Выгружено строк: ${n}`)}
          >
            CSV
          </button>
        </div>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => run(exportJson, (n) => `Резервная копия сохранена (${n} подходов)`)}
        >
          Резервная копия (.json)
        </button>
      </section>

      <section className="card">
        <h2 className="card__title">Импорт</h2>
        <p className="muted small">
          Загрузи резервную копию <code>.json</code> (полное восстановление) или таблицу{' '}
          <code>.xlsx</code>/<code>.csv</code>, ранее выгруженную отсюда. Дубли подходов
          пропускаются.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,.xlsx"
          hidden
          onChange={onFile}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Выбрать файл
        </button>
      </section>

      <section className="card">
        <h2 className="card__title">Хранилище и обновления</h2>
        <p className="muted small">
          {storage.persisted
            ? '✓ Данные защищены от автоочистки браузером.'
            : 'Обычный режим: при сильной нехватке места браузер может очистить данные.'}
          {storage.usageMb != null ? ` Занято ~${storage.usageMb} МБ.` : ''}
        </p>
        <p className="muted small">
          Данные хранятся на телефоне и <b>сохраняются при обновлении приложения</b>. На всякий
          случай периодически делай резервную копию (.json) выше.
        </p>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => checkForUpdate().finally(() => location.reload())}
        >
          Обновить приложение
        </button>
      </section>

      {msg && <p className="flash">{msg}</p>}
    </div>
  )
}

function describe(e: unknown): string {
  return (e as { message?: string }).message ?? 'неизвестно'
}
