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
    const arrow = document.querySelector('.group-header .chevron-icon')!
    fireEvent.click(arrow)
    const closedRow = document.querySelector('.tab-closed')
    expect(closedRow).toBeInTheDocument()
    expect(closedRow?.textContent).toContain('Closed Page')
  })

  it('renders open tabs without dimmed class', () => {
    render(<DefaultScreen />)
    const arrow = document.querySelector('.group-header .chevron-icon')!
    fireEvent.click(arrow)
    const rows = document.querySelectorAll('.group-tab-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).not.toHaveClass('tab-closed')
    expect(rows[1]).toHaveClass('tab-closed')
  })
})

// =============================================================================
// TESTS — GROUP HEADER UI
// =============================================================================

describe('Group header actions', () => {
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

  it('shows pencil edit button on group header', () => {
    render(<DefaultScreen />)
    expect(screen.getByLabelText('Rename group')).toBeInTheDocument()
  })

  it('clicking pencil enters rename mode with input', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Rename group'))
    const input = document.querySelector('.group-rename-input') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('Work')
  })

  it('shows ⋯ menu button on group header', () => {
    render(<DefaultScreen />)
    expect(screen.getByLabelText('Group actions')).toBeInTheDocument()
  })

  it('clicking ⋯ opens dropdown menu', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    expect(document.querySelector('.group-menu-dropdown')).toBeInTheDocument()
  })

  it('menu shows "Open all tabs" when closed tabs exist', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    expect(screen.getByText('Open all tabs')).toBeInTheDocument()
  })

  it('menu shows "Close all tabs" when open tabs exist', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    expect(screen.getByText('Close all tabs')).toBeInTheDocument()
  })

  it('menu shows "Delete group" option', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    expect(screen.getByText('Delete group')).toBeInTheDocument()
  })

  it('"Open all tabs" creates tabs for closed URLs', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    fireEvent.click(screen.getByText('Open all tabs'))
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://closed.example.com' })
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1)
  })

  it('"Close all tabs" removes open tabs via chrome API', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    fireEvent.click(screen.getByText('Close all tabs'))
    expect(chrome.tabs.remove).toHaveBeenCalledWith([1], expect.any(Function))
  })

  it('"Delete group" shows confirmation dialog instead of deleting immediately', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    fireEvent.click(screen.getByText('Delete group'))
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
    expect(document.querySelector('.confirm-delete')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('confirmation dialog shows group name', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    fireEvent.click(screen.getByText('Delete group'))
    const text = document.querySelector('.confirm-delete-text')!
    expect(text.textContent).toContain('Work')
  })

  it('clicking "Cancel" in confirmation closes dialog without deleting', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    fireEvent.click(screen.getByText('Delete group'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(document.querySelector('.confirm-delete')).toBeNull()
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('clicking "Delete" in confirmation removes the group', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    fireEvent.click(screen.getByText('Delete group'))
    fireEvent.click(screen.getByText('Delete'))
    expect(chrome.storage.local.set).toHaveBeenCalled()
    expect(document.querySelector('.confirm-delete')).toBeNull()
  })

  it('clicking emoji opens picker without entering rename mode', () => {
    render(<DefaultScreen />)
    const emoji = screen.getByLabelText('Change emoji')
    fireEvent.click(emoji)
    expect(document.querySelector('.emoji-dropdown')).toBeInTheDocument()
    expect(document.querySelector('.group-rename-input')).toBeNull()
  })

  it('clicking group row toggles expand/collapse', () => {
    render(<DefaultScreen />)
    expect(document.querySelector('.group-tabs-list')).toBeNull()
    const header = document.querySelector('.group-header')!
    fireEvent.click(header)
    expect(document.querySelector('.group-tabs-list')).toBeInTheDocument()
    fireEvent.click(header)
    expect(document.querySelector('.group-tabs-list')).toBeNull()
  })
})

describe('Group with all tabs open', () => {
  const allOpenGroup = [
    {
      id: 'g2',
      name: 'Dev',
      color: 'blue' as const,
      tabs: [
        { url: 'https://github.com/keeply', title: 'GitHub', favIconUrl: undefined, tabId: 3 },
        { url: 'https://linear.app/q4', title: 'Linear', favIconUrl: undefined, tabId: 1 },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 2, keeplyGroups: allOpenGroup, allTabs: mockTabs, ungroupedTabs: [] }
    setupChromeMock()
  })

  it('menu does not show "Open all tabs" when no closed tabs', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    expect(screen.queryByText('Open all tabs')).toBeNull()
  })

  it('menu shows "Close all tabs" when open tabs exist', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group actions'))
    expect(screen.getByText('Close all tabs')).toBeInTheDocument()
  })
})
