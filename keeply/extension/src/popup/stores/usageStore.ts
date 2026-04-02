import { create } from 'zustand'
import type { UsageStatus } from '@/shared/types'
import { FREE_DAILY_LIMIT } from '@/shared/constants'

// =============================================================================
// USAGE STORE
// =============================================================================

interface UsageState {
  readonly status: UsageStatus
  readonly isLoading: boolean
  setStatus: (status: UsageStatus) => void
  setLoading: (loading: boolean) => void
}

const defaultStatus: UsageStatus = {
  used: 0,
  remaining: FREE_DAILY_LIMIT,
  limit: FREE_DAILY_LIMIT,
  isLimitReached: false,
  resetDate: new Date().toISOString().split('T')[0] ?? '',
}

export const useUsageStore = create<UsageState>((set) => ({
  status: defaultStatus,
  isLoading: true,

  setStatus: (status) => set({ status, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}))
