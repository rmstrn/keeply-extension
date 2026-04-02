import { useState, useEffect, useMemo } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { STORAGE_KEYS } from '@/shared/constants'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import type { ChromeTabGroupColor, RecentGroup, TabInfo } from '@/shared/types'

// =============================================================================
// TYPES
// =============================================================================

interface TabInfoWithGroup extends TabInfo {
  readonly chromeGroupId?: number | undefined
}

interface ExistingGroup {
  readonly id: number
  readonly name: string
  readonly color: ChromeTabGroupColor
  readonly tabCount: number
}

// =============================================================================
// COLOR OPTIONS
// =============================================================================

const CHROME_COLORS: { color: ChromeTabGroupColor; hex: string; label: string }[] = [
  { color: 'blue',   hex: '#2563EB', label: 'Blue'   },
  { color: 'purple', hex: '#6D4AFF', label: 'Purple' },
  { color: 'green',  hex: '#1D9E75', label: 'Green'  },
  { color: 'cyan',   hex: '#0891B2', label: 'Cyan'   },
  { color: 'yellow', hex: '#D97706', label: 'Yellow' },
  { color: 'red',    hex: '#DC2626', label: 'Red'    },
  { color: 'pink',   hex: '#D4537E', label: 'Pink'   },
  { color: 'grey',   hex: '#6B7280', label: 'Grey'   },
]

const GROUP_HEX: Record<string, string> = Object.fromEntries(
  CHROME_COLORS.map(({ color, hex }) => [color, hex]),
)

const SKIP_PREFIXES = ['chrome://', 'chrome-extension://'] as const

function isGroupableUrl(url: string | undefined): boolean {
  if (!url) return false
  return !SKIP_PREFIXES.some((p) => url.startsWith(p))
}

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
  const [selectedColor, setSelectedColor] = useState<ChromeTabGroupColor>('blue')
  const [allTabs, setAllTabs] = useState<TabInfoWithGroup[]>([])
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set())
  const [showAllTabs, setShowAllTabs] = useState(false)
  const [search, setSearch] = useState('')
  const [groupMap, setGroupMap] = useState<Record<number, string>>({})
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['inbox']))
  const [existingGroups, setExistingGroups] = useState<ExistingGroup[]>([])

  // Fetch existing Chrome groups on mount
  useEffect(() => {
    try {
      chrome.tabGroups.query({}, (groups) => {
        if (chrome.runtime.lastError || !groups.length) return
        const promises = groups.map(
          (g) =>
            new Promise<ExistingGroup>((resolve) => {
              chrome.tabs.query({ groupId: g.id }, (tabs) => {
                resolve({
                  id: g.id,
                  name: g.title ?? 'Unnamed',
                  color: g.color as ChromeTabGroupColor,
                  tabCount: tabs.length,
                })
              })
            }),
        )
        Promise.all(promises).then(setExistingGroups)
      })
    } catch {
      // Extension not loaded properly
    }
  }, [])

  // Fetch tabs based on showAllTabs toggle
  useEffect(() => {
    try {
      const query: chrome.tabs.QueryInfo = showAllTabs
        ? {}
        : { groupId: chrome.tabGroups.TAB_GROUP_ID_NONE }

      chrome.tabs.query(query, (tabs) => {
        if (chrome.runtime.lastError) return
        setAllTabs(
          tabs
            .filter((t) => t.id && isGroupableUrl(t.url))
            .map((t) => ({
              id: t.id!,
              title: t.title ?? t.url ?? '',
              url: t.url ?? '',
              favIconUrl: t.favIconUrl,
              chromeGroupId:
                t.groupId !== undefined && t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
                  ? t.groupId
                  : undefined,
            })),
        )
      })
    } catch {
      // Extension not loaded properly
    }
  }, [showAllTabs])

  // Load group name map when showing all tabs
  useEffect(() => {
    if (!showAllTabs) {
      setGroupMap({})
      return
    }
    try {
      chrome.tabGroups.query({}, (groups) => {
        if (chrome.runtime.lastError) return
        const map: Record<number, string> = {}
        for (const g of groups) {
          map[g.id] = g.title ?? 'Unnamed'
        }
        setGroupMap(map)
      })
    } catch {
      // Extension not loaded properly
    }
  }, [showAllTabs])

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

    const grouped: Record<string, { name: string; tabs: TabInfoWithGroup[] }> = {}

    for (const tab of allTabs) {
      if (tab.chromeGroupId !== undefined && groupMap[tab.chromeGroupId]) {
        const key = String(tab.chromeGroupId)
        if (!grouped[key]) grouped[key] = { name: groupMap[tab.chromeGroupId]!, tabs: [] }
        grouped[key]!.tabs.push(tab)
      } else {
        if (!grouped['inbox']) grouped['inbox'] = { name: 'Inbox', tabs: [] }
        grouped['inbox']!.tabs.push(tab)
      }
    }

    return grouped
  }, [allTabs, groupMap, showAllTabs])

  const visibleTabs = allTabs.filter((tab) => matchesSearch(tab, search))

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

  const renderTabRow = (tab: TabInfoWithGroup) => (
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

      {/* Existing groups overview */}
      {existingGroups.length > 0 && (
        <div className="existing-groups">
          <p className="existing-groups-label">Existing groups</p>
          <div className="existing-groups-list">
            {existingGroups.map((group) => (
              <div key={group.id} className="existing-group-chip">
                <div
                  className="existing-group-dot"
                  style={{ background: GROUP_HEX[group.color] ?? '#6B7280' }}
                />
                <span className="existing-group-name">{group.name}</span>
                <span className="existing-group-count">{group.tabCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="gdot" style={{ background: GROUP_HEX[selectedColor] ?? '#6B7280' }} />
          <span className="gn">{groupName}</span>
        </div>
      )}

      {/* Color picker — 4x2 grid */}
      <div className="color-picker-label">Color</div>
      <div className="color-picker-grid">
        {CHROME_COLORS.map(({ color, hex, label }) => (
          <button
            key={color}
            className={`color-swatch${selectedColor === color ? ' selected' : ''}`}
            onClick={() => setSelectedColor(color)}
            title={label}
            aria-label={label}
            aria-pressed={selectedColor === color}
          >
            <div className="color-swatch-circle" style={{ background: hex }} />
            <span className="color-swatch-label">{label}</span>
            {selectedColor === color && (
              <div className="color-swatch-check">
                <CheckIcon />
              </div>
            )}
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
                    <span className="manual-section-name">{section.name}</span>
                    <span className="manual-section-count">{sectionTabs.length}</span>
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
