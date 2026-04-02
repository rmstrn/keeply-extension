import type { Theme } from '@/shared/types'

/**
 * Apply theme class to document root
 */
export function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  }
}

/**
 * Initialize theme from storage, with system preference listener for 'system' mode.
 * Returns a cleanup function to remove the listener.
 */
export function initThemeFromStorage(onReady: () => void): void {
  try {
    chrome.storage.local.get('keeply_settings', (result) => {
      const settings = result['keeply_settings'] as { theme?: Theme } | undefined
      const theme = settings?.theme ?? 'system'

      applyTheme(theme)

      if (theme === 'system') {
        window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', (e) => {
            document.documentElement.classList.toggle('dark', e.matches)
          })
      }

      onReady()
    })
  } catch {
    onReady()
  }
}
