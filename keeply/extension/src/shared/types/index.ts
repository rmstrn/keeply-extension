// =============================================================================
// KEEPLY — Domain Types
// Single source of truth for all TypeScript types across the extension
// =============================================================================

// -----------------------------------------------------------------------------
// Result Type — явная обработка ошибок без исключений
// -----------------------------------------------------------------------------

export type Ok<T> = { readonly ok: true; readonly value: T }
export type Err<E> = { readonly ok: false; readonly error: E }
export type Result<T, E = Error> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = <E>(error: E): Err<E> => ({ ok: false, error })

// -----------------------------------------------------------------------------
// Tab Types
// -----------------------------------------------------------------------------

export interface TabInfo {
  readonly id: number
  readonly title: string
  readonly url: string
  readonly favIconUrl?: string | undefined
}

// Keeply color palette — visual only, not tied to Chrome API
export type GroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'

export interface TabGroup {
  readonly name: string
  readonly color: GroupColor
  readonly tabIds: readonly number[]
}

// Single tab entry stored in a Keeply group — URL snapshot + optional live tabId
export interface GroupTab {
  readonly url: string
  readonly title: string
  readonly favIconUrl?: string | undefined
  readonly tabId?: number | undefined
}

// Keeply group stored in chrome.storage.local
export interface KeeplyGroup {
  readonly id: string
  readonly name: string
  readonly color: GroupColor
  readonly emoji?: string | undefined
  readonly tabs: readonly GroupTab[]
}

export interface GroupingResult {
  readonly groups: readonly TabGroup[]
  readonly totalTabsGrouped: number
  readonly timestamp: number
}

// AI ответ до парсинга
export interface RawAIGroup {
  readonly name: string
  readonly color: string
  readonly tabIndices: readonly number[]
}

export interface RawAIResponse {
  readonly groups: readonly RawAIGroup[]
}

// -----------------------------------------------------------------------------
// Usage / Free Tier Types
// -----------------------------------------------------------------------------

export interface UsageState {
  readonly count: number
  readonly date: string // 'YYYY-MM-DD'
  readonly limit: number
}

export interface UsageStatus {
  readonly used: number
  readonly remaining: number
  readonly limit: number
  readonly isLimitReached: boolean
  readonly resetDate: string
}

// -----------------------------------------------------------------------------
// Settings Types
// -----------------------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'soft-jade' | 'plum-wine' | 'system'
export type GroupLanguage = 'en' | 'ru' | 'auto'
export type MaxGroups = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'auto'

export interface Settings {
  readonly language: GroupLanguage
  readonly maxGroups: MaxGroups
  readonly theme: Theme
  readonly showBadge: boolean
  readonly autoGroupOnStartup: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  maxGroups: 'auto',
  theme: 'system',
  showBadge: true,
  autoGroupOnStartup: false,
} as const

// -----------------------------------------------------------------------------
// Message Protocol — typed discriminated union для popup ↔ background
// -----------------------------------------------------------------------------

export type BackgroundMessage =
  | { readonly type: 'GROUP_TABS' }
  | { readonly type: 'UNDO_GROUPING' }
  | { readonly type: 'GET_USAGE' }
  | { readonly type: 'GET_SETTINGS' }
  | { readonly type: 'SAVE_SETTINGS'; readonly payload: Partial<Settings> }
  | { readonly type: 'GET_KEEPLY_GROUPS' }
  | { readonly type: 'SAVE_KEEPLY_GROUPS'; readonly payload: readonly KeeplyGroup[] }

export type PopupMessage =
  | { readonly type: 'GROUPING_STARTED' }
  | { readonly type: 'GROUPING_COMPLETE'; readonly payload: GroupingResult }
  | { readonly type: 'GROUPING_ERROR'; readonly payload: { readonly message: string } }
  | { readonly type: 'USAGE_RESPONSE'; readonly payload: UsageStatus }
  | { readonly type: 'SETTINGS_RESPONSE'; readonly payload: Settings }
  | { readonly type: 'KEEPLY_GROUPS_RESPONSE'; readonly payload: readonly KeeplyGroup[] }

// -----------------------------------------------------------------------------
// Storage Keys — type-safe ключи для chrome.storage
// -----------------------------------------------------------------------------

export const STORAGE_KEYS = {
  USAGE: 'keeply_usage',
  SETTINGS: 'keeply_settings',
  RECENT_GROUPS: 'keeply_recent_groups',
  KEEPLY_GROUPS: 'keeply_groups',
  PRO_TOKEN: 'keeply_pro_token',
  TOTAL_TABS_GROUPED: 'keeply_total_tabs_grouped',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

// -----------------------------------------------------------------------------
// Screen State — состояния popup UI
// -----------------------------------------------------------------------------

export type PopupScreen =
  | 'default'
  | 'loading'
  | 'results'
  | 'paywall'
  | 'settings'

// -----------------------------------------------------------------------------
// Recent Group (хранится локально для истории)
// -----------------------------------------------------------------------------

export interface RecentGroup {
  readonly id: string
  readonly timestamp: number
  readonly groups: readonly TabGroup[]
  readonly totalTabs: number
}
