import { create } from 'zustand'
import type { Settings } from '@/shared/types'
import { DEFAULT_SETTINGS } from '@/shared/constants'

// =============================================================================
// SETTINGS STORE
// =============================================================================

interface SettingsState {
  readonly settings: Settings
  readonly isLoading: boolean
  setSettings: (settings: Settings) => void
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  setLoading: (loading: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  setSettings: (settings) => set({ settings, isLoading: false }),

  updateSetting: (key, value) =>
    set({ settings: { ...get().settings, [key]: value } }),

  setLoading: (isLoading) => set({ isLoading }),
}))
