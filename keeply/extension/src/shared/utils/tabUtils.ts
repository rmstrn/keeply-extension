import {
  VALID_COLORS,
  DEFAULT_COLOR,
  CATEGORY_COLOR_MAP,
  MAX_TABS_IN_PROMPT,
} from '@/shared/constants'
import { ok, err } from '@/shared/types'
import type {
  TabInfo,
  TabGroup,
  GroupingResult,
  RawAIResponse,
  RawAIGroup,
  ChromeTabGroupColor,
  Result,
} from '@/shared/types'

// =============================================================================
// TAB FILTERING
// =============================================================================

const SKIP_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'data:',
] as const

/**
 * Фильтрует служебные вкладки Chrome которые нельзя группировать
 */
export function isGroupableTab(tab: chrome.tabs.Tab): boolean {
  if (!tab.url || !tab.id) return false
  return !SKIP_URL_PREFIXES.some((prefix) => tab.url!.startsWith(prefix))
}

/**
 * Конвертирует chrome.tabs.Tab в наш TabInfo
 */
export function toTabInfo(tab: chrome.tabs.Tab): TabInfo | null {
  if (!tab.id || !tab.url || !tab.title) return null
  return {
    id: tab.id,
    title: tab.title,
    url: tab.url,
    favIconUrl: tab.favIconUrl,
  }
}

/**
 * Извлекает groupable вкладки из массива chrome.tabs.Tab
 */
export function extractGroupableTabs(tabs: chrome.tabs.Tab[]): TabInfo[] {
  return tabs
    .filter(isGroupableTab)
    .map(toTabInfo)
    .filter((t): t is TabInfo => t !== null)
    .slice(0, MAX_TABS_IN_PROMPT)
}

// =============================================================================
// COLOR HELPERS
// =============================================================================

/**
 * Проверяет валидность цвета из AI ответа
 */
export function isValidColor(color: string): color is ChromeTabGroupColor {
  return (VALID_COLORS as readonly string[]).includes(color)
}

/**
 * Выбирает цвет по имени группы (эвристика)
 * Fallback → DEFAULT_COLOR
 */
export function pickColorForGroup(groupName: string): ChromeTabGroupColor {
  const lower = groupName.toLowerCase()
  for (const [keyword, color] of Object.entries(CATEGORY_COLOR_MAP)) {
    if (lower.includes(keyword)) return color
  }
  return DEFAULT_COLOR
}

// =============================================================================
// AI RESPONSE PARSER
// =============================================================================

/**
 * Парсит и валидирует ответ от AI
 * Возвращает Result<GroupingResult> вместо throw
 */
export function parseAIResponse(
  json: string,
  sourceTabs: TabInfo[],
): Result<GroupingResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return err(new Error('AI response is not valid JSON'))
  }

  if (!isRawAIResponse(parsed)) {
    return err(new Error('AI response has unexpected structure'))
  }

  if (parsed.groups.length === 0) {
    return err(new Error('AI returned empty groups'))
  }

  const groups = parsed.groups
    .map((rawGroup) => resolveGroup(rawGroup, sourceTabs))
    .filter((g): g is TabGroup => g !== null)

  if (groups.length === 0) {
    return err(new Error('No valid groups after parsing'))
  }

  const totalTabsGrouped = groups.reduce((sum, g) => sum + g.tabIds.length, 0)

  return ok({
    groups,
    totalTabsGrouped,
    timestamp: Date.now(),
  })
}

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

function isRawAIResponse(value: unknown): value is RawAIResponse {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return Array.isArray(obj['groups'])
}

function resolveGroup(raw: RawAIGroup, sourceTabs: TabInfo[]): TabGroup | null {
  if (!raw.name || typeof raw.name !== 'string') return null

  const color: ChromeTabGroupColor = isValidColor(raw.color)
    ? raw.color
    : pickColorForGroup(raw.name)

  const tabIds = raw.tabIndices
    .filter((i) => typeof i === 'number' && i >= 0 && i < sourceTabs.length)
    .map((i) => sourceTabs[i]!.id)

  if (tabIds.length === 0) return null

  return {
    name: raw.name.trim().slice(0, 50), // Chrome лимит на имя группы
    color,
    tabIds,
  }
}
