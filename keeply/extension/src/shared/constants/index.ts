import type { ChromeTabGroupColor } from '@/shared/types'
export { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/shared/types'

// -----------------------------------------------------------------------------
// Free Tier
// -----------------------------------------------------------------------------

export const FREE_DAILY_LIMIT = 5

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------

export const EDGE_FUNCTION_URL =
  import.meta.env.VITE_EDGE_FUNCTION_URL ??
  'https://your-project.supabase.co/functions/v1/ai-group'

export const AI_REQUEST_TIMEOUT_MS = 15_000

// -----------------------------------------------------------------------------
// Chrome Tab Group Colors
// -----------------------------------------------------------------------------

export const VALID_COLORS: readonly ChromeTabGroupColor[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
] as const

export const DEFAULT_COLOR: ChromeTabGroupColor = 'grey'

// Маппинг от ключевых слов к цветам для умного выбора
export const CATEGORY_COLOR_MAP: Record<string, ChromeTabGroupColor> = {
  work: 'blue',
  research: 'purple',
  shopping: 'yellow',
  social: 'pink',
  news: 'red',
  docs: 'cyan',
  tools: 'grey',
  entertainment: 'pink',
  travel: 'green',
  finance: 'green',
} as const

// -----------------------------------------------------------------------------
// AI Prompt
// -----------------------------------------------------------------------------

export const MAX_TABS_IN_PROMPT = 100
export const MAX_GROUPS = 8
export const MIN_GROUPS = 2

// -----------------------------------------------------------------------------
// Storage
// -----------------------------------------------------------------------------

export const MAX_RECENT_GROUPS = 10

// -----------------------------------------------------------------------------
// Планы подписки
// -----------------------------------------------------------------------------

export const PRICING = {
  MONTHLY_USD: 6,
  ANNUAL_USD: 48,
  ANNUAL_PER_MONTH_USD: 4,
  ANNUAL_DISCOUNT_PCT: 33,
} as const
