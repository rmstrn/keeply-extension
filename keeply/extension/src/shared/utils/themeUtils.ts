import type { Theme } from '@/shared/types'
import { lightTheme, softJadeTheme, THEMES } from '@/shared/constants/theme'
import type { ThemeTokens } from '@/shared/constants/theme'

function applyThemeVars(tokens: ThemeTokens): void {
  const s = document.documentElement.style
  s.setProperty('--bg', tokens.bg)
  s.setProperty('--surface', tokens.surface)
  s.setProperty('--elevated', tokens.elevated)
  s.setProperty('--border', tokens.border)
  s.setProperty('--hover-bg', tokens.hoverBg)
  s.setProperty('--text', tokens.text)
  s.setProperty('--text-2', tokens.text2)
  s.setProperty('--text-muted', tokens.textMuted)
  s.setProperty('--primary', tokens.primary)
  s.setProperty('--primary-hover', tokens.primaryHover)
  s.setProperty('--primary-text', tokens.primaryText)
  s.setProperty('--danger', tokens.danger)
  s.setProperty('--danger-bg', tokens.dangerBg)
  s.setProperty('--warning', tokens.warning)
  s.setProperty('--success', tokens.success)
}

function resolveTheme(theme: Theme): ThemeTokens {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? softJadeTheme : lightTheme
  }
  // 'dark' is a legacy alias for 'soft-jade'
  const id = theme === 'dark' ? 'soft-jade' : theme
  return THEMES.find((t) => t.id === id) ?? lightTheme
}

/**
 * Apply theme class to document root and set CSS variables
 */
export function applyTheme(theme: Theme): void {
  const tokens = resolveTheme(theme)
  const isDark = tokens.id !== 'light'
  document.documentElement.classList.toggle('dark', isDark)
  applyThemeVars(tokens)
}

/**
 * Initialize theme from storage, with system preference listener for 'system' mode.
 */
export function initThemeFromStorage(onReady: () => void): void {
  try {
    chrome.storage.local.get('keeply_settings', (result) => {
      const settings = result['keeply_settings'] as { theme?: Theme } | undefined
      const theme = settings?.theme ?? 'system'

      applyTheme(theme)

      if (theme === 'system') {
        window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', () => {
            applyTheme('system')
          })
      }

      onReady()
    })
  } catch {
    onReady()
  }
}
