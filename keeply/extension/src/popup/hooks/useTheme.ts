import { useSettingsStore } from '@/popup/stores/settingsStore'
import { lightTheme, softJadeTheme, THEMES } from '@/shared/constants/theme'
import type { ThemeTokens } from '@/shared/constants/theme'

export function useTheme(): ThemeTokens {
  const theme = useSettingsStore((s) => s.settings.theme)

  if (theme === 'system') {
    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? softJadeTheme : lightTheme
  }

  // 'dark' is a legacy alias for 'soft-jade'
  const id = theme === 'dark' ? 'soft-jade' : theme
  return THEMES.find((t) => t.id === id) ?? lightTheme
}
