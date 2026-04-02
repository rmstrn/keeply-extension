import { create } from 'zustand'
import type { GroupingResult, PopupScreen } from '@/shared/types'

// =============================================================================
// TAB STORE
// Управляет состоянием группировки в popup
// =============================================================================

interface TabState {
  // Текущий экран
  readonly screen: PopupScreen

  // Результат последней группировки
  readonly lastResult: GroupingResult | null

  // Сообщение об ошибке
  readonly errorMessage: string | null

  // Timestamp to trigger data re-fetch in components
  readonly lastRefresh: number

  // Actions
  setScreen: (screen: PopupScreen) => void
  setResult: (result: GroupingResult) => void
  setError: (message: string) => void
  reset: () => void
  startGrouping: () => void
  triggerRefresh: () => void
}

const initialState = {
  screen: 'default' as PopupScreen,
  lastResult: null,
  errorMessage: null,
  lastRefresh: 0,
}

export const useTabStore = create<TabState>((set) => ({
  ...initialState,

  setScreen: (screen) => set({ screen }),

  setResult: (result) =>
    set({
      lastResult: result,
      screen: 'results',
      errorMessage: null,
    }),

  setError: (message) =>
    set({
      errorMessage: message,
      // FREE_LIMIT_REACHED → показываем paywall
      screen: message === 'FREE_LIMIT_REACHED' ? 'paywall' : 'default',
    }),

  reset: () => set(initialState),

  startGrouping: () =>
    set({
      screen: 'loading',
      errorMessage: null,
    }),

  triggerRefresh: () => set({ lastRefresh: Date.now() }),
}))
