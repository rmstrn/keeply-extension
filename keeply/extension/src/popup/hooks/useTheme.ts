import { useSettingsStore } from '@/popup/stores/settingsStore'
import { resolveTheme } from '@/shared/constants/theme'
import type { ThemeTokens } from '@/shared/constants/theme'

export function useTheme(): ThemeTokens {
  const theme = useSettingsStore((s) => s.settings.theme)
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return resolveTheme(theme, prefersDark)
}
