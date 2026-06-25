import { useState } from 'react'
import { Scanner } from './components/Scanner'
import { LogScreen } from './screens/LogScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { ExportScreen } from './screens/ExportScreen'
import { parseScan } from './lib/catalog'
import type { ActiveMachine } from './types'

type Tab = 'log' | 'history' | 'export'

function App() {
  const [tab, setTab] = useState<Tab>('log')
  const [scanning, setScanning] = useState(false)
  const [machine, setMachine] = useState<ActiveMachine | null>(null)

  function handleScan(text: string) {
    const r = parseScan(text)
    setMachine({
      number: r.number,
      name: r.machine?.name ?? (r.number != null ? `Тренажёр №${r.number}` : 'Тренажёр'),
      description: r.machine?.description ?? null,
      url: r.url,
      known: r.machine != null,
      raw: r.raw,
    })
    setScanning(false)
    setTab('log')
  }

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__brand">DDX Зал</span>
        <button type="button" className="btn btn--scan" onClick={() => setScanning(true)}>
          Сканировать QR
        </button>
      </header>

      <main className="app__main">
        {tab === 'log' && (
          <LogScreen machine={machine} onScanRequest={() => setScanning(true)} />
        )}
        {tab === 'history' && <HistoryScreen />}
        {tab === 'export' && <ExportScreen />}
      </main>

      <nav className="tabbar">
        <button
          type="button"
          className={tab === 'log' ? 'tabbar__item is-active' : 'tabbar__item'}
          onClick={() => setTab('log')}
        >
          Запись
        </button>
        <button
          type="button"
          className={tab === 'history' ? 'tabbar__item is-active' : 'tabbar__item'}
          onClick={() => setTab('history')}
        >
          Журнал
        </button>
        <button
          type="button"
          className={tab === 'export' ? 'tabbar__item is-active' : 'tabbar__item'}
          onClick={() => setTab('export')}
        >
          Экспорт
        </button>
      </nav>

      {scanning && <Scanner onResult={handleScan} onClose={() => setScanning(false)} />}
    </div>
  )
}

export default App
