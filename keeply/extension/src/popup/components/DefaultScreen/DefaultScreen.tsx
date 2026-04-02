import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { useTabGroups } from '@/popup/hooks/useTabGroups'
import { useDefaultScreenData } from '@/popup/hooks/useDefaultScreenData'
import { useOutsideClick } from '@/popup/hooks/useOutsideClick'
import { useGroupActions } from '@/popup/hooks/useGroupActions'
import { useTheme } from '@/popup/hooks/useTheme'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { tabCountLabel } from '@/shared/utils/chromeUtils'
import { UNGROUPED_ID, makeDragData, makeSingleDragData } from '@/shared/utils/dragUtils'
import { TabIcon, ChevronIcon, LightningIcon } from './Icons'
import { InlineGroupForm } from './InlineGroupForm'
import { GroupRow } from './GroupRow'

// =============================================================================
// DEFAULT SCREEN
// =============================================================================

export function DefaultScreen() {
  const { groupTabs } = useTabGroups()
  const status = useUsageStore((s) => s.status)
  const isLoading = useUsageStore((s) => s.isLoading)
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)
  const theme = useTheme()

  const { tabCount, keeplyGroups, allTabs, ungroupedTabs } = useDefaultScreenData()

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isDragOver, setIsDragOver] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState({ groups: true, ungrouped: true })
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set())

  const clearSelection = useCallback(() => setSelectedTabIds(new Set()), [])

  const toggleTabSelection = (tabId: number) => {
    setSelectedTabIds((prev) => {
      const next = new Set(prev)
      if (next.has(tabId)) next.delete(tabId)
      else next.add(tabId)
      return next
    })
  }

  // ESC clears selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTabIds.size > 0) clearSelection()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedTabIds.size, clearSelection])

  const editInputRef = useRef<HTMLInputElement>(null)
  const editEmojiRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)

  const actions = useGroupActions(keeplyGroups, allTabs, triggerRefresh)

  const duplicateTabIds = useMemo(() => {
    const seen = new Set<string>()
    const dupes: number[] = []
    for (const tab of ungroupedTabs) {
      if (seen.has(tab.url)) dupes.push(tab.id)
      else seen.add(tab.url)
    }
    return dupes
  }, [ungroupedTabs])

  // Outside-click dismissals
  useOutsideClick(editEmojiRef, actions.emojiPickerGroupId !== null, () => actions.setEmojiPickerGroupId(null))
  useOutsideClick(menuRef, actions.menuOpenGroupId !== null, () => actions.setMenuOpenGroupId(null))
  useOutsideClick(confirmRef, actions.confirmDeleteGroupId !== null, () => actions.setConfirmDeleteGroupId(null))

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleGroupDragLeave = (e: React.DragEvent, groupId: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (isDragOver === groupId) setIsDragOver(null)
    }
  }

  return (
    <div className="body" onDragOver={() => setIsDragging(true)} onDragEnd={() => setIsDragging(false)} onDrop={() => setIsDragging(false)}>
      <div className="tab-meta">
        <span className="tab-ct">
          <TabIcon />
          {tabCountLabel(tabCount)} open
        </span>
      </div>

      <button
        className="cta-btn"
        onClick={() => void groupTabs()}
        disabled={!isLoading && status.isLimitReached}
        aria-label="Group tabs with AI"
      >
        <LightningIcon color={theme.ctaIconColor} />
        Group tabs with AI
      </button>

      {/* Groups section */}
      <div
        className="section-header"
        onClick={() => setSectionsOpen((prev) => ({ ...prev, groups: !prev.groups }))}
      >
        <span className="section-label">Groups</span>
        <span className="section-line" />
        <button
          className="new-group-btn"
          onClick={(e) => { e.stopPropagation(); setShowInlineForm((v) => !v) }}
        >
          {showInlineForm ? '× Cancel' : '+ Add group'}
        </button>
        <ChevronIcon expanded={sectionsOpen.groups} />
      </div>

      <div className={`section-body${sectionsOpen.groups ? ' open' : ''}`}>
      {showInlineForm && (
        <InlineGroupForm
          onCreated={() => setShowInlineForm(false)}
          onCancel={() => setShowInlineForm(false)}
        />
      )}

      {keeplyGroups.length === 0 && !showInlineForm && (
        <div className="rr empty" onClick={() => setShowInlineForm(true)}>
          <span className="rm">No groups yet. Click <strong>Add group</strong> to start.</span>
        </div>
      )}

      {keeplyGroups.map((group) => (
        <GroupRow
          key={group.id}
          group={group}
          isExpanded={expandedGroups.has(group.id)}
          isDragOver={isDragOver === group.id}
          isEditing={actions.editingGroupId === group.id}
          isMenuOpen={actions.menuOpenGroupId === group.id}
          isConfirmingDelete={actions.confirmDeleteGroupId === group.id}
          isEmojiPickerOpen={actions.emojiPickerGroupId === group.id}
          editName={actions.editName}
          editEmojiRef={editEmojiRef}
          editInputRef={editInputRef}
          menuRef={menuRef}
          confirmRef={confirmRef}
          onToggleExpand={() => toggleGroup(group.id)}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(group.id) }}
          onDragLeave={(e) => handleGroupDragLeave(e, group.id)}
          onDrop={(e) => { setIsDragOver(null); setIsDragging(false); actions.handleDropOnGroup(e, group); clearSelection() }}
          onStartEditing={() => actions.startEditing(group)}
          onEditNameChange={actions.setEditName}
          onCommitRename={() => actions.commitRename(group.id)}
          onCancelRename={actions.cancelRename}
          onToggleEmojiPicker={() => actions.setEmojiPickerGroupId(actions.emojiPickerGroupId === group.id ? null : group.id)}
          onPickEmoji={(emoji) => actions.pickEditEmoji(emoji, group.id)}
          onToggleMenu={() => actions.setMenuOpenGroupId(actions.menuOpenGroupId === group.id ? null : group.id)}
          onOpenAllClosed={(e) => actions.openAllClosed(e, group)}
          onCloseAllOpen={(e) => actions.closeAllOpen(e, group)}
          onRequestDelete={() => { actions.setMenuOpenGroupId(null); actions.setConfirmDeleteGroupId(group.id) }}
          onConfirmDelete={(e) => { actions.deleteGroup(e, group); actions.setConfirmDeleteGroupId(null) }}
          onCancelDelete={() => actions.setConfirmDeleteGroupId(null)}
          onCloseTab={(e, gt) => actions.closeTab(e, gt, group.id)}
          onTabClick={(gt) => {
            if (gt.tabId !== undefined) {
              chrome.tabs.update(gt.tabId, { active: true })
              const openTab = allTabs.find((t) => t.id === gt.tabId)
              if (openTab?.windowId !== undefined) chrome.windows.update(openTab.windowId, { focused: true })
            } else {
              chrome.tabs.create({ url: gt.url })
            }
          }}
          onTabDragStart={(e, gt) => {
            e.dataTransfer.setData('text/plain', makeSingleDragData(gt.tabId ?? 0, gt.url, group.id))
            e.dataTransfer.effectAllowed = 'move'
          }}
        />
      ))}
      </div>

      {/* Ungrouped tabs */}
      {ungroupedTabs.length > 0 && (
        <div
          className={`inbox-section${isDragOver === UNGROUPED_ID ? ' drop-zone-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(UNGROUPED_ID) }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(null)
          }}
          onDrop={(e) => { setIsDragOver(null); setIsDragging(false); actions.handleDropOnUngrouped(e); clearSelection() }}
        >
          <div
            className="section-header"
            onClick={() => setSectionsOpen((prev) => ({ ...prev, ungrouped: !prev.ungrouped }))}
          >
            <span className="section-label">Ungrouped · {tabCountLabel(ungroupedTabs.length)}</span>
            <span className="section-line" />
            {selectedTabIds.size > 0 && (
              <span className="selection-count">{selectedTabIds.size} selected</span>
            )}
            {selectedTabIds.size === 0 && duplicateTabIds.length > 0 && (
              <button
                className="dedup-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  chrome.tabs.remove(duplicateTabIds, () => triggerRefresh())
                }}
              >
                Remove duplicates
              </button>
            )}
            <ChevronIcon expanded={sectionsOpen.ungrouped} />
          </div>
          <div
            className={`section-body${sectionsOpen.ungrouped ? ' open' : ''}`}
            onClick={(e) => { if (e.target === e.currentTarget) clearSelection() }}
          >
          {ungroupedTabs.map((tab) => {
            const isSelected = selectedTabIds.has(tab.id)
            return (
              <div
                key={tab.id}
                className={`tab-row inbox-tab${isSelected ? ' tab-selected' : ''}`}
                draggable
                onClick={(e) => { e.stopPropagation(); toggleTabSelection(tab.id) }}
                onDragStart={(e) => {
                  e.stopPropagation()
                  if (isSelected && selectedTabIds.size > 1) {
                    // Drag all selected tabs
                    const tabs = ungroupedTabs
                      .filter((t) => selectedTabIds.has(t.id))
                      .map((t) => ({ tabId: t.id, url: t.url }))
                    e.dataTransfer.setData('text/plain', makeDragData(tabs, UNGROUPED_ID))
                    // Custom drag ghost
                    const ghost = document.createElement('div')
                    ghost.textContent = `Moving ${tabs.length} tabs`
                    ghost.style.cssText = 'position:fixed;top:-100px;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:#333;color:#fff;'
                    document.body.appendChild(ghost)
                    e.dataTransfer.setDragImage(ghost, 0, 0)
                    setTimeout(() => ghost.remove(), 0)
                  } else {
                    e.dataTransfer.setData('text/plain', makeSingleDragData(tab.id, tab.url, UNGROUPED_ID))
                  }
                  e.dataTransfer.effectAllowed = 'move'
                }}
              >
                {isSelected && <span className="tab-select-dot" />}
                <TabFavicon url={tab.favIconUrl} />
                <span className="tab-title">{tab.title}</span>
                <button className="tab-close-btn" title="Close tab" onClick={(e) => { e.stopPropagation(); actions.closeUngroupedTab(e, tab.id) }}>×</button>
                <span className="drag-hint" aria-hidden="true">&#x2807;</span>
              </div>
            )
          })}
          </div>
        </div>
      )}

      {/* Empty ungrouped drop target while dragging */}
      {ungroupedTabs.length === 0 && isDragging && (
        <div
          className={`inbox-section${isDragOver === UNGROUPED_ID ? ' drop-zone-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(UNGROUPED_ID) }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(null)
          }}
          onDrop={(e) => { setIsDragOver(null); setIsDragging(false); actions.handleDropOnUngrouped(e) }}
        >
          <div className="slbl" >Drop here to ungroup</div>
        </div>
      )}
    </div>
  )
}
