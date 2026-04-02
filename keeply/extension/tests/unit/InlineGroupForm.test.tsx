import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
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

const mockGroupsWithClosedTab = [
  {
    id: 'g1',
    name: 'Work',
    color: 'blue' as const,
    tabs: [
      { url: 'https://linear.app/q4', title: 'Linear — Q4', favIconUrl: undefined, tabId: 1 },
      { url: 'https://closed.example.com', title: 'Closed Page', favIconUrl: undefined, tabId: undefined },
    ],
  },
]

// Mutable mock data ref — tests can switch between empty groups and groups with closed tabs
let mockHookData = {
  tabCount: 3,
  keeplyGroups: [] as typeof mockGroupsWithClosedTab,
  allTabs: mockTabs,
  ungroupedTabs: mockTabs,
}

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
  useDefaultScreenData: () => mockHookData,
}))

// =============================================================================
// HELPERS
// =============================================================================

function clickAddGroup() {
  fireEvent.click(screen.getByText('+ Add Group'))
}

function setupChromeMock() {
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
}

// =============================================================================
// TESTS — INLINE FORM
// =============================================================================

describe('InlineGroupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 3, keeplyGroups: [], allTabs: mockTabs, ungroupedTabs: mockTabs }
    setupChromeMock()
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

  it('shows selected emoji on button without modifying input', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const input = screen.getByPlaceholderText('Group name...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Work' } })
    expect(screen.getByLabelText('Pick emoji').textContent).toBe('😀')
    fireEvent.click(screen.getByLabelText('Pick emoji'))
    expect(document.querySelector('.emoji-dropdown')).toBeInTheDocument()
    const emojiCell = document.querySelectorAll('.emoji-cell')[0]! as HTMLButtonElement
    act(() => { emojiCell.click() })
    expect(screen.getByLabelText('Pick emoji').textContent).toBe('💼')
    expect(input.value).toBe('Work')
  })

  it('closes form on Escape', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    expect(document.querySelector('.inline-group-form')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('.inline-group-form')).toBeNull()
  })
})

// =============================================================================
// TESTS — GROUP TABS WITH CLOSED STATE
// =============================================================================

describe('Group tab rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = {
      tabCount: 1,
      keeplyGroups: mockGroupsWithClosedTab,
      allTabs: mockTabs.slice(0, 1),
      ungroupedTabs: [],
    }
    setupChromeMock()
  })

  it('renders closed tabs with dimmed class', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByText('Work'))
    const closedRow = document.querySelector('.tab-closed')
    expect(closedRow).toBeInTheDocument()
    expect(closedRow?.textContent).toContain('Closed Page')
  })

  it('renders open tabs without dimmed class', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByText('Work'))
    const rows = document.querySelectorAll('.group-tab-row')
    expect(rows).toHaveLength(2)
    // First tab is open
    expect(rows[0]).not.toHaveClass('tab-closed')
    // Second tab is closed
    expect(rows[1]).toHaveClass('tab-closed')
  })
})
