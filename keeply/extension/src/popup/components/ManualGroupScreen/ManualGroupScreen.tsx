import { useState, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { extractGroupableTabs } from '@/shared/utils/tabUtils'
import { STORAGE_KEYS } from '@/shared/constants'
import { TabRow } from '@/popup/components/TabRow/TabRow'
import type { ChromeTabGroupColor, RecentGroup, TabInfo } from '@/shared/types'

// =============================================================================
// COLOR OPTIONS
// =============================================================================

const COLORS: { color: ChromeTabGroupColor; hex: string }[] = [
  { color: 'grey',   hex: '#6B7280' },
  { color: 'blue',   hex: '#2563EB' },
  { color: 'red',    hex: '#DC2626' },
  { color: 'yellow', hex: '#D97706' },
  { color: 'green',  hex: '#1D9E75' },
  { color: 'pink',   hex: '#D4537E' },
  { color: 'purple', hex: '#6D4AFF' },
  { color: 'cyan',   hex: '#0891B2' },
]

// =============================================================================
// MANUAL GROUP SCREEN
// =============================================================================

export function ManualGroupScreen() {
  const setScreen = useTabStore((s) => s.setScreen)
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)

  const [groupName, setGroupName] = useState('')
  const [selectedColor, setSelectedColor] = useState<ChromeTabGroupColor>('blue')
  const [allTabs, setAllTabs] = useState<TabInfo[]>([])
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set())

  // Fetch all groupable tabs on mount
  useEffect(() => {
    try {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) return
        setAllTabs(extractGroupableTabs(tabs))
      })
    } catch {
      // Extension not loaded properly
    }
  }, [])

  const toggleTab = (tabId: number) => {
    setSelectedTabIds((prev) => {
      const next = new Set(prev)
      if (next.has(tabId)) {
        next.delete(tabId)
      } else {
        next.add(tabId)
      }
      return next
    })
  }

  const canCreate = groupName.trim().length > 0 && selectedTabIds.size > 0

  const handleCreate = () => {
    if (!canCreate) return

    const tabIds = [...selectedTabIds]

    chrome.tabs.group({ tabIds }, (groupId) => {
      if (chrome.runtime.lastError) return
      chrome.tabGroups.update(
        groupId,
        { title: groupName.trim(), color: selectedColor, collapsed: false },
        () => {
          const newEntry: RecentGroup = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            groups: [{ name: groupName.trim(), color: selectedColor, tabIds }],
            totalTabs: tabIds.length,
          }
          chrome.storage.local.get(STORAGE_KEYS.RECENT_GROUPS, (result) => {
            const existing = (result[STORAGE_KEYS.RECENT_GROUPS] as RecentGroup[] | undefined) ?? []
            const updated = [newEntry, ...existing].slice(0, 10)
            chrome.storage.local.set({ [STORAGE_KEYS.RECENT_GROUPS]: updated }, () => {
              triggerRefresh()
              setScreen('default')
            })
          })
        },
      )
    })
  }

  return (
    <div className="body">
      <div className="manual-title">Create Group</div>

      <div className="manual-field">
        <label className="manual-label" htmlFor="group-name">Name</label>
        <input
          id="group-name"
          className="manual-input"
          type="text"
          placeholder="e.g. Work Projects"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          maxLength={50}
          autoFocus
        />
      </div>

      <div className="manual-field">
        <span className="manual-label">Color</span>
        <div className="color-picker" role="radiogroup" aria-label="Group color">
          {COLORS.map(({ color, hex }) => (
            <button
              key={color}
              className={`color-dot${selectedColor === color ? ' selected' : ''}`}
              style={{ background: hex }}
              onClick={() => setSelectedColor(color)}
              aria-label={color}
              aria-checked={selectedColor === color}
              role="radio"
            />
          ))}
        </div>
      </div>

      <div className="divider" role="separator" />

      <div className="manual-label" style={{ marginBottom: 6 }}>
        Select tabs ({selectedTabIds.size}/{allTabs.length})
      </div>

      <div className="tab-list" role="listbox" aria-label="Select tabs">
        {allTabs.map((tab) => (
          <TabRow
            key={tab.id}
            tab={tab}
            showCheckbox
            selected={selectedTabIds.has(tab.id)}
            onToggle={() => toggleTab(tab.id)}
          />
        ))}
        {allTabs.length === 0 && (
          <div className="tab-row empty">
            <span className="rm">No tabs available</span>
          </div>
        )}
      </div>

      <button
        className="cta-btn manual-create-btn"
        style={{ background: '#0D7A5F', color: '#FFFFFF', border: 'none', marginTop: 12 }}
        onMouseOver={(e) => { e.currentTarget.style.background = '#0A5C47' }}
        onMouseOut={(e) => { e.currentTarget.style.background = '#0D7A5F' }}
        onClick={handleCreate}
        disabled={!canCreate}
        aria-label="Create group"
      >
        Create Group
      </button>
    </div>
  )
}
