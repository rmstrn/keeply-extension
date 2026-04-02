import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DefaultScreen } from '@/popup/components/DefaultScreen/DefaultScreen'

// =============================================================================
// MOCK STORES & HOOKS
// =============================================================================

const mockTriggerRefresh = vi.fn()
const mockGroupTabs = vi.fn()

const mockTabs = [
  { id: 1, title: 'Linear — Q4 tracker', url: 'https://linear.app/q4', favIconUrl: 'https://linear.app/favicon.ico', windowId: 1 },
  { id: 2, title: 'Notion — Team wiki', url: 'https://notion.so/wiki', favIconUrl: 'https://notion.so/favicon.ico', windowId: 1 },
  { id: 3, title: 'GitHub — keeply-ext', url: 'https://github.com/keeply', favIconUrl: 'https://github.com/favicon.ico', windowId: 1 },
]

vi.mock('@/popup/stores/tabStore', () => ({
  useTabStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ triggerRefresh: mockTriggerRefresh, screen: 'default', lastRefresh: 0 }),
}))

vi.mock('@/popup/stores/usageStore', () => ({
  useUsageStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      status: { used: 0, remaining: 5, limit: 5, isLimitReached: false, resetDate: '2024-01-01' },
      isLoading: false,
    }),
}))

vi.mock('@/popup/hooks/useTabGroups', () => ({
  useTabGroups: () => ({ groupTabs: mockGroupTabs }),
}))

vi.mock('@/popup/hooks/useDefaultScreenData', () => ({
  useDefaultScreenData: () => ({
    tabCount: 3,
    keeplyGroups: [],
    allTabs: mockTabs,
    ungroupedTabs: mockTabs,
  }),
}))

// =============================================================================
// HELPERS
// =============================================================================

function clickAddGroup() {
  fireEvent.click(screen.getByText('+ Add Group'))
}

// =============================================================================
// TESTS
// =============================================================================

describe('InlineGroupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal('chrome', {
      tabs: { query: vi.fn(), remove: vi.fn(), update: vi.fn(), create: vi.fn() },
      storage: {
        local: {
          get: vi.fn((_: unknown, cb: (result: Record<string, unknown>) => void) => cb({})),
          set: vi.fn((_: unknown, cb: () => void) => cb()),
        },
      },
      runtime: { lastError: null, getURL: vi.fn((p: string) => p) },
      windows: { update: vi.fn() },
    })
  })

  it('shows inline form when "+ Add Group" is clicked', () => {
    render(<DefaultScreen />)
    expect(document.querySelector('.inline-group-form')).toBeNull()
    clickAddGroup()
    expect(document.querySelector('.inline-group-form')).toBeInTheDocument()
  })

  it('renders emoji trigger button', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    expect(screen.getByLabelText('Pick emoji')).toBeInTheDocument()
  })

  it('confirm button is disabled when name is empty', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const confirmBtn = screen.getByLabelText('Create group')
    expect(confirmBtn).toBeDisabled()
  })

  it('confirm button is disabled when no tabs selected', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const input = screen.getByPlaceholderText('Group name...')
    fireEvent.change(input, { target: { value: 'My Group' } })
    const confirmBtn = screen.getByLabelText('Create group')
    expect(confirmBtn).toBeDisabled()
  })

  it('confirm button is enabled when name + tab selected', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const input = screen.getByPlaceholderText('Group name...')
    fireEvent.change(input, { target: { value: 'My Group' } })
    const tabOptions = screen.getAllByRole('option')
    fireEvent.click(tabOptions[0]!)
    const confirmBtn = screen.getByLabelText('Create group')
    expect(confirmBtn).toBeEnabled()
  })

  it('shows ungrouped tabs as selectable options', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const tabOptions = screen.getAllByRole('option')
    expect(tabOptions).toHaveLength(3)
  })

  it('opens emoji dropdown on emoji trigger click', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    fireEvent.click(screen.getByLabelText('Pick emoji'))
    expect(document.querySelector('.emoji-dropdown')).toBeInTheDocument()
  })

  it('inserts emoji into group name', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const input = screen.getByPlaceholderText('Group name...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Work' } })
    fireEvent.click(screen.getByLabelText('Pick emoji'))
    // Click first emoji in the grid
    const emojiCells = document.querySelectorAll('.emoji-cell')
    fireEvent.click(emojiCells[0]!)
    expect(input.value).toMatch(/^\S+ Work$/)
  })

  it('closes form on Escape', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    expect(document.querySelector('.inline-group-form')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('.inline-group-form')).toBeNull()
  })

})
