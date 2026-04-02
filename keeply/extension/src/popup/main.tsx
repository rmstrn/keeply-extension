import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './popup.css'

// Apply theme before render to avoid flash
try {
  chrome.storage.local.get('keeply_settings', (result) => {
    const settings = result['keeply_settings'] as { theme?: string } | undefined
    const theme = settings?.theme ?? 'system'

    const applyTheme = (dark: boolean) => {
      document.documentElement.classList.toggle('dark', dark)
    }

    if (theme === 'dark') {
      applyTheme(true)
    } else if (theme === 'light') {
      applyTheme(false)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme(prefersDark)
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (e) => applyTheme(e.matches))
    }

    renderApp()
  })
} catch {
  // Extension not loaded (dev/test) — render immediately
  renderApp()
}

function renderApp() {
  const root = document.getElementById('root')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

if (import.meta.env.DEV) {
  import('@/shared/utils/usageUtils').then(({ resetUsageForDev }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).keeplyResetUsage = resetUsageForDev
  })
}
