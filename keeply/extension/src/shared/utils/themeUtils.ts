import type { Theme } from '@/shared/types'
import { resolveTheme } from '@/shared/constants/theme'
import type { ThemeTokens } from '@/shared/constants/theme'

const CSS_VAR_MAP: ReadonlyArray<[string, keyof ThemeTokens]> = [
  ['--bg', 'bg'], ['--surface', 'surface'], ['--elevated', 'elevated'],
  ['--border', 'border'], ['--hover-bg', 'hoverBg'],
  ['--text', 'text'], ['--text-2', 'text2'], ['--text-muted', 'textMuted'],
  ['--primary', 'primary'], ['--primary-hover', 'primaryHover'], ['--primary-text', 'primaryText'],
  ['--danger', 'danger'], ['--danger-bg', 'dangerBg'],
  ['--warning', 'warning'], ['--success', 'success'],
]

function applyThemeVars(tokens: ThemeTokens): void {
  const s = document.documentElement.style
  for (const [prop, key] of CSS_VAR_MAP) {
    s.setProperty(prop, tokens[key])
  }
}

export function applyTheme(theme: Theme): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const tokens = resolveTheme(theme, prefersDark)
  document.documentElement.classList.toggle('dark', tokens.id !== 'light')
  applyThemeVars(tokens)
}

export function initThemeFromStorage(onReady: () => void): void {
  try {
    chrome.storage.local.get('keeply_settings', (result) => {
      const settings = result['keeply_settings'] as { theme?: Theme } | undefined
      const theme = settings?.theme ?? 'system'

      applyTheme(theme)

      if (theme === 'system') {
        window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', () => applyTheme('system'))
      }

      onReady()
    })
  } catch {
    onReady()
  }
}
