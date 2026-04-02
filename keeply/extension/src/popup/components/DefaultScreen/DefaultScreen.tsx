import { useState, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { useTabGroups } from '@/popup/hooks/useTabGroups'
import { UsageDots } from '@/popup/components/UsageDots/UsageDots'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { STORAGE_KEYS } from '@/shared/constants'
import type { ChromeTabGroupColor, RecentGroup, TabInfo } from '@/shared/types'

// =============================================================================
// TYPES
// =============================================================================

interface TabInfoWithWindow extends TabInfo {
  readonly windowId?: number | undefined
}

interface GroupWithTabs {
  readonly id: string
  readonly name: string
  readonly color: ChromeTabGroupColor
  readonly tabIds: readonly number[]
  readonly tabs: readonly TabInfoWithWindow[]
}

interface DragData {
  readonly tabId: number
  readonly sourceGroupId: string
}

// =============================================================================
// COLOR MAP
// =============================================================================

const GROUP_COLORS: Record<string, string> = {
  green: '#1D9E75',
  blue: '#2563EB',
  purple: '#6D4AFF',
  yellow: '#D97706',
  red: '#DC2626',
  pink: '#D4537E',
  cyan: '#0891B2',
  grey: '#6B7280',
}

// =============================================================================
// HELPERS
// =============================================================================

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const SKIP_PREFIXES = ['chrome://', 'chrome-extension://'] as const

function isGroupableUrl(url: string | undefined): boolean {
  if (!url) return false
  return !SKIP_PREFIXES.some((p) => url.startsWith(p))
}

function parseDragData(e: React.DragEvent): DragData | null {
  const raw = e.dataTransfer.getData('text/plain')
  try {
    const data = JSON.parse(raw) as DragData
    if (data.tabId) return data
  } catch {
    const tabId = Number(raw)
    if (tabId) return { tabId, sourceGroupId: 'inbox' }
  }
  return null
}

// =============================================================================
// DEFAULT SCREEN
// =============================================================================

export function DefaultScreen() {
  const { groupTabs } = useTabGroups()
  const status = useUsageStore((s) => s.status)
  const isLoading = useUsageStore((s) => s.isLoading)
  const setScreen = useTabStore((s) => s.setScreen)
  const lastRefresh = useTabStore((s) => s.lastRefresh)
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)

  const [tabCount, setTabCount] = useState(0)
  const [recentGroups, setRecentGroups] = useState<RecentGroup[]>([])
  const [totalTabsGrouped, setTotalTabsGrouped] = useState(0)
  const [currentGroups, setCurrentGroups] = useState<GroupWithTabs[]>([])
  const [inboxTabs, setInboxTabs] = useState<TabInfoWithWindow[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isDragOver, setIsDragOver] = useState<string | null>(null)

  // Live tab count with listeners
  useEffect(() => {
    const updateCount = () => {
      try {
        chrome.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError) return
          setTabCount(tabs.filter((t) => isGroupableUrl(t.url)).length)
        })
      } catch {
        // Extension not loaded properly
      }
    }

    updateCount()

    try {
      chrome.tabs.onCreated.addListener(updateCount)
      chrome.tabs.onRemoved.addListener(updateCount)
      chrome.tabs.onUpdated.addListener(updateCount)
    } catch {
      return
    }

    return () => {
      chrome.tabs.onCreated.removeListener(updateCount)
      chrome.tabs.onRemoved.removeListener(updateCount)
      chrome.tabs.onUpdated.removeListener(updateCount)
    }
  }, [])

  // Load recent groups and total counter from storage
  useEffect(() => {
    try {
      chrome.storage.local.get(
        [STORAGE_KEYS.RECENT_GROUPS, STORAGE_KEYS.TOTAL_TABS_GROUPED],
        (result) => {
          if (chrome.runtime.lastError) return
          const groups = result[STORAGE_KEYS.RECENT_GROUPS] as RecentGroup[] | undefined
          if (groups) setRecentGroups(groups)
          const total = result[STORAGE_KEYS.TOTAL_TABS_GROUPED] as number | undefined
          if (typeof total === 'number') setTotalTabsGrouped(total)
        },
      )
    } catch {
      // Extension not loaded properly
    }
  }, [lastRefresh])

  // Load current Chrome groups with their tabs
  useEffect(() => {
    try {
      chrome.tabGroups.query({}, (groups) => {
        if (chrome.runtime.lastError) return
        const promises = groups.map(
          (group) =>
            new Promise<GroupWithTabs>((resolve) => {
              chrome.tabs.query({ groupId: group.id }, (tabs) => {
                resolve({
                  id: String(group.id),
                  name: group.title ?? 'Unnamed',
                  color: group.color as ChromeTabGroupColor,
                  tabIds: tabs.map((t) => t.id).filter((id): id is number => id !== undefined),
                  tabs: tabs
                    .filter((t) => t.id && isGroupableUrl(t.url))
                    .map((t) => ({
                      id: t.id!,
                      title: t.title ?? t.url ?? '',
                      url: t.url ?? '',
                      favIconUrl: t.favIconUrl,
                      windowId: t.windowId,
                    })),
                })
              })
            }),
        )
        Promise.all(promises).then(setCurrentGroups)
      })
    } catch {
      // Extension not loaded properly
    }
  }, [lastRefresh])

  // Load inbox (ungrouped) tabs
  useEffect(() => {
    try {
      chrome.tabs.query({ groupId: chrome.tabGroups.TAB_GROUP_ID_NONE }, (tabs) => {
        if (chrome.runtime.lastError) return
        setInboxTabs(
          tabs
            .filter((t) => t.id && isGroupableUrl(t.url))
            .map((t) => ({
              id: t.id!,
              title: t.title ?? '',
              url: t.url ?? '',
              favIconUrl: t.favIconUrl,
              windowId: t.windowId,
            })),
        )
      })
    } catch {
      // Extension not loaded properly
    }
  }, [lastRefresh])

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDropOnGroup = (e: React.DragEvent, group: GroupWithTabs) => {
    e.preventDefault()
    setIsDragOver(null)
    const data = parseDragData(e)
    if (!data || data.sourceGroupId === group.id) return
    chrome.tabs.group({ tabIds: [data.tabId], groupId: Number(group.id) }, () => {
      if (chrome.runtime.lastError) return
      triggerRefresh()
    })
  }

  const handleDropOnInbox = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(null)
    const data = parseDragData(e)
    if (!data || data.sourceGroupId === 'inbox') return
    chrome.tabs.ungroup([data.tabId], () => {
      if (chrome.runtime.lastError) return
      triggerRefresh()
    })
  }

  const makeDragData = (tabId: number, sourceGroupId: string): string => {
    return JSON.stringify({ tabId, sourceGroupId })
  }

  const closeTab = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation()
    chrome.tabs.remove(tabId, () => triggerRefresh())
  }

  const ungroupAll = (e: React.MouseEvent, group: GroupWithTabs) => {
    e.stopPropagation()
    chrome.tabs.ungroup([...group.tabIds], () => {
      if (chrome.runtime.lastError) return
      triggerRefresh()
    })
  }

  const hasGroups = currentGroups.length > 0

  return (
    <div className="body">
      <div className="tab-meta">
        <span className="tab-ct">
          <TabIcon />
          {tabCount} tabs open
        </span>
        <button
          className="fullpage-btn"
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('fullpage.html') })}
          title="Open full page view"
        >
          Full page
          <ExternalIcon />
        </button>
      </div>

      <button
        className="cta-btn"
        style={{ background: '#0D7A5F', color: '#FFFFFF', border: 'none' }}
        onMouseOver={(e) => { e.currentTarget.style.background = '#0A5C47' }}
        onMouseOut={(e) => { e.currentTarget.style.background = '#0D7A5F' }}
        onClick={() => void groupTabs()}
        disabled={!isLoading && status.isLimitReached}
        aria-label="Group tabs with AI"
      >
        <BulbIcon />
        Group tabs with AI
      </button>

      <UsageDots status={status} />

      <div className="divider" role="separator" />

      <div className="stats" role="region" aria-label="Tab statistics">
        <div className="stat">
          <span className="sn">{tabCount}</span>
          <span className="sl">Open tabs</span>
        </div>
        <div className="stat">
          <span className="sn">{recentGroups.length}</span>
          <span className="sl">Sessions</span>
        </div>
        <div className="stat">
          <span className="sn">{totalTabsGrouped}</span>
          <span className="sl">All time</span>
        </div>
      </div>

      {/* Current Chrome groups — expandable */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="slbl">Groups</div>
        <button className="new-group-btn" onClick={() => setScreen('manual')}>+ New</button>
      </div>

      {!hasGroups && (
        <div className="rr empty">
          <span className="rm">No groups yet. Click Group tabs to start.</span>
        </div>
      )}

      {currentGroups.map((group) => {
        const isExpanded = expandedGroups.has(group.id)
        return (
          <div key={group.id} className="group-item">
            <div
              className={`rr group-header${isDragOver === group.id ? ' drag-over' : ''}`}
              onClick={() => toggleGroup(group.id)}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(group.id) }}
              onDragLeave={() => setIsDragOver(null)}
              onDrop={(e) => handleDropOnGroup(e, group)}
            >
              <div className="rdot" style={{ background: GROUP_COLORS[group.color] ?? '#6B7280' }} aria-hidden="true" />
              <span className="rn">{group.name}</span>
              <span className="rm">{group.tabs.length} tabs</span>
              <svg
                className={`expand-arrow${isExpanded ? ' expanded' : ''}`}
                width="10" height="10" viewBox="0 0 10 10" fill="none"
              >
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <button
                className="group-delete-btn"
                title="Ungroup all tabs"
                onClick={(e) => ungroupAll(e, group)}
              >
                ×
              </button>
            </div>

            {isExpanded && (
              <div className="group-tabs-list">
                {group.tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="tab-row group-tab-row"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', makeDragData(tab.id, group.id))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => {
                      chrome.tabs.update(tab.id, { active: true })
                      if (tab.windowId !== undefined) {
                        chrome.windows.update(tab.windowId, { focused: true })
                      }
                    }}
                  >
                    <TabFavicon url={tab.favIconUrl} />
                    <span className="tab-title">{tab.title}</span>
                    <button
                      className="tab-close-btn"
                      title="Close tab"
                      onClick={(e) => closeTab(e, tab.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Inbox — draggable ungrouped tabs, also a drop target */}
      {inboxTabs.length > 0 && (
        <div
          className={`inbox-section${isDragOver === 'inbox' ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver('inbox') }}
          onDragLeave={() => setIsDragOver(null)}
          onDrop={handleDropOnInbox}
        >
          <div className="slbl" style={{ color: '#9B9C96' }}>
            Inbox · {inboxTabs.length} ungrouped
          </div>
          {inboxTabs.map((tab) => (
            <div
              key={tab.id}
              className="tab-row inbox-tab"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', makeDragData(tab.id, 'inbox'))
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <TabFavicon url={tab.favIconUrl} />
              <span className="tab-title">{tab.title}</span>
              <button
                className="tab-close-btn"
                title="Close tab"
                onClick={(e) => closeTab(e, tab.id)}
              >
                ×
              </button>
              <span className="drag-hint" aria-hidden="true">&#x2807;</span>
            </div>
          ))}
        </div>
      )}

      {/* Show inbox drop target even when empty, if dragging from a group */}
      {inboxTabs.length === 0 && isDragOver === 'inbox' && (
        <div
          className="inbox-section drag-over"
          onDragOver={(e) => { e.preventDefault(); setIsDragOver('inbox') }}
          onDragLeave={() => setIsDragOver(null)}
          onDrop={handleDropOnInbox}
        >
          <div className="slbl" style={{ color: '#9B9C96' }}>Drop here to ungroup</div>
        </div>
      )}

      {/* Recent AI grouping sessions */}
      {recentGroups.length > 0 && (
        <>
          <div className="slbl" style={{ marginTop: 10 }}>Recent sessions</div>
          {recentGroups.map((entry) => (
            <div key={entry.id} className="rr" tabIndex={0}>
              <div
                className="rdot"
                style={{ background: GROUP_COLORS[entry.groups[0]?.color ?? 'grey'] ?? '#6B7280' }}
                aria-hidden="true"
              />
              <span className="rn">
                {entry.groups.map((g) => g.name).join(', ')}
              </span>
              <span className="rm">
                {entry.totalTabs} tabs · {timeAgo(entry.timestamp)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// Inline SVG icons
function TabIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x=".5" y=".5" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="7" y=".5" width="5.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x=".5" y="6" width="12" height="6.5" rx="1" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function BulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2C5.8 2 4 3.8 4 6c0 1.7.9 3.1 2.3 3.9V11h3.4V9.9C11.1 9.1 12 7.7 12 6c0-2.2-1.8-4-4-4z"
        fill="white"
        fillOpacity=".9"
      />
      <rect x="5.8" y="11" width="4.4" height="1.5" rx=".75" fill="white" fillOpacity=".7" />
      <rect x="6.3" y="12.5" width="3.4" height="1" rx=".5" fill="white" fillOpacity=".5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path
        d="M2 8L8 2M8 2H4.5M8 2v3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
