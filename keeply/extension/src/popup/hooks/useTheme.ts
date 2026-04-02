import { useSettingsStore } from '@/popup/stores/settingsStore'
import { lightTheme, darkTheme } from '@/shared/constants/theme'
import type { ThemeTokens } from '@/shared/constants/theme'

export function useTheme(): ThemeTokens {
  const theme = useSettingsStore((s) => s.settings.theme)

  if (theme === 'dark') return darkTheme
  if (theme === 'light') return lightTheme

  // 'system' — check media query
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches

  return prefersDark ? darkTheme : lightTheme
}
