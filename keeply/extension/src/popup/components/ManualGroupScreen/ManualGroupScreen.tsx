import { useState, useEffect, useMemo, useRef } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { STORAGE_KEYS, GROUP_COLOR_HEX } from '@/shared/constants'
import { isGroupableUrl } from '@/shared/utils/chromeUtils'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import type { ChromeTabGroupColor, RecentGroup, TabInfo } from '@/shared/types'

// =============================================================================
// TYPES
// =============================================================================

interface TabInfoWithGroup extends TabInfo {
  readonly chromeGroupId?: number | undefined
}

// =============================================================================
// COLOR OPTIONS
// =============================================================================

const COLOR_SWATCHES: { color: ChromeTabGroupColor; label: string }[] = [
  { color: 'blue',   label: 'Blue'   },
  { color: 'purple', label: 'Purple' },
  { color: 'green',  label: 'Green'  },
  { color: 'cyan',   label: 'Cyan'   },
  { color: 'yellow', label: 'Yellow' },
  { color: 'red',    label: 'Red'    },
  { color: 'pink',   label: 'Pink'   },
  { color: 'grey',   label: 'Grey'   },
]

/** Parse hex "#RRGGBB" to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

/** Find the nearest ChromeTabGroupColor for a given hex */
function nearestChromeColor(hex: string): ChromeTabGroupColor {
  const [r, g, b] = hexToRgb(hex)
  let best: ChromeTabGroupColor = 'grey'
  let bestDist = Infinity

  for (const [color, colorHex] of Object.entries(GROUP_COLOR_HEX)) {
    const [cr, cg, cb] = hexToRgb(colorHex)
    const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = color as ChromeTabGroupColor
    }
  }

  return best
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
  const [customHex, setCustomHex] = useState<string | null>(null)
  const [allTabs, setAllTabs] = useState<TabInfoWithGroup[]>([])
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set())
  const [showAllTabs, setShowAllTabs] = useState(false)
  const [search, setSearch] = useState('')
  const [groupMap, setGroupMap] = useState<Record<number, string>>({})
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['inbox']))
  const colorInputRef = useRef<HTMLInputElement>(null)

  // The hex to show in the preview dot
  const previewHex = customHex ?? GROUP_COLOR_HEX[selectedColor] ?? '#6B7280'

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

  const selectPresetColor = (color: ChromeTabGroupColor) => {
    setSelectedColor(color)
    setCustomHex(null)
  }

  const handleCustomColor = (hex: string) => {
    setCustomHex(hex)
    setSelectedColor(nearestChromeColor(hex))
  }

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
          <div className="gdot" style={{ background: previewHex }} />
          <span className="gn">{groupName}</span>
        </div>
      )}

      {/* Color picker */}
      <div className="color-picker-label">Color</div>
      <div className="color-picker-grid">
        {COLOR_SWATCHES.map(({ color, label }) => (
          <button
            key={color}
            className={`color-swatch${selectedColor === color && !customHex ? ' selected' : ''}`}
            onClick={() => selectPresetColor(color)}
            title={label}
            aria-label={label}
            aria-pressed={selectedColor === color && !customHex}
          >
            <div className="color-swatch-circle" style={{ background: GROUP_COLOR_HEX[color] }} />
          </button>
        ))}

        {/* Custom color swatch (visible after picking) */}
        {customHex && (
          <button
            className="color-swatch selected"
            onClick={() => colorInputRef.current?.click()}
            title="Custom color"
            aria-label="Custom color"
            aria-pressed={true}
          >
            <div className="color-swatch-circle" style={{ background: customHex }} />
          </button>
        )}

        {/* "+" button to open native color picker */}
        <button
          className="color-swatch color-swatch-add"
          onClick={() => colorInputRef.current?.click()}
          title="Custom color"
          aria-label="Pick custom color"
        >
          <span className="color-swatch-plus">+</span>
        </button>

        <input
          ref={colorInputRef}
          type="color"
          value={customHex ?? '#0D7A5F'}
          onChange={(e) => handleCustomColor(e.target.value)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          tabIndex={-1}
        />
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
