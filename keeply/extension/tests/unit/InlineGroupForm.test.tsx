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

const mockDuplicateTabs = [
  ...mockTabs,
  { id: 4, title: 'Linear — Q4 tracker (dup)', url: 'https://linear.app/q4', favIconUrl: 'https://linear.app/favicon.ico', windowId: 1 },
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

const mockEmptyGroup = [
  { id: 'g-empty', name: 'Empty', color: 'blue' as const, tabs: [] },
]

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
  fireEvent.click(screen.getByText('+ Add group'))
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

function expandGroup() {
  const header = document.querySelector('.group-header')!
  fireEvent.click(header)
}

function openMenu() {
  fireEvent.click(screen.getByLabelText('Group actions'))
}

// =============================================================================
// TESTS — DEFAULT SCREEN LAYOUT
// =============================================================================

describe('DefaultScreen layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 3, keeplyGroups: [], allTabs: mockTabs, ungroupedTabs: mockTabs }
    setupChromeMock()
  })

  it('renders tab count', () => {
    render(<DefaultScreen />)
    expect(screen.getByText(/3 tabs open/)).toBeInTheDocument()
  })

  it('renders CTA button', () => {
    render(<DefaultScreen />)
    expect(screen.getByLabelText('Group tabs with AI')).toBeInTheDocument()
  })

  it('CTA button calls groupTabs on click', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Group tabs with AI'))
    expect(mockGroupTabs).toHaveBeenCalled()
  })

  it('renders Groups section header', () => {
    render(<DefaultScreen />)
    expect(screen.getByText('Groups')).toBeInTheDocument()
  })

  it('renders "+ Add group" button', () => {
    render(<DefaultScreen />)
    expect(screen.getByText('+ Add group')).toBeInTheDocument()
  })

  it('renders Ungrouped section with tab count', () => {
    render(<DefaultScreen />)
    expect(screen.getByText(/ungrouped/i)).toBeInTheDocument()
  })

  it('shows empty state when no groups exist', () => {
    render(<DefaultScreen />)
    expect(screen.getByText(/No groups yet/)).toBeInTheDocument()
  })

  it('clicking empty state opens inline form', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByText(/No groups yet/))
    expect(document.querySelector('.igf')).toBeInTheDocument()
  })
})

// =============================================================================
// TESTS — SECTION COLLAPSE/EXPAND
// =============================================================================

describe('Section collapse/expand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 3, keeplyGroups: mockGroupsWithClosedTab, allTabs: mockTabs, ungroupedTabs: mockTabs }
    setupChromeMock()
  })

  it('sections start expanded by default', () => {
    render(<DefaultScreen />)
    const bodies = document.querySelectorAll('.section-body.open')
    expect(bodies.length).toBeGreaterThanOrEqual(2)
  })

  it('chevron icons are present in section headers', () => {
    render(<DefaultScreen />)
    const chevrons = document.querySelectorAll('.section-header .chevron-icon')
    expect(chevrons.length).toBeGreaterThanOrEqual(2)
  })
})

// =============================================================================
// TESTS — INLINE GROUP FORM
// =============================================================================

describe('InlineGroupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 3, keeplyGroups: [], allTabs: mockTabs, ungroupedTabs: mockTabs }
    setupChromeMock()
  })

  it('shows inline form when "+ Add group" is clicked', () => {
    render(<DefaultScreen />)
    expect(document.querySelector('.igf')).toBeNull()
    clickAddGroup()
    expect(document.querySelector('.igf')).toBeInTheDocument()
  })

  it('renders emoji trigger button', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    expect(screen.getByLabelText('Pick emoji')).toBeInTheDocument()
  })

  it('renders name input with placeholder', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    expect(screen.getByPlaceholderText('Group name...')).toBeInTheDocument()
  })

  it('renders "Add" confirm button', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    expect(screen.getByText('Add')).toBeInTheDocument()
  })

  it('confirm button is disabled when name is empty', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    expect(screen.getByLabelText('Create group')).toBeDisabled()
  })

  it('confirm button is enabled when name is entered', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    fireEvent.change(screen.getByPlaceholderText('Group name...'), { target: { value: 'My Group' } })
    expect(screen.getByLabelText('Create group')).toBeEnabled()
  })

  it('creates group with empty tabs on confirm', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    fireEvent.change(screen.getByPlaceholderText('Group name...'), { target: { value: 'New Group' } })
    fireEvent.click(screen.getByLabelText('Create group'))
    expect(chrome.storage.local.set).toHaveBeenCalled()
    const setCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    const groups = setCall.keeply_groups as Array<{ name: string; tabs: unknown[] }>
    expect(groups[0]!.name).toBe('New Group')
    expect(groups[0]!.tabs).toHaveLength(0)
  })

  it('creates group on Enter key', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const input = screen.getByPlaceholderText('Group name...')
    fireEvent.change(input, { target: { value: 'Enter Group' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(chrome.storage.local.set).toHaveBeenCalled()
  })

  it('closes form on Escape', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    expect(document.querySelector('.igf')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('.igf')).toBeNull()
  })

  it('opens emoji dropdown on emoji trigger click', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    fireEvent.click(screen.getByLabelText('Pick emoji'))
    expect(document.querySelector('.emoji-dropdown')).toBeInTheDocument()
  })

  it('shows selected emoji on button', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    fireEvent.change(screen.getByPlaceholderText('Group name...'), { target: { value: 'Work' } })
    expect(screen.getByLabelText('Pick emoji').textContent).toBe('😀')
    fireEvent.click(screen.getByLabelText('Pick emoji'))
    const emojiCell = document.querySelectorAll('.emoji-cell')[0]! as HTMLButtonElement
    act(() => { emojiCell.click() })
    expect(screen.getByLabelText('Pick emoji').textContent).toBe('💼')
  })

  it('enforces max name length of 20 characters', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const input = screen.getByPlaceholderText('Group name...') as HTMLInputElement
    expect(input.maxLength).toBe(20)
  })

  it('shows character counter at 15+ characters', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    const input = screen.getByPlaceholderText('Group name...')
    fireEvent.change(input, { target: { value: '123456789012345' } })
    expect(screen.getByText('15/20')).toBeInTheDocument()
  })

  it('hides character counter below 15 characters', () => {
    render(<DefaultScreen />)
    clickAddGroup()
    fireEvent.change(screen.getByPlaceholderText('Group name...'), { target: { value: 'Short' } })
    expect(screen.queryByText(/\/20/)).toBeNull()
  })
})

// =============================================================================
// TESTS — GROUP TAB RENDERING
// =============================================================================

describe('Group tab rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 1, keeplyGroups: mockGroupsWithClosedTab, allTabs: mockTabs.slice(0, 1), ungroupedTabs: [] }
    setupChromeMock()
  })

  it('renders closed tabs with dimmed class', () => {
    render(<DefaultScreen />)
    expandGroup()
    const closedRow = document.querySelector('.tab-closed')
    expect(closedRow).toBeInTheDocument()
    expect(closedRow?.textContent).toContain('Closed Page')
  })

  it('renders open tabs without dimmed class', () => {
    render(<DefaultScreen />)
    expandGroup()
    const rows = document.querySelectorAll('.group-tab-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).not.toHaveClass('tab-closed')
    expect(rows[1]).toHaveClass('tab-closed')
  })

  it('shows group name with tab count', () => {
    render(<DefaultScreen />)
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText(/2 tabs/)).toBeInTheDocument()
  })

  it('all tabs are draggable (including closed)', () => {
    render(<DefaultScreen />)
    expandGroup()
    const rows = document.querySelectorAll('.group-tab-row')
    rows.forEach((row) => {
      expect(row).toHaveAttribute('draggable', 'true')
    })
  })
})

// =============================================================================
// TESTS — EMPTY GROUP
// =============================================================================

describe('Empty group', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 3, keeplyGroups: mockEmptyGroup, allTabs: mockTabs, ungroupedTabs: mockTabs }
    setupChromeMock()
  })

  it('shows "Drop tabs here" placeholder in expanded empty group', () => {
    render(<DefaultScreen />)
    expandGroup()
    expect(screen.getByText('Drop tabs here')).toBeInTheDocument()
  })

  it('shows "0 tabs" count for empty group', () => {
    render(<DefaultScreen />)
    expect(screen.getByText(/0 tabs/)).toBeInTheDocument()
  })

  it('empty group is not auto-deleted', () => {
    render(<DefaultScreen />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })
})

// =============================================================================
// TESTS — GROUP HEADER ACTIONS
// =============================================================================

describe('Group header actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 1, keeplyGroups: mockGroupsWithClosedTab, allTabs: mockTabs.slice(0, 1), ungroupedTabs: [] }
    setupChromeMock()
  })

  it('shows pencil edit button', () => {
    render(<DefaultScreen />)
    expect(screen.getByLabelText('Rename group')).toBeInTheDocument()
  })

  it('clicking pencil enters rename mode', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Rename group'))
    const input = document.querySelector('.group-rename-input') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('Work')
  })

  it('rename input has max length 20', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Rename group'))
    const input = document.querySelector('.group-rename-input') as HTMLInputElement
    expect(input.maxLength).toBe(20)
  })

  it('shows ⋯ menu button', () => {
    render(<DefaultScreen />)
    expect(screen.getByLabelText('Group actions')).toBeInTheDocument()
  })

  it('clicking ⋯ opens dropdown menu', () => {
    render(<DefaultScreen />)
    openMenu()
    expect(document.querySelector('.group-menu-dropdown')).toBeInTheDocument()
  })

  it('menu shows "Open all tabs" when closed tabs exist', () => {
    render(<DefaultScreen />)
    openMenu()
    expect(screen.getByText('Open all tabs')).toBeInTheDocument()
  })

  it('menu shows "Close all tabs" when open tabs exist', () => {
    render(<DefaultScreen />)
    openMenu()
    expect(screen.getByText('Close all tabs')).toBeInTheDocument()
  })

  it('menu shows "Delete group" option', () => {
    render(<DefaultScreen />)
    openMenu()
    expect(screen.getByText('Delete group')).toBeInTheDocument()
  })

  it('"Open all tabs" creates tabs for closed URLs', () => {
    render(<DefaultScreen />)
    openMenu()
    fireEvent.click(screen.getByText('Open all tabs'))
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://closed.example.com' })
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1)
  })

  it('"Close all tabs" removes open tabs via chrome API', () => {
    render(<DefaultScreen />)
    openMenu()
    fireEvent.click(screen.getByText('Close all tabs'))
    expect(chrome.tabs.remove).toHaveBeenCalledWith([1], expect.any(Function))
  })

  it('"Delete group" shows confirmation dialog', () => {
    render(<DefaultScreen />)
    openMenu()
    fireEvent.click(screen.getByText('Delete group'))
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
    expect(document.querySelector('.confirm-delete')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('confirmation dialog shows group name', () => {
    render(<DefaultScreen />)
    openMenu()
    fireEvent.click(screen.getByText('Delete group'))
    expect(document.querySelector('.confirm-delete-text')!.textContent).toContain('Work')
  })

  it('"Cancel" closes dialog without deleting', () => {
    render(<DefaultScreen />)
    openMenu()
    fireEvent.click(screen.getByText('Delete group'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(document.querySelector('.confirm-delete')).toBeNull()
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('"Delete" removes the group', () => {
    render(<DefaultScreen />)
    openMenu()
    fireEvent.click(screen.getByText('Delete group'))
    fireEvent.click(screen.getByText('Delete'))
    expect(chrome.storage.local.set).toHaveBeenCalled()
    expect(document.querySelector('.confirm-delete')).toBeNull()
  })

  it('clicking emoji opens picker without rename mode', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByLabelText('Change emoji'))
    expect(document.querySelector('.emoji-dropdown')).toBeInTheDocument()
    expect(document.querySelector('.group-rename-input')).toBeNull()
  })

  it('clicking group row toggles expand/collapse', () => {
    render(<DefaultScreen />)
    expect(document.querySelector('.group-tabs-list')).toBeNull()
    expandGroup()
    expect(document.querySelector('.group-tabs-list')).toBeInTheDocument()
    expandGroup()
    expect(document.querySelector('.group-tabs-list')).toBeNull()
  })
})

// =============================================================================
// TESTS — ALL OPEN GROUP
// =============================================================================

describe('Group with all tabs open', () => {
  const allOpenGroup = [
    {
      id: 'g2', name: 'Dev', color: 'blue' as const,
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
    openMenu()
    expect(screen.queryByText('Open all tabs')).toBeNull()
  })

  it('menu shows "Close all tabs" when open tabs exist', () => {
    render(<DefaultScreen />)
    openMenu()
    expect(screen.getByText('Close all tabs')).toBeInTheDocument()
  })
})

// =============================================================================
// TESTS — UNGROUPED TABS
// =============================================================================

describe('Ungrouped tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 3, keeplyGroups: [], allTabs: mockTabs, ungroupedTabs: mockTabs }
    setupChromeMock()
  })

  it('renders ungrouped tab rows', () => {
    render(<DefaultScreen />)
    const tabs = document.querySelectorAll('.inbox-tab')
    expect(tabs).toHaveLength(3)
  })

  it('shows tab titles', () => {
    render(<DefaultScreen />)
    expect(screen.getByText('Linear — Q4 tracker')).toBeInTheDocument()
    expect(screen.getByText('Notion — Team wiki')).toBeInTheDocument()
    expect(screen.getByText('GitHub — keeply-ext')).toBeInTheDocument()
  })

  it('tabs are draggable', () => {
    render(<DefaultScreen />)
    const tabs = document.querySelectorAll('.inbox-tab')
    tabs.forEach((tab) => {
      expect(tab).toHaveAttribute('draggable', 'true')
    })
  })

  it('close button removes tab via chrome API', () => {
    render(<DefaultScreen />)
    const closeBtn = document.querySelectorAll('.tab-close-btn')[0]!
    fireEvent.click(closeBtn)
    expect(chrome.tabs.remove).toHaveBeenCalledWith(1, expect.any(Function))
  })
})

// =============================================================================
// TESTS — TAB SELECTION
// =============================================================================

describe('Tab selection in Ungrouped', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 3, keeplyGroups: [], allTabs: mockTabs, ungroupedTabs: mockTabs }
    setupChromeMock()
  })

  it('clicking a tab row toggles selection', () => {
    render(<DefaultScreen />)
    const tab = document.querySelectorAll('.inbox-tab')[0]!
    fireEvent.click(tab)
    expect(tab).toHaveClass('tab-selected')
    fireEvent.click(tab)
    expect(tab).not.toHaveClass('tab-selected')
  })

  it('selected tab shows selection dot', () => {
    render(<DefaultScreen />)
    const tab = document.querySelectorAll('.inbox-tab')[0]!
    fireEvent.click(tab)
    expect(tab.querySelector('.tab-select-dot')).toBeInTheDocument()
  })

  it('shows "N selected" counter in header when tabs selected', () => {
    render(<DefaultScreen />)
    const tabs = document.querySelectorAll('.inbox-tab')
    fireEvent.click(tabs[0]!)
    fireEvent.click(tabs[1]!)
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('hides "Remove duplicates" when tabs are selected', () => {
    mockHookData = { tabCount: 4, keeplyGroups: [], allTabs: mockDuplicateTabs, ungroupedTabs: mockDuplicateTabs }
    render(<DefaultScreen />)
    // Before selection — dedup button visible
    expect(screen.getByText('Remove duplicates')).toBeInTheDocument()
    // Select a tab
    fireEvent.click(document.querySelectorAll('.inbox-tab')[0]!)
    expect(screen.queryByText('Remove duplicates')).toBeNull()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('ESC clears selection', () => {
    render(<DefaultScreen />)
    fireEvent.click(document.querySelectorAll('.inbox-tab')[0]!)
    expect(document.querySelector('.tab-selected')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('.tab-selected')).toBeNull()
  })

  it('multiple tabs can be selected', () => {
    render(<DefaultScreen />)
    const tabs = document.querySelectorAll('.inbox-tab')
    fireEvent.click(tabs[0]!)
    fireEvent.click(tabs[2]!)
    expect(document.querySelectorAll('.tab-selected')).toHaveLength(2)
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })
})

// =============================================================================
// TESTS — DUPLICATE DETECTION
// =============================================================================

describe('Duplicate tab detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookData = { tabCount: 4, keeplyGroups: [], allTabs: mockDuplicateTabs, ungroupedTabs: mockDuplicateTabs }
    setupChromeMock()
  })

  it('shows "Remove duplicates" when duplicates exist', () => {
    render(<DefaultScreen />)
    expect(screen.getByText('Remove duplicates')).toBeInTheDocument()
  })

  it('clicking "Remove duplicates" calls chrome.tabs.remove', () => {
    render(<DefaultScreen />)
    fireEvent.click(screen.getByText('Remove duplicates'))
    expect(chrome.tabs.remove).toHaveBeenCalledWith([4], expect.any(Function))
  })

  it('hides "Remove duplicates" when no duplicates', () => {
    mockHookData = { tabCount: 3, keeplyGroups: [], allTabs: mockTabs, ungroupedTabs: mockTabs }
    render(<DefaultScreen />)
    expect(screen.queryByText('Remove duplicates')).toBeNull()
  })
})
