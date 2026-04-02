import { FREE_DAILY_LIMIT } from '@/shared/constants'
import type { UsageState, UsageStatus } from '@/shared/types'

// =============================================================================
// DATE HELPERS — изолированы для тестируемости
// =============================================================================

/**
 * Возвращает текущую дату в формате 'YYYY-MM-DD'
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

// =============================================================================
// USAGE PURE FUNCTIONS — без сайд-эффектов, легко тестировать
// =============================================================================

/**
 * Создаёт начальное состояние счётчика для нового дня
 */
export function createInitialUsage(date?: string): UsageState {
  return {
    count: 0,
    date: date ?? getTodayString(),
    limit: FREE_DAILY_LIMIT,
  }
}

/**
 * Сбрасывает счётчик если наступил новый день
 * Возвращает НОВЫЙ объект (иммутабельность)
 */
export function resetUsageIfNewDay(usage: UsageState): UsageState {
  const today = getTodayString()
  if (usage.date === today) {
    return usage // тот же день — ничего не меняем
  }
  return createInitialUsage(today)
}

/**
 * Увеличивает счётчик использований на 1
 * Возвращает НОВЫЙ объект (иммутабельность)
 */
export function incrementUsage(usage: UsageState): UsageState {
  return {
    ...usage,
    count: usage.count + 1,
  }
}

/**
 * Проверяет достигнут ли лимит
 */
export function isLimitReached(usage: UsageState): boolean {
  return usage.count >= usage.limit
}

/**
 * Возвращает сколько использований осталось
 */
export function getRemainingUsage(usage: UsageState): number {
  return Math.max(0, usage.limit - usage.count)
}

/**
 * Формирует полный статус для UI
 */
export function getUsageStatus(usage: UsageState): UsageStatus {
  const fresh = resetUsageIfNewDay(usage)
  return {
    used: fresh.count,
    remaining: getRemainingUsage(fresh),
    limit: fresh.limit,
    isLimitReached: isLimitReached(fresh),
    resetDate: fresh.date,
  }
}

/**
 * Применяет оба шага: сброс если новый день + инкремент
 * Используется при каждой группировке
 */
export function recordUsage(usage: UsageState): UsageState {
  const fresh = resetUsageIfNewDay(usage)
  return incrementUsage(fresh)
}
