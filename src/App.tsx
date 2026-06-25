import { useState, type FC } from 'react'
import { Scanner } from './components/Scanner'
import { HomeIcon, JournalIcon, DumbbellIcon, DataIcon } from './components/icons'
import { DashboardScreen } from './screens/DashboardScreen'
import { LogScreen } from './screens/LogScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { DataScreen } from './screens/DataScreen'
import { ManageScreen } from './screens/ManageScreen'
import { ExerciseForm, type ExercisePrefill } from './components/ExerciseForm'
import { ScanChooser } from './components/ScanChooser'
import { ExercisePicker } from './components/ExercisePicker'
import { parseScan, codeKey, defaultNameFor } from './lib/catalog'
import { findExercisesByCode, updateExercise } from './db'
import { useTheme } from './lib/theme'
import type { Exercise } from './types'

type Tab = 'home' | 'log' | 'history' | 'manage' | 'data'

type ScanIntent = { type: 'resolve' } | { type: 'bind'; exerciseId: string }

type Overlay =
  | { kind: 'scanner'; intent: ScanIntent }
  | { kind: 'chooser'; matches: Exercise[]; prefill: ExercisePrefill }
  | { kind: 'picker' }
  | { kind: 'form'; exercise?: Exercise; prefill?: ExercisePrefill; thenLog?: boolean }
  | null

const TABS: { id: Tab; label: string; Icon: FC<{ className?: string }> }[] = [
  { id: 'home', label: 'Главная', Icon: HomeIcon },
  { id: 'history', label: 'Журнал', Icon: JournalIcon },
  { id: 'manage', label: 'Тренажёры', Icon: DumbbellIcon },
  { id: 'data', label: 'Данные', Icon: DataIcon },
]

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [theme, setTheme] = useTheme()

  function toast(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash(null), 1500)
  }

  function startLog(id: string) {
    setActiveExerciseId(id)
    setTab('log')
  }

  function openScan() {
    setOverlay({ kind: 'scanner', intent: { type: 'resolve' } })
  }

  function openCreate(thenLog: boolean) {
    setOverlay({ kind: 'form', prefill: {}, thenLog })
  }

  async function handleScanResult(text: string) {
    const intent = overlay?.kind === 'scanner' ? overlay.intent : { type: 'resolve' as const }
    const scan = parseScan(text)
    const key = codeKey(scan)

    if (intent.type === 'bind') {
      await updateExercise(intent.exerciseId, { qrCode: key, machineNumber: scan.number })
      setOverlay(null)
      toast('QR привязан')
      return
    }

    const prefill: ExercisePrefill = {
      name: defaultNameFor(scan),
      qrCode: key,
      machineNumber: scan.number,
    }
    const matches = await findExercisesByCode(key)
    if (matches.length === 1) {
      setOverlay(null)
      startLog(matches[0].id)
    } else if (matches.length > 1) {
      setOverlay({ kind: 'chooser', matches, prefill })
    } else {
      setOverlay({ kind: 'form', prefill, thenLog: true })
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__brand">DDX Зал</span>
        <div className="app__actions">
          <button
            type="button"
            className="btn btn--sm btn--icon"
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button type="button" className="btn btn--scan btn--sm" onClick={openScan}>
            Скан
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setOverlay({ kind: 'picker' })}
          >
            Выбрать
          </button>
        </div>
      </header>

      {flash && <div className="toast">{flash}</div>}

      <main className="app__main">
        {tab === 'home' && (
          <DashboardScreen onLog={startLog} onScan={openScan} onCreate={() => openCreate(true)} />
        )}
        {tab === 'log' && (
          <LogScreen
            exerciseId={activeExerciseId}
            onScanRequest={openScan}
            onPickExercise={() => setOverlay({ kind: 'picker' })}
            onCreate={() => openCreate(true)}
          />
        )}
        {tab === 'history' && <HistoryScreen />}
        {tab === 'manage' && (
          <ManageScreen
            onLog={startLog}
            onCreate={() => openCreate(false)}
            onEdit={(ex) => setOverlay({ kind: 'form', exercise: ex })}
            onRebind={(id) => setOverlay({ kind: 'scanner', intent: { type: 'bind', exerciseId: id } })}
          />
        )}
        {tab === 'data' && <DataScreen />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'tabbar__item is-active' : 'tabbar__item'}
            onClick={() => setTab(t.id)}
          >
            <t.Icon className="tabbar__icon" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {overlay?.kind === 'scanner' && (
        <Scanner onResult={handleScanResult} onClose={() => setOverlay(null)} />
      )}

      {overlay?.kind === 'picker' && (
        <ExercisePicker
          onPick={(id) => {
            setOverlay(null)
            startLog(id)
          }}
          onCreateNew={() => openCreate(true)}
          onCancel={() => setOverlay(null)}
        />
      )}

      {overlay?.kind === 'chooser' && (
        <ScanChooser
          matches={overlay.matches}
          onPick={(id) => {
            setOverlay(null)
            startLog(id)
          }}
          onCreateNew={() => setOverlay({ kind: 'form', prefill: overlay.prefill, thenLog: true })}
          onCancel={() => setOverlay(null)}
        />
      )}

      {overlay?.kind === 'form' && (
        <ExerciseForm
          exercise={overlay.exercise}
          prefill={overlay.prefill}
          onSaved={(id) => {
            const thenLog = overlay.thenLog
            setOverlay(null)
            if (thenLog) startLog(id)
          }}
          onCancel={() => setOverlay(null)}
        />
      )}
    </div>
  )
}

export default App
