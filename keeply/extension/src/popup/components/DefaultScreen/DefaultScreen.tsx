import { useState } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { useTabGroups } from '@/popup/hooks/useTabGroups'
import { useDefaultScreenData } from '@/popup/hooks/useDefaultScreenData'
import type { GroupWithTabs, TabInfoWithWindow } from '@/popup/hooks/useDefaultScreenData'
import { UsageDots } from '@/popup/components/UsageDots/UsageDots'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { GROUP_COLOR_HEX } from '@/shared/constants'
import { removeGroupFromRecent, removeTabFromRecent } from '@/shared/utils/recentGroupsUtils'

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
    if (tabId) return { tabId, sourceGroupId: 'inbox' }
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

  const { tabCount, recentGroups, totalTabsGrouped, currentGroups, inboxTabs } =
    useDefaultScreenData()

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

  const handleGroupDragLeave = (e: React.DragEvent, groupId: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (isDragOver === groupId) setIsDragOver(null)
    }
  }

  const closeTab = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation()
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) return
      removeTabFromRecent(tabId, () => triggerRefresh())
    })
  }

  const ungroupAll = (e: React.MouseEvent, group: GroupWithTabs) => {
    e.stopPropagation()
    chrome.tabs.ungroup([...group.tabIds], () => {
      if (chrome.runtime.lastError) return
      removeGroupFromRecent(group.name, () => triggerRefresh())
    })
  }

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

      {/* Groups section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="slbl">Groups</div>
        <button className="new-group-btn" onClick={() => setScreen('manual')}>+ New</button>
      </div>

      {currentGroups.length === 0 && (
        <div className="rr empty">
          <span className="rm">No groups yet. Click Group tabs to start.</span>
        </div>
      )}

      {currentGroups.map((group) => (
        <GroupItem
          key={group.id}
          group={group}
          isExpanded={expandedGroups.has(group.id)}
          isDragOver={isDragOver === group.id}
          onToggle={() => toggleGroup(group.id)}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(group.id) }}
          onDragLeave={(e) => handleGroupDragLeave(e, group.id)}
          onDrop={(e) => handleDropOnGroup(e, group)}
          onCloseTab={closeTab}
          onUngroupAll={(e) => ungroupAll(e, group)}
        />
      ))}

      {/* Inbox section */}
      <InboxSection
        tabs={inboxTabs}
        isDragOver={isDragOver === 'inbox'}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver('inbox') }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(null)
        }}
        onDrop={handleDropOnInbox}
        onCloseTab={closeTab}
      />

      {/* Empty ungrouped drop target while dragging */}
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
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function GroupItem({
  group,
  isExpanded,
  isDragOver: dragOver,
  onToggle,
  onDragOver,
  onDragLeave,
  onDrop,
  onCloseTab,
  onUngroupAll,
}: {
  group: GroupWithTabs
  isExpanded: boolean
  isDragOver: boolean
  onToggle: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onCloseTab: (e: React.MouseEvent, tabId: number) => void
  onUngroupAll: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={`group-item${dragOver ? ' drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="rr group-header" onClick={onToggle}>
        <div className="rdot" style={{ background: GROUP_COLOR_HEX[group.color] ?? '#6B7280' }} aria-hidden="true" />
        <span className="rn">{group.name}</span>
        <span className="rm">{group.tabs.length} tabs</span>
        <svg className={`expand-arrow${isExpanded ? ' expanded' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <button className="group-delete-btn" title="Ungroup all tabs" onClick={onUngroupAll}>×</button>
      </div>

      {isExpanded && (
        <div className="group-tabs-list">
          {group.tabs.map((tab) => (
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
              <button className="tab-close-btn" title="Close tab" onClick={(e) => onCloseTab(e, tab.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InboxSection({
  tabs,
  isDragOver: dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onCloseTab,
}: {
  tabs: readonly TabInfoWithWindow[]
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onCloseTab: (e: React.MouseEvent, tabId: number) => void
}) {
  if (tabs.length === 0) return null

  return (
    <div
      className={`inbox-section${dragOver ? ' drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="slbl" style={{ color: '#9B9C96' }}>Ungrouped · {tabs.length} tabs</div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="tab-row inbox-tab"
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            e.dataTransfer.setData('text/plain', makeDragData(tab.id, 'inbox'))
            e.dataTransfer.effectAllowed = 'move'
          }}
        >
          <TabFavicon url={tab.favIconUrl} />
          <span className="tab-title">{tab.title}</span>
          <button className="tab-close-btn" title="Close tab" onClick={(e) => onCloseTab(e, tab.id)}>×</button>
          <span className="drag-hint" aria-hidden="true">&#x2807;</span>
        </div>
      ))}
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
