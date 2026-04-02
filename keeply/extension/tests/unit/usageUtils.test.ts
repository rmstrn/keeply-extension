import { describe, it, expect } from 'vitest'
import {
  getTodayString,
  createInitialUsage,
  resetUsageIfNewDay,
  incrementUsage,
  isLimitReached,
  getRemainingUsage,
  getUsageStatus,
  recordUsage,
} from '@/shared/utils/usageUtils'
import { FREE_DAILY_LIMIT } from '@/shared/constants'

// =============================================================================
// USAGE UTILS TESTS
// =============================================================================

describe('getTodayString', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const result = getTodayString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns current local date', () => {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(getTodayString()).toBe(today)
  })
})

describe('createInitialUsage', () => {
  it('creates usage with zero count', () => {
    const usage = createInitialUsage()
    expect(usage.count).toBe(0)
  })

  it('uses today as date by default', () => {
    const today = getTodayString()
    const usage = createInitialUsage()
    expect(usage.date).toBe(today)
  })

  it('uses provided date when given', () => {
    const usage = createInitialUsage('2024-01-15')
    expect(usage.date).toBe('2024-01-15')
  })

  it('sets limit to FREE_DAILY_LIMIT', () => {
    const usage = createInitialUsage()
    expect(usage.limit).toBe(FREE_DAILY_LIMIT)
  })
})

describe('resetUsageIfNewDay', () => {
  it('returns same object when date is today', () => {
    const today = getTodayString()
    const usage = { count: 3, date: today, limit: 5 }
    const result = resetUsageIfNewDay(usage)
    expect(result).toBe(usage) // Referential equality — не создаём новый объект
  })

  it('resets count when date is yesterday', () => {
    const yesterday = '2020-01-01'
    const usage = { count: 5, date: yesterday, limit: 5 }
    const result = resetUsageIfNewDay(usage)
    expect(result.count).toBe(0)
  })

  it('updates date to today when resetting', () => {
    const yesterday = '2020-01-01'
    const usage = { count: 5, date: yesterday, limit: 5 }
    const result = resetUsageIfNewDay(usage)
    expect(result.date).toBe(getTodayString())
  })

  it('preserves limit when resetting', () => {
    const usage = { count: 5, date: '2020-01-01', limit: 10 }
    const result = resetUsageIfNewDay(usage)
    expect(result.limit).toBe(10)
  })

  it('is immutable — does not mutate original', () => {
    const usage = { count: 5, date: '2020-01-01', limit: 5 }
    const original = { ...usage }
    resetUsageIfNewDay(usage)
    expect(usage).toEqual(original)
  })
})

describe('incrementUsage', () => {
  it('increments count by 1', () => {
    const usage = createInitialUsage()
    const result = incrementUsage(usage)
    expect(result.count).toBe(1)
  })

  it('is immutable — returns new object', () => {
    const usage = { count: 2, date: '2024-01-01', limit: 5 }
    const result = incrementUsage(usage)
    expect(result).not.toBe(usage)
    expect(usage.count).toBe(2) // оригинал не изменился
  })

  it('preserves date and limit', () => {
    const usage = { count: 0, date: '2024-06-15', limit: 5 }
    const result = incrementUsage(usage)
    expect(result.date).toBe('2024-06-15')
    expect(result.limit).toBe(5)
  })

  it('can increment beyond limit (limit check is separate)', () => {
    const usage = { count: 5, date: getTodayString(), limit: 5 }
    const result = incrementUsage(usage)
    expect(result.count).toBe(6) // Не блокирует — проверка отдельно
  })
})

describe('isLimitReached', () => {
  it('returns false when count < limit', () => {
    const usage = { count: 3, date: getTodayString(), limit: 5 }
    expect(isLimitReached(usage)).toBe(false)
  })

  it('returns true when count equals limit', () => {
    const usage = { count: 5, date: getTodayString(), limit: 5 }
    expect(isLimitReached(usage)).toBe(true)
  })

  it('returns true when count exceeds limit', () => {
    const usage = { count: 7, date: getTodayString(), limit: 5 }
    expect(isLimitReached(usage)).toBe(true)
  })

  it('returns false when count is 0', () => {
    const usage = { count: 0, date: getTodayString(), limit: 5 }
    expect(isLimitReached(usage)).toBe(false)
  })
})

describe('getRemainingUsage', () => {
  it('returns correct remaining count', () => {
    const usage = { count: 2, date: getTodayString(), limit: 5 }
    expect(getRemainingUsage(usage)).toBe(3)
  })

  it('returns 0 when limit is reached', () => {
    const usage = { count: 5, date: getTodayString(), limit: 5 }
    expect(getRemainingUsage(usage)).toBe(0)
  })

  it('returns 0 when count exceeds limit (never negative)', () => {
    const usage = { count: 8, date: getTodayString(), limit: 5 }
    expect(getRemainingUsage(usage)).toBe(0)
  })

  it('returns full limit when count is 0', () => {
    const usage = { count: 0, date: getTodayString(), limit: 5 }
    expect(getRemainingUsage(usage)).toBe(5)
  })
})

describe('getUsageStatus', () => {
  it('returns complete status object', () => {
    const usage = { count: 3, date: getTodayString(), limit: 5 }
    const status = getUsageStatus(usage)

    expect(status).toMatchObject({
      used: 3,
      remaining: 2,
      limit: 5,
      isLimitReached: false,
    })
  })

  it('handles new day — resets before returning status', () => {
    const usage = { count: 5, date: '2020-01-01', limit: 5 }
    const status = getUsageStatus(usage)

    // Новый день — счётчик должен быть сброшен
    expect(status.used).toBe(0)
    expect(status.remaining).toBe(5)
    expect(status.isLimitReached).toBe(false)
  })
})

describe('recordUsage', () => {
  it('increments usage on same day', () => {
    const usage = { count: 2, date: getTodayString(), limit: 5 }
    const result = recordUsage(usage)
    expect(result.count).toBe(3)
  })

  it('resets and then increments on new day', () => {
    const usage = { count: 5, date: '2020-01-01', limit: 5 }
    const result = recordUsage(usage)
    // Новый день: сброс до 0, потом +1 = 1
    expect(result.count).toBe(1)
    expect(result.date).toBe(getTodayString())
  })

  it('is immutable', () => {
    const usage = { count: 1, date: getTodayString(), limit: 5 }
    recordUsage(usage)
    expect(usage.count).toBe(1)
  })
})
