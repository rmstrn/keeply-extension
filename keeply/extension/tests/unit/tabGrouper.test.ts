import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TabGrouper, callAIProxy } from '@/background/tabGrouper'
import { StorageService } from '@/shared/services/storageService'
import { STORAGE_KEYS } from '@/shared/constants'
import type { UsageState } from '@/shared/types'
import { DEFAULT_SETTINGS } from '@/shared/constants'

// =============================================================================
// MOCK HELPERS
// =============================================================================

function createMockStorage(data: Record<string, unknown> = {}): StorageService {
  const store: Record<string, unknown> = { ...data }
  const adapter = {
    get: vi.fn(async (key: string) => ({ [key]: store[key] })),
    set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, items) }),
    remove: vi.fn(async (key: string) => { delete store[key] }),
  }
  return new StorageService(adapter)
}

function makeChromeTabs(count: number): chrome.tabs.Tab[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    index: i,
    pinned: false,
    highlighted: false,
    windowId: 1,
    active: i === 0,
    incognito: false,
    selected: i === 0,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    title: `Tab ${i + 1}`,
    url: `https://example.com/page-${i + 1}`,
  }))
}

const validAIResponse = JSON.stringify({
  groups: [
    { name: 'Work', color: 'blue', tabIndices: [0, 1] },
    { name: 'Other', color: 'grey', tabIndices: [2] },
  ],
})

// =============================================================================
// callAIProxy TESTS
// =============================================================================

describe('callAIProxy', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns ok with content on success', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: validAIResponse }),
    } as Response)

    const controller = new AbortController()
    const result = await callAIProxy('system', 'user', null, controller.signal)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toBe(validAIResponse)
  })

  it('includes Authorization header when proToken is provided', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: validAIResponse }),
    } as Response)

    const controller = new AbortController()
    await callAIProxy('system', 'user', 'my-jwt-token', controller.signal)

    const callArgs = mockFetch.mock.calls[0]
    const options = callArgs?.[1] as RequestInit
    const headers = options?.headers as Record<string, string>
    expect(headers?.['Authorization']).toBe('Bearer my-jwt-token')
  })

  it('does not include Authorization header when proToken is null', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: validAIResponse }),
    } as Response)

    const controller = new AbortController()
    await callAIProxy('system', 'user', null, controller.signal)

    const callArgs = mockFetch.mock.calls[0]
    const options = callArgs?.[1] as RequestInit
    const headers = options?.headers as Record<string, string>
    expect(headers?.['Authorization']).toBeUndefined()
  })

  it('returns error on non-ok HTTP response', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const controller = new AbortController()
    const result = await callAIProxy('system', 'user', null, controller.signal)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('500')
  })

  it('returns error on AbortError (timeout)', async () => {
    const mockFetch = vi.mocked(fetch)
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValueOnce(abortError)

    const controller = new AbortController()
    const result = await callAIProxy('system', 'user', null, controller.signal)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('timed out')
  })

  it('returns error on network failure', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const controller = new AbortController()
    const result = await callAIProxy('system', 'user', null, controller.signal)

    expect(result.ok).toBe(false)
  })
})

// =============================================================================
// TabGrouper TESTS
// =============================================================================

describe('TabGrouper', () => {
  let mockChrome: typeof chrome

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: validAIResponse }),
    }))

    // Setup chrome mock — no tabGroups API needed
    mockChrome = {
      tabs: {
        query: vi.fn((_: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
          cb(makeChromeTabs(3))
        }),
      },
      runtime: {
        lastError: null,
      },
    } as unknown as typeof chrome

    vi.stubGlobal('chrome', mockChrome)
  })

  it('returns error when free limit is reached', async () => {
    const d = new Date()
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const exhaustedUsage: UsageState = {
      count: 5,
      date: localDate,
      limit: 5,
    }
    const storage = createMockStorage({
      [STORAGE_KEYS.USAGE]: exhaustedUsage,
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    })

    const grouper = new TabGrouper(storage)
    const result = await grouper.groupTabs()

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toBe('FREE_LIMIT_REACHED')
  })

  it('returns error when no groupable tabs', async () => {
    // Все вкладки — chrome:// (служебные)
    const chromeTabs = [
      { id: 1, url: 'chrome://settings', title: 'Settings', index: 0,
        pinned: false, highlighted: false, windowId: 1, active: true,
        incognito: false, selected: true, discarded: false, autoDiscardable: true, groupId: -1 },
    ]
    ;(mockChrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => cb(chromeTabs as chrome.tabs.Tab[])
    )

    const storage = createMockStorage({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    })

    const grouper = new TabGrouper(storage)
    const result = await grouper.groupTabs()

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('No groupable tabs')
  })

  it('increments usage counter on success', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    })
    const setSpy = vi.spyOn(storage, 'set')

    const grouper = new TabGrouper(storage)
    await grouper.groupTabs()

    // Должен был сохранить обновлённый usage
    const usageCall = setSpy.mock.calls.find(
      ([key]) => key === STORAGE_KEYS.USAGE
    )
    expect(usageCall).toBeDefined()

    const savedUsage = usageCall?.[1] as UsageState
    expect(savedUsage?.count).toBe(1)
  })

  it('calls chrome.tabs.query to get all tabs', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    })

    const grouper = new TabGrouper(storage)
    await grouper.groupTabs()

    expect(mockChrome.tabs.query).toHaveBeenCalledWith({}, expect.any(Function))
  })

  it('returns GroupingResult with correct structure on success', async () => {
    const storage = createMockStorage({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    })

    const grouper = new TabGrouper(storage)
    const result = await grouper.groupTabs()

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toMatchObject({
      groups: expect.arrayContaining([
        expect.objectContaining({ name: 'Work', color: 'blue' }),
      ]),
      totalTabsGrouped: expect.any(Number),
      timestamp: expect.any(Number),
    })
  })

  it('returns error when AI call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }))

    const storage = createMockStorage({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    })

    const grouper = new TabGrouper(storage)
    const result = await grouper.groupTabs()

    expect(result.ok).toBe(false)
  })

  it('uses Pro token from storage when available', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: validAIResponse }),
    } as Response)

    const storage = createMockStorage({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
      [STORAGE_KEYS.PRO_TOKEN]: 'pro-jwt-123',
    })

    const grouper = new TabGrouper(storage)
    await grouper.groupTabs()

    const callArgs = mockFetch.mock.calls[0]
    const options = callArgs?.[1] as RequestInit
    const headers = options?.headers as Record<string, string>
    expect(headers?.['Authorization']).toBe('Bearer pro-jwt-123')
  })
})
