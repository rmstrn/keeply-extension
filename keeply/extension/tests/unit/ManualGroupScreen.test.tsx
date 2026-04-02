import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ManualGroupScreen } from '@/popup/components/ManualGroupScreen/ManualGroupScreen'

// =============================================================================
// MOCK STORE
// =============================================================================

const mockSetScreen = vi.fn()
const mockTriggerRefresh = vi.fn()

vi.mock('@/popup/stores/tabStore', () => ({
  useTabStore: (selector: (s: { setScreen: typeof mockSetScreen; triggerRefresh: typeof mockTriggerRefresh }) => unknown) =>
    selector({ setScreen: mockSetScreen, triggerRefresh: mockTriggerRefresh }),
}))

// =============================================================================
// TESTS
// =============================================================================

describe('ManualGroupScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockTabs = [
      { id: 1, title: 'Linear — Q4 tracker', url: 'https://linear.app/q4', favIconUrl: 'https://linear.app/favicon.ico', index: 0, pinned: false, highlighted: false, windowId: 1, active: true, incognito: false, selected: true, discarded: false, autoDiscardable: true, groupId: -1 },
      { id: 2, title: 'Notion — Team wiki', url: 'https://notion.so/wiki', favIconUrl: 'https://notion.so/favicon.ico', index: 1, pinned: false, highlighted: false, windowId: 1, active: false, incognito: false, selected: false, discarded: false, autoDiscardable: true, groupId: -1 },
      { id: 3, title: 'GitHub — keeply-ext', url: 'https://github.com/keeply', favIconUrl: 'https://github.com/favicon.ico', index: 2, pinned: false, highlighted: false, windowId: 1, active: false, incognito: false, selected: false, discarded: false, autoDiscardable: true, groupId: -1 },
    ]

    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn((_: unknown, cb: (tabs: typeof mockTabs) => void) => cb(mockTabs)),
        group: vi.fn(),
      },
      tabGroups: {
        update: vi.fn(),
        TAB_GROUP_ID_NONE: -1,
      },
      storage: {
        local: {
          get: vi.fn((_: unknown, cb: (result: Record<string, unknown>) => void) => cb({})),
          set: vi.fn((_: unknown, cb: () => void) => cb()),
        },
      },
      runtime: { lastError: null },
    })
  })

  it('renders color picker with all 8 colors', () => {
    render(<ManualGroupScreen />)
    const colorDots = screen.getAllByRole('radio')
    expect(colorDots).toHaveLength(8)
  })

  it('Create button is disabled when name is empty', () => {
    render(<ManualGroupScreen />)
    const createBtn = screen.getByRole('button', { name: /create group/i })
    expect(createBtn).toBeDisabled()
  })

  it('Create button is disabled when no tabs selected', () => {
    render(<ManualGroupScreen />)
    const nameInput = screen.getByPlaceholderText(/work projects/i)
    fireEvent.change(nameInput, { target: { value: 'My Group' } })
    const createBtn = screen.getByRole('button', { name: /create group/i })
    expect(createBtn).toBeDisabled()
  })

  it('Create button is enabled when name and tabs are selected', () => {
    render(<ManualGroupScreen />)
    const nameInput = screen.getByPlaceholderText(/work projects/i)
    fireEvent.change(nameInput, { target: { value: 'My Group' } })
    // Click on tab row options to select
    const tabOptions = screen.getAllByRole('option')
    fireEvent.click(tabOptions[0]!)
    const createBtn = screen.getByRole('button', { name: /create group/i })
    expect(createBtn).toBeEnabled()
  })

  it('selecting all tabs works', () => {
    render(<ManualGroupScreen />)
    const tabOptions = screen.getAllByRole('option')
    for (const opt of tabOptions) {
      fireEvent.click(opt)
    }
    expect(screen.getByText(/3\/3/)).toBeTruthy()
  })
})
