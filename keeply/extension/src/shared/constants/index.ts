import type { GroupColor } from '@/shared/types'
export { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/shared/types'

// -----------------------------------------------------------------------------
// Free Tier
// -----------------------------------------------------------------------------

export const FREE_DAILY_LIMIT = 5
export const MAX_GROUP_NAME_LENGTH = 30
export const GROUP_NAME_COUNTER_THRESHOLD = 20

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

export const VALID_COLORS: readonly GroupColor[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
] as const

export const DEFAULT_COLOR: GroupColor = 'grey'

// Chrome group color → hex for UI display
export const GROUP_COLOR_HEX: Record<GroupColor, string> = {
  green: '#1D9E75',
  blue: '#2563EB',
  purple: '#6D4AFF',
  yellow: '#D97706',
  red: '#DC2626',
  pink: '#D4537E',
  cyan: '#0891B2',
  grey: '#6B7280',
} as const

// Loading screen preview tags
export const LOADING_TAGS = [
  { bg: '#E4F4EE', color: '#0D7A5F', label: 'Work' },
  { bg: '#EDE9FF', color: '#5B21B6', label: 'Research' },
  { bg: '#FEF3C7', color: '#92400E', label: 'Shopping' },
  { bg: '#FFE4E6', color: '#9F1239', label: 'Social' },
  { bg: '#DBEAFE', color: '#1E40AF', label: 'Docs' },
] as const

// Маппинг от ключевых слов к цветам для умного выбора
export const CATEGORY_COLOR_MAP: Record<string, GroupColor> = {
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

// -----------------------------------------------------------------------------
// Emoji Picker
// -----------------------------------------------------------------------------

export const EMOJI_CATEGORIES = [
  { label: 'Work',  emojis: ['💼', '📊', '📝', '💡', '🖥️', '📱', '🔧', '⚙️'] },
  { label: 'Media', emojis: ['🎬', '🎵', '🎮', '📚', '🎨', '🎭', '📷', '🎙️'] },
  { label: 'Life',  emojis: ['🛒', '🏠', '🚗', '✈️', '🍕', '☕', '💪', '🧘'] },
  { label: 'Other', emojis: ['⭐', '🔥', '💎', '🚀', '❤️', '🌿', '🎯', '💰'] },
] as const
