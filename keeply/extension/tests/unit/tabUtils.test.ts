import { describe, it, expect } from 'vitest'
import {
  isGroupableTab,
  toTabInfo,
  extractGroupableTabs,
  isValidColor,
  pickColorForGroup,
  parseAIResponse,
} from '@/shared/utils/tabUtils'
import type { TabInfo } from '@/shared/types'

// =============================================================================
// HELPERS
// =============================================================================

function makeTab(overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    pinned: false,
    highlighted: false,
    windowId: 1,
    active: true,
    incognito: false,
    selected: true,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    title: 'Test Page',
    url: 'https://example.com',
    ...overrides,
  }
}

function makeTabInfo(overrides: Partial<TabInfo> = {}): TabInfo {
  return {
    id: 1,
    title: 'Test Page',
    url: 'https://example.com',
    ...overrides,
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('isGroupableTab', () => {
  it('returns true for regular https URLs', () => {
    expect(isGroupableTab(makeTab({ url: 'https://github.com' }))).toBe(true)
  })

  it('returns true for http URLs', () => {
    expect(isGroupableTab(makeTab({ url: 'http://localhost:3000' }))).toBe(true)
  })

  it('returns false for chrome:// URLs', () => {
    expect(isGroupableTab(makeTab({ url: 'chrome://settings' }))).toBe(false)
  })

  it('returns false for chrome-extension:// URLs', () => {
    expect(isGroupableTab(makeTab({ url: 'chrome-extension://abc/popup.html' }))).toBe(false)
  })

  it('returns false for about: URLs', () => {
    expect(isGroupableTab(makeTab({ url: 'about:blank' }))).toBe(false)
  })

  it('returns false when url is undefined', () => {
    expect(isGroupableTab(makeTab({ url: undefined }))).toBe(false)
  })

  it('returns false when id is undefined', () => {
    expect(isGroupableTab(makeTab({ id: undefined }))).toBe(false)
  })
})

describe('toTabInfo', () => {
  it('converts valid chrome.tabs.Tab to TabInfo', () => {
    const tab = makeTab({ id: 42, title: 'GitHub', url: 'https://github.com' })
    const result = toTabInfo(tab)
    expect(result).toEqual({
      id: 42,
      title: 'GitHub',
      url: 'https://github.com',
      favIconUrl: undefined,
    })
  })

  it('includes favIconUrl when present', () => {
    const tab = makeTab({ favIconUrl: 'https://github.com/favicon.ico' })
    const result = toTabInfo(tab)
    expect(result?.favIconUrl).toBe('https://github.com/favicon.ico')
  })

  it('returns null when id is missing', () => {
    const tab = makeTab({ id: undefined })
    expect(toTabInfo(tab)).toBeNull()
  })

  it('returns null when url is missing', () => {
    const tab = makeTab({ url: undefined })
    expect(toTabInfo(tab)).toBeNull()
  })

  it('returns null when title is missing', () => {
    const tab = makeTab({ title: undefined })
    expect(toTabInfo(tab)).toBeNull()
  })
})

describe('extractGroupableTabs', () => {
  it('filters out chrome:// tabs', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://github.com', title: 'GitHub' }),
      makeTab({ id: 2, url: 'chrome://settings', title: 'Settings' }),
    ]
    const result = extractGroupableTabs(tabs)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(1)
  })

  it('returns empty array for all chrome tabs', () => {
    const tabs = [
      makeTab({ url: 'chrome://newtab' }),
      makeTab({ url: 'chrome://settings' }),
    ]
    expect(extractGroupableTabs(tabs)).toHaveLength(0)
  })

  it('limits to MAX_TABS_IN_PROMPT tabs', () => {
    const tabs = Array.from({ length: 150 }, (_, i) =>
      makeTab({ id: i + 1, url: `https://example.com/${i}`, title: `Tab ${i}` }),
    )
    const result = extractGroupableTabs(tabs)
    expect(result.length).toBeLessThanOrEqual(100)
  })
})

describe('isValidColor', () => {
  it('returns true for all valid Chrome colors', () => {
    const validColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']
    validColors.forEach((color) => {
      expect(isValidColor(color)).toBe(true)
    })
  })

  it('returns false for invalid colors', () => {
    expect(isValidColor('black')).toBe(false)
    expect(isValidColor('white')).toBe(false)
    expect(isValidColor('orange')).toBe(false)
    expect(isValidColor('')).toBe(false)
  })

  it('returns false for colors with wrong case', () => {
    expect(isValidColor('Blue')).toBe(false)
    expect(isValidColor('BLUE')).toBe(false)
  })
})

describe('pickColorForGroup', () => {
  it('picks blue for work-related groups', () => {
    expect(pickColorForGroup('Work')).toBe('blue')
    expect(pickColorForGroup('My Work Tasks')).toBe('blue')
  })

  it('picks purple for research-related groups', () => {
    expect(pickColorForGroup('Research')).toBe('purple')
    expect(pickColorForGroup('Deep Research')).toBe('purple')
  })

  it('picks yellow for shopping-related groups', () => {
    expect(pickColorForGroup('Shopping')).toBe('yellow')
  })

  it('returns grey as default for unknown groups', () => {
    expect(pickColorForGroup('Random Stuff')).toBe('grey')
    expect(pickColorForGroup('Misc')).toBe('grey')
  })

  it('is case-insensitive', () => {
    expect(pickColorForGroup('WORK')).toBe('blue')
    expect(pickColorForGroup('work')).toBe('blue')
    expect(pickColorForGroup('Work Projects')).toBe('blue')
  })
})

describe('parseAIResponse', () => {
  const sourceTabs: TabInfo[] = [
    makeTabInfo({ id: 1, url: 'https://linear.app', title: 'Linear' }),
    makeTabInfo({ id: 2, url: 'https://notion.so', title: 'Notion' }),
    makeTabInfo({ id: 3, url: 'https://amazon.com', title: 'Amazon' }),
    makeTabInfo({ id: 4, url: 'https://twitter.com', title: 'Twitter' }),
  ]

  it('parses valid AI response', () => {
    const json = JSON.stringify({
      groups: [
        { name: 'Work', color: 'blue', tabIndices: [0, 1] },
        { name: 'Shopping', color: 'yellow', tabIndices: [2] },
        { name: 'Social', color: 'pink', tabIndices: [3] },
      ],
    })

    const result = parseAIResponse(json, sourceTabs)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.groups).toHaveLength(3)
    expect(result.value.groups[0]?.name).toBe('Work')
    expect(result.value.groups[0]?.color).toBe('blue')
    expect(result.value.groups[0]?.tabIds).toEqual([1, 2])
    expect(result.value.totalTabsGrouped).toBe(4)
  })

  it('returns error for invalid JSON', () => {
    const result = parseAIResponse('not json', sourceTabs)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('valid JSON')
  })

  it('returns error for empty groups array', () => {
    const json = JSON.stringify({ groups: [] })
    const result = parseAIResponse(json, sourceTabs)
    expect(result.ok).toBe(false)
  })

  it('falls back to default color for invalid color', () => {
    const json = JSON.stringify({
      groups: [{ name: 'Test', color: 'magenta', tabIndices: [0] }],
    })
    const result = parseAIResponse(json, sourceTabs)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // 'magenta' невалидный → должен упасть на эвристику или DEFAULT_COLOR
    expect(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']).toContain(
      result.value.groups[0]?.color,
    )
  })

  it('filters out groups with out-of-bounds indices', () => {
    const json = JSON.stringify({
      groups: [
        { name: 'Valid', color: 'blue', tabIndices: [0, 1] },
        { name: 'Invalid', color: 'red', tabIndices: [99, 100] }, // вне диапазона
      ],
    })
    const result = parseAIResponse(json, sourceTabs)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Группа 'Invalid' должна быть отфильтрована
    expect(result.value.groups).toHaveLength(1)
    expect(result.value.groups[0]?.name).toBe('Valid')
  })

  it('truncates group name to 50 chars', () => {
    const longName = 'A'.repeat(100)
    const json = JSON.stringify({
      groups: [{ name: longName, color: 'blue', tabIndices: [0] }],
    })
    const result = parseAIResponse(json, sourceTabs)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.groups[0]?.name.length).toBeLessThanOrEqual(50)
  })

  it('returns error for malformed structure', () => {
    const result = parseAIResponse(JSON.stringify({ data: [] }), sourceTabs)
    expect(result.ok).toBe(false)
  })

  it('includes timestamp in result', () => {
    const before = Date.now()
    const json = JSON.stringify({
      groups: [{ name: 'Work', color: 'blue', tabIndices: [0] }],
    })
    const result = parseAIResponse(json, sourceTabs)
    const after = Date.now()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.timestamp).toBeGreaterThanOrEqual(before)
    expect(result.value.timestamp).toBeLessThanOrEqual(after)
  })
})
