import { useState, useEffect, useMemo } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { STORAGE_KEYS, GROUP_COLOR_HEX } from '@/shared/constants'
import { isGroupableUrl, tabCountLabel } from '@/shared/utils/chromeUtils'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import type { GroupColor, KeeplyGroup, RecentGroup, TabInfo } from '@/shared/types'

// =============================================================================
// TYPES
// =============================================================================

interface TabInfoExtended extends TabInfo {
  readonly keeplyGroupId?: string | undefined
}

// =============================================================================
// COLOR OPTIONS
// =============================================================================

const COLOR_SWATCHES: { color: GroupColor; label: string }[] = [
  { color: 'blue',   label: 'Blue'   },
  { color: 'purple', label: 'Purple' },
  { color: 'green',  label: 'Green'  },
  { color: 'cyan',   label: 'Cyan'   },
  { color: 'yellow', label: 'Yellow' },
  { color: 'red',    label: 'Red'    },
  { color: 'pink',   label: 'Pink'   },
  { color: 'grey',   label: 'Grey'   },
]

function matchesSearch(tab: TabInfo, query: string): boolean {
  if (query === '') return true
  const q = query.toLowerCase()
  return tab.title.toLowerCase().includes(q) || tab.url.toLowerCase().includes(q)
}

// =============================================================================
// MANUAL GROUP SCREEN
// =============================================================================

export function ManualGroupScreen() {
  const setScreen = useTabStore((s) => s.setScreen)
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)

  const [groupName, setGroupName] = useState('')
  const [selectedColor, setSelectedColor] = useState<GroupColor>('blue')
  const [allTabs, setAllTabs] = useState<TabInfoExtended[]>([])
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set())
  const [showAllTabs, setShowAllTabs] = useState(false)
  const [search, setSearch] = useState('')
  const [keeplyGroups, setKeplyGroups] = useState<KeeplyGroup[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['ungrouped']))

  // Load Keeply groups from storage
  useEffect(() => {
    try {
      chrome.storage.local.get(STORAGE_KEYS.KEEPLY_GROUPS, (result) => {
        if (chrome.runtime.lastError) return
        setKeplyGroups((result[STORAGE_KEYS.KEEPLY_GROUPS] as KeeplyGroup[] | undefined) ?? [])
      })
    } catch {
      // Extension not loaded properly
    }
  }, [])

  // Fetch tabs — all or ungrouped only
  useEffect(() => {
    try {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) return
        const groupedTabIds = new Set(keeplyGroups.flatMap((g) => [...g.tabIds]))

        const filtered = tabs
          .filter((t) => t.id && isGroupableUrl(t.url))
          .filter((t) => showAllTabs || !groupedTabIds.has(t.id!))

        setAllTabs(
          filtered.map((t) => {
            const kg = keeplyGroups.find((g) => g.tabIds.includes(t.id!))
            return {
              id: t.id!,
              title: t.title ?? t.url ?? '',
              url: t.url ?? '',
              favIconUrl: t.favIconUrl,
              keeplyGroupId: kg?.id,
            }
          }),
        )
      })
    } catch {
      // Extension not loaded properly
    }
  }, [showAllTabs, keeplyGroups])

  const toggleTab = (tabId: number) => {
    setSelectedTabIds((prev) => {
      const next = new Set(prev)
      if (next.has(tabId)) next.delete(tabId)
      else next.add(tabId)
      return next
    })
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const sections = useMemo(() => {
    if (!showAllTabs) return null

    const grouped: Record<string, { name: string; color?: GroupColor; tabs: TabInfoExtended[] }> = {}

    for (const tab of allTabs) {
      const kg = tab.keeplyGroupId ? keeplyGroups.find((g) => g.id === tab.keeplyGroupId) : undefined
      if (kg) {
        if (!grouped[kg.id]) grouped[kg.id] = { name: kg.name, color: kg.color, tabs: [] }
        grouped[kg.id]!.tabs.push(tab)
      } else {
        if (!grouped['ungrouped']) grouped['ungrouped'] = { name: 'Ungrouped', tabs: [] }
        grouped['ungrouped']!.tabs.push(tab)
      }
    }

    return grouped
  }, [allTabs, keeplyGroups, showAllTabs])

  const visibleTabs = allTabs.filter((tab) => matchesSearch(tab, search))

  const canCreate = groupName.trim().length > 0 && selectedTabIds.size > 0

  const handleCreate = () => {
    if (!canCreate) return

    const tabIds = [...selectedTabIds]

    const newGroup: KeeplyGroup = {
      id: crypto.randomUUID(),
      name: groupName.trim(),
      color: selectedColor,
      tabIds,
    }

    const newEntry: RecentGroup = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      groups: [{ name: newGroup.name, color: newGroup.color, tabIds }],
      totalTabs: tabIds.length,
    }

    chrome.storage.local.get(
      [STORAGE_KEYS.KEEPLY_GROUPS, STORAGE_KEYS.RECENT_GROUPS],
      (result) => {
        const existingGroups = (result[STORAGE_KEYS.KEEPLY_GROUPS] as KeeplyGroup[] | undefined) ?? []
        const existingRecent = (result[STORAGE_KEYS.RECENT_GROUPS] as RecentGroup[] | undefined) ?? []

        chrome.storage.local.set({
          [STORAGE_KEYS.KEEPLY_GROUPS]: [...existingGroups, newGroup],
          [STORAGE_KEYS.RECENT_GROUPS]: [newEntry, ...existingRecent].slice(0, 10),
        }, () => {
          triggerRefresh()
          setScreen('default')
        })
      },
    )
  }

  const renderTabRow = (tab: TabInfoExtended) => (
    <div
      key={tab.id}
      className="tab-row"
      onClick={() => toggleTab(tab.id)}
      role="option"
      aria-selected={selectedTabIds.has(tab.id)}
    >
      <div
        className={`tab-checkbox${selectedTabIds.has(tab.id) ? ' checked' : ''}`}
        aria-hidden="true"
      >
        {selectedTabIds.has(tab.id) && <CheckIcon />}
      </div>
      <TabFavicon url={tab.favIconUrl} />
      <span className="tab-title">{tab.title}</span>
    </div>
  )

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

      {/* Live preview */}
      {groupName.trim() && (
        <div className="group-name-preview">
          <div className="gdot" style={{ background: GROUP_COLOR_HEX[selectedColor] }} />
          <span className="gn">{groupName}</span>
        </div>
      )}

      {/* Color picker */}
      <div className="color-picker-label">Color</div>
      <div className="color-picker-grid">
        {COLOR_SWATCHES.map(({ color, label }) => (
          <button
            key={color}
            className={`color-swatch${selectedColor === color ? ' selected' : ''}`}
            onClick={() => setSelectedColor(color)}
            title={label}
            aria-label={label}
            aria-pressed={selectedColor === color}
          >
            <div className="color-swatch-circle" style={{ background: GROUP_COLOR_HEX[color] }} />
          </button>
        ))}
      </div>

      <div className="divider" role="separator" />

      <div className="manual-label" style={{ marginBottom: 6 }}>
        Select tabs ({selectedTabIds.size}/{allTabs.length})
      </div>

      <label className="show-all-toggle">
        <input
          type="checkbox"
          checked={showAllTabs}
          onChange={(e) => setShowAllTabs(e.target.checked)}
        />
        <span>Show tabs already in groups</span>
      </label>

      <input
        className="tab-search"
        type="text"
        placeholder="Filter tabs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {allTabs.length === 0 ? (
        <div className="empty-state">
          <p>All tabs are already grouped</p>
        </div>
      ) : (
        <div className="tab-list" role="listbox" aria-label="Select tabs">
          {showAllTabs && sections ? (
            Object.entries(sections).map(([key, section]) => {
              const sectionTabs = section.tabs.filter((t) => matchesSearch(t, search))
              if (sectionTabs.length === 0) return null
              const isExpanded = expandedSections.has(key)

              return (
                <div key={key} className="manual-group-section">
                  <div className="manual-section-header" onClick={() => toggleSection(key)}>
                    {section.color && (
                      <div
                        className="manual-section-dot"
                        style={{ background: GROUP_COLOR_HEX[section.color] }}
                      />
                    )}
                    <span className="manual-section-name">{section.name}</span>
                    <span className="manual-section-count">{tabCountLabel(sectionTabs.length)}</span>
                    <svg
                      className={`expand-arrow${isExpanded ? ' expanded' : ''}`}
                      width="10" height="10" viewBox="0 0 10 10" fill="none"
                    >
                      <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {isExpanded && (
                    <div className="manual-section-tabs">
                      {sectionTabs.map(renderTabRow)}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            visibleTabs.map(renderTabRow)
          )}

          {((showAllTabs && sections && Object.values(sections).every(
            (s) => s.tabs.filter((t) => matchesSearch(t, search)).length === 0,
          )) || (!showAllTabs && visibleTabs.length === 0)) && search !== '' && (
            <div className="empty-state" style={{ padding: '10px 0' }}>
              <p>No tabs match &ldquo;{search}&rdquo;</p>
            </div>
          )}
        </div>
      )}

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

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
