import { useState, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { STORAGE_KEYS } from '@/shared/constants'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
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

const SKIP_PREFIXES = ['chrome://', 'chrome-extension://'] as const

function isGroupableUrl(url: string | undefined): boolean {
  if (!url) return false
  return !SKIP_PREFIXES.some((p) => url.startsWith(p))
}

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
  const [showAllTabs, setShowAllTabs] = useState(false)
  const [search, setSearch] = useState('')
  const [tabGroupIds, setTabGroupIds] = useState<Record<number, number>>({})
  const [groupMap, setGroupMap] = useState<Record<number, string>>({})

  // Fetch tabs based on showAllTabs toggle
  useEffect(() => {
    try {
      const query: chrome.tabs.QueryInfo = showAllTabs
        ? {}
        : { groupId: chrome.tabGroups.TAB_GROUP_ID_NONE }

      chrome.tabs.query(query, (tabs) => {
        if (chrome.runtime.lastError) return
        const filtered = tabs.filter((t) => t.id && isGroupableUrl(t.url))
        setAllTabs(
          filtered.map((t) => ({
            id: t.id!,
            title: t.title ?? t.url ?? '',
            url: t.url ?? '',
            favIconUrl: t.favIconUrl,
          })),
        )
        // Track which group each tab belongs to
        const gids: Record<number, number> = {}
        for (const t of filtered) {
          if (t.id && t.groupId !== undefined && t.groupId !== -1) {
            gids[t.id] = t.groupId
          }
        }
        setTabGroupIds(gids)
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
      if (next.has(tabId)) {
        next.delete(tabId)
      } else {
        next.add(tabId)
      }
      return next
    })
  }

  const visibleTabs = allTabs.filter(
    (tab) =>
      search === '' ||
      tab.title.toLowerCase().includes(search.toLowerCase()) ||
      tab.url.toLowerCase().includes(search.toLowerCase()),
  )

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
          <label className="show-all-toggle">
            <input
              type="checkbox"
              checked={showAllTabs}
              onChange={(e) => setShowAllTabs(e.target.checked)}
            />
            <span>Show tabs already in groups</span>
          </label>
        </div>
      ) : (
        <>
          <div className="tab-list" role="listbox" aria-label="Select tabs">
            {visibleTabs.map((tab) => {
              const gid = tabGroupIds[tab.id]
              const gName = gid !== undefined ? groupMap[gid] : undefined
              return (
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
                  {gName && <span className="tab-group-badge">{gName}</span>}
                </div>
              )
            })}
            {visibleTabs.length === 0 && search !== '' && (
              <div className="empty-state" style={{ padding: '10px 0' }}>
                <p>No tabs match "{search}"</p>
              </div>
            )}
          </div>

          <label className="show-all-toggle">
            <input
              type="checkbox"
              checked={showAllTabs}
              onChange={(e) => setShowAllTabs(e.target.checked)}
            />
            <span>Show tabs already in groups</span>
          </label>
        </>
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
