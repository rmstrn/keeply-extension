import { useState } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { useTabGroups } from '@/popup/hooks/useTabGroups'
import { useDefaultScreenData } from '@/popup/hooks/useDefaultScreenData'
import type { TabInfoWithWindow } from '@/popup/hooks/useDefaultScreenData'
import { UsageDots } from '@/popup/components/UsageDots/UsageDots'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { TabCountBadge } from '@/popup/components/TabCountBadge/TabCountBadge'
import { GROUP_COLOR_HEX, STORAGE_KEYS } from '@/shared/constants'
import { tabCountLabel } from '@/shared/utils/chromeUtils'
import type { KeeplyGroup } from '@/shared/types'

// =============================================================================
// HELPERS
// =============================================================================

interface DragData {
  readonly tabId: number
  readonly sourceGroupId: string
}

function parseDragData(e: React.DragEvent): DragData | null {
  const raw = e.dataTransfer.getData('text/plain')
  try {
    const data = JSON.parse(raw) as DragData
    if (data.tabId) return data
  } catch {
    const tabId = Number(raw)
    if (tabId) return { tabId, sourceGroupId: 'ungrouped' }
  }
  return null
}

function makeDragData(tabId: number, sourceGroupId: string): string {
  return JSON.stringify({ tabId, sourceGroupId })
}

// =============================================================================
// DEFAULT SCREEN
// =============================================================================

export function DefaultScreen() {
  const { groupTabs } = useTabGroups()
  const status = useUsageStore((s) => s.status)
  const isLoading = useUsageStore((s) => s.isLoading)
  const setScreen = useTabStore((s) => s.setScreen)
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)

  const { tabCount, keeplyGroups, allTabs, ungroupedTabs } = useDefaultScreenData()

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isDragOver, setIsDragOver] = useState<string | null>(null)

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Move tab into a Keeply group (storage-only)
  const handleDropOnGroup = (e: React.DragEvent, group: KeeplyGroup) => {
    e.preventDefault()
    setIsDragOver(null)
    const data = parseDragData(e)
    if (!data || data.sourceGroupId === group.id) return

    const updated = keeplyGroups.map((g) => {
      if (g.id === group.id) {
        return { ...g, tabIds: [...g.tabIds, data.tabId] }
      }
      // Remove from source group if dragging between groups
      if (g.id === data.sourceGroupId) {
        return { ...g, tabIds: g.tabIds.filter((id) => id !== data.tabId) }
      }
      return g
    }).filter((g) => g.tabIds.length > 0)

    saveGroups(updated)
  }

  // Remove tab from its group (move to ungrouped)
  const handleDropOnUngrouped = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(null)
    const data = parseDragData(e)
    if (!data || data.sourceGroupId === 'ungrouped') return

    const updated = keeplyGroups
      .map((g) =>
        g.id === data.sourceGroupId
          ? { ...g, tabIds: g.tabIds.filter((id) => id !== data.tabId) }
          : g,
      )
      .filter((g) => g.tabIds.length > 0)

    saveGroups(updated)
  }

  const handleGroupDragLeave = (e: React.DragEvent, groupId: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (isDragOver === groupId) setIsDragOver(null)
    }
  }

  const closeTab = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation()
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) return
      // Also remove from any Keeply group
      const updated = keeplyGroups
        .map((g) => ({ ...g, tabIds: g.tabIds.filter((id) => id !== tabId) }))
        .filter((g) => g.tabIds.length > 0)
      saveGroups(updated)
    })
  }

  const deleteGroup = (e: React.MouseEvent, group: KeeplyGroup) => {
    e.stopPropagation()
    const updated = keeplyGroups.filter((g) => g.id !== group.id)
    saveGroups(updated)
  }

  const saveGroups = (groups: KeeplyGroup[]) => {
    chrome.storage.local.set({ [STORAGE_KEYS.KEEPLY_GROUPS]: groups }, () => {
      triggerRefresh()
    })
  }

  // Resolve tabIds to actual tab info for display
  const resolveGroupTabs = (group: KeeplyGroup): TabInfoWithWindow[] => {
    return group.tabIds
      .map((id) => allTabs.find((t) => t.id === id))
      .filter((t): t is TabInfoWithWindow => t !== undefined)
  }

  return (
    <div className="body">
      <div className="tab-meta">
        <span className="tab-ct">
          <TabIcon />
          {tabCountLabel(tabCount)} open
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

      {/* Groups section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="slbl">Groups</div>
        <button className="new-group-btn" onClick={() => setScreen('manual')}>+ Add Group</button>
      </div>

      {keeplyGroups.length === 0 && (
        <div className="rr empty" onClick={() => setScreen('manual')} style={{ cursor: 'pointer' }}>
          <span className="rm">No groups yet. Click <strong>Add Group</strong> to start.</span>
        </div>
      )}

      {keeplyGroups.map((group) => {
        const tabs = resolveGroupTabs(group)
        const isExpanded = expandedGroups.has(group.id)
        return (
          <div
            key={group.id}
            className={`group-item${isDragOver === group.id ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(group.id) }}
            onDragLeave={(e) => handleGroupDragLeave(e, group.id)}
            onDrop={(e) => handleDropOnGroup(e, group)}
          >
            <div className="rr group-header" onClick={() => toggleGroup(group.id)}>
              <div className="rdot" style={{ background: GROUP_COLOR_HEX[group.color] ?? '#6B7280' }} aria-hidden="true" />
              <span className="rn">{group.name}</span>
              <TabCountBadge count={tabs.length} />
              <svg className={`expand-arrow${isExpanded ? ' expanded' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <button className="group-delete-btn" title="Delete group" onClick={(e) => deleteGroup(e, group)}>×</button>
            </div>

            {isExpanded && (
              <div className="group-tabs-list">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="tab-row group-tab-row"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation()
                      e.dataTransfer.setData('text/plain', makeDragData(tab.id, group.id))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => {
                      chrome.tabs.update(tab.id, { active: true })
                      if (tab.windowId !== undefined) chrome.windows.update(tab.windowId, { focused: true })
                    }}
                  >
                    <TabFavicon url={tab.favIconUrl} />
                    <span className="tab-title">{tab.title}</span>
                    <button className="tab-close-btn" title="Close tab" onClick={(e) => closeTab(e, tab.id)}>×</button>
                  </div>
                ))}
                {tabs.length === 0 && (
                  <div className="tab-row empty"><span className="rm">No open tabs in this group</span></div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Ungrouped tabs */}
      {ungroupedTabs.length > 0 && (
        <div
          className={`inbox-section${isDragOver === 'ungrouped' ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver('ungrouped') }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(null)
          }}
          onDrop={handleDropOnUngrouped}
        >
          <div className="slbl" >Ungrouped · {tabCountLabel(ungroupedTabs.length)}</div>
          {ungroupedTabs.map((tab) => (
            <div
              key={tab.id}
              className="tab-row inbox-tab"
              draggable
              onDragStart={(e) => {
                e.stopPropagation()
                e.dataTransfer.setData('text/plain', makeDragData(tab.id, 'ungrouped'))
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <TabFavicon url={tab.favIconUrl} />
              <span className="tab-title">{tab.title}</span>
              <button className="tab-close-btn" title="Close tab" onClick={(e) => closeTab(e, tab.id)}>×</button>
              <span className="drag-hint" aria-hidden="true">&#x2807;</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty ungrouped drop target while dragging */}
      {ungroupedTabs.length === 0 && isDragOver === 'ungrouped' && (
        <div
          className="inbox-section drag-over"
          onDragOver={(e) => { e.preventDefault(); setIsDragOver('ungrouped') }}
          onDragLeave={() => setIsDragOver(null)}
          onDrop={handleDropOnUngrouped}
        >
          <div className="slbl" >Drop here to ungroup</div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SVG ICONS
// =============================================================================

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
      <path d="M8 2C5.8 2 4 3.8 4 6c0 1.7.9 3.1 2.3 3.9V11h3.4V9.9C11.1 9.1 12 7.7 12 6c0-2.2-1.8-4-4-4z" fill="white" fillOpacity=".9" />
      <rect x="5.8" y="11" width="4.4" height="1.5" rx=".75" fill="white" fillOpacity=".7" />
      <rect x="6.3" y="12.5" width="3.4" height="1" rx=".5" fill="white" fillOpacity=".5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
