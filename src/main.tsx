import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ensurePersistentStorage } from './lib/pwa'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, r) {
    if (!r) return
    // iOS Safari лениво проверяет обновления — проверяем сами:
    // при запуске, при возврате в приложение и раз в час.
    const update = () => {
      r.update().catch(() => {})
    }
    update()
    setInterval(update, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') update()
    })
  },
})
void ensurePersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
