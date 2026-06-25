import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'ddx.theme'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function stored(): Theme | null {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : null
}

function metaColor(theme: Theme): string {
  return theme === 'light' ? '#f0f7f7' : '#041b1e'
}

// Тема приложения: сохраняется в localStorage, по умолчанию — системная.
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => stored() ?? systemTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', metaColor(theme))
  }, [theme])

  // Пока пользователь не выбрал тему явно — следуем за системой.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      if (!stored()) setThemeState(systemTheme())
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function setTheme(t: Theme) {
    localStorage.setItem(KEY, t)
    setThemeState(t)
  }

  return [theme, setTheme]
}
