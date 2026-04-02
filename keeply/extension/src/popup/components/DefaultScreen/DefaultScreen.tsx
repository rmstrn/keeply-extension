import { useState, useRef, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { useTabGroups } from '@/popup/hooks/useTabGroups'
import { useDefaultScreenData } from '@/popup/hooks/useDefaultScreenData'
import type { TabInfoWithWindow } from '@/popup/hooks/useDefaultScreenData'
import { useOutsideClick } from '@/popup/hooks/useOutsideClick'
import { useGroupActions } from '@/popup/hooks/useGroupActions'
import { useTheme } from '@/popup/hooks/useTheme'
import { UsageDots } from '@/popup/components/UsageDots/UsageDots'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { STORAGE_KEYS } from '@/shared/constants'
import { tabCountLabel } from '@/shared/utils/chromeUtils'
import type { GroupTab, KeeplyGroup, RecentGroup } from '@/shared/types'
import { TabIcon, BulbIcon, ExternalIcon, CheckIcon } from './Icons'
import { EmojiPicker } from './EmojiPicker'
import { GroupRow } from './GroupRow'

// =============================================================================
// HELPERS
// =============================================================================

interface DragData {
  readonly tabId: number
  readonly url: string
  readonly sourceGroupId: string
}

function parseDragData(e: React.DragEvent): DragData | null {
  const raw = e.dataTransfer.getData('text/plain')
  try {
    const data = JSON.parse(raw) as DragData
    if (data.tabId && data.url) return data
  } catch {
    // legacy: plain tabId
  }
  return null
}

function makeDragData(tabId: number, url: string, sourceGroupId: string): string {
  return JSON.stringify({ tabId, url, sourceGroupId })
}

// =============================================================================
// INLINE GROUP FORM
// =============================================================================

interface InlineGroupFormProps {
  ungroupedTabs: TabInfoWithWindow[]
  onCreated: () => void
  onCancel: () => void
}

function InlineGroupForm({ ungroupedTabs, onCreated, onCancel }: InlineGroupFormProps) {
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)

  const [groupName, setGroupName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set())
  const [emojiOpen, setEmojiOpen] = useState(false)

  const formRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onCancel])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (emojiOpen) setEmojiOpen(false)
        else onCancel()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel, emojiOpen])

  // Close emoji picker on outside click
  useOutsideClick(emojiRef, emojiOpen, () => setEmojiOpen(false))

  const pickEmoji = (emoji: string) => {
    setSelectedEmoji(emoji)
    setEmojiOpen(false)
    inputRef.current?.focus()
  }

  const toggleTab = (tabId: number) => {
    setSelectedTabIds((prev) => {
      const next = new Set(prev)
      if (next.has(tabId)) next.delete(tabId)
      else next.add(tabId)
      return next
    })
  }

  const canCreate = groupName.trim().length > 0 && selectedTabIds.size > 0

  const handleCreate = () => {
    if (!canCreate) return

    const tabs: GroupTab[] = [...selectedTabIds].map((tabId) => {
      const tab = ungroupedTabs.find((t) => t.id === tabId)!
      return { url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl, tabId }
    })

    const newGroup: KeeplyGroup = {
      id: crypto.randomUUID(),
      name: groupName.trim(),
      color: 'blue',
      ...(selectedEmoji ? { emoji: selectedEmoji } : {}),
      tabs,
    }

    const newEntry: RecentGroup = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      groups: [{ name: newGroup.name, color: newGroup.color, tabIds: [...selectedTabIds] }],
      totalTabs: tabs.length,
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
          onCreated()
        })
      },
    )
  }

  return (
    <div className="inline-group-form" ref={formRef}>
      <div className="inline-form-name-row">
        <div className="emoji-picker-wrapper" ref={emojiRef}>
          <button
            type="button"
            className="emoji-trigger"
            onClick={() => setEmojiOpen((o) => !o)}
            aria-label="Pick emoji"
            aria-expanded={emojiOpen}
          >
            {selectedEmoji ?? '😀'}
          </button>
          {emojiOpen && <EmojiPicker onPick={pickEmoji} />}
        </div>
        <input
          ref={inputRef}
          className="manual-input"
          type="text"
          placeholder="Group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          maxLength={50}
        />
        <button
          type="button"
          className="inline-form-confirm"
          onClick={handleCreate}
          disabled={!canCreate}
          aria-label="Create group"
          title="Create group"
        >
          ✓
        </button>
      </div>

      {ungroupedTabs.length > 0 && (
        <div className="inline-form-tabs" role="listbox" aria-label="Select tabs">
          {ungroupedTabs.map((tab) => (
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
          ))}
        </div>
      )}
    </div>
  )
}

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
  const [showInlineForm, setShowInlineForm] = useState(false)

  const editInputRef = useRef<HTMLInputElement>(null)
  const editEmojiRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)

  const actions = useGroupActions(keeplyGroups, allTabs, triggerRefresh)

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
        style={{ background: theme.primary, color: theme.primaryText, border: 'none' }}
        onMouseOver={(e) => { e.currentTarget.style.background = theme.primaryHover }}
        onMouseOut={(e) => { e.currentTarget.style.background = theme.primary }}
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
        <button className="new-group-btn" onClick={() => setShowInlineForm((v) => !v)}>+ Add Group</button>
      </div>

      {showInlineForm && (
        <InlineGroupForm
          ungroupedTabs={ungroupedTabs}
          onCreated={() => setShowInlineForm(false)}
          onCancel={() => setShowInlineForm(false)}
        />
      )}

      {keeplyGroups.length === 0 && !showInlineForm && (
        <div className="rr empty" onClick={() => setShowInlineForm(true)} style={{ cursor: 'pointer' }}>
          <span className="rm">No groups yet. Click <strong>Add Group</strong> to start.</span>
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
          onDrop={(e) => { setIsDragOver(null); actions.handleDropOnGroup(e, group, parseDragData) }}
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
            e.dataTransfer.setData('text/plain', makeDragData(gt.tabId!, gt.url, group.id))
            e.dataTransfer.effectAllowed = 'move'
          }}
        />
      ))}

      {/* Ungrouped tabs */}
      {ungroupedTabs.length > 0 && (
        <div
          className={`inbox-section${isDragOver === 'ungrouped' ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver('ungrouped') }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(null)
          }}
          onDrop={(e) => { setIsDragOver(null); actions.handleDropOnUngrouped(e, parseDragData) }}
        >
          <div className="slbl" >Ungrouped · {tabCountLabel(ungroupedTabs.length)}</div>
          {ungroupedTabs.map((tab) => (
            <div
              key={tab.id}
              className="tab-row inbox-tab"
              draggable
              onDragStart={(e) => {
                e.stopPropagation()
                e.dataTransfer.setData('text/plain', makeDragData(tab.id, tab.url, 'ungrouped'))
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <TabFavicon url={tab.favIconUrl} />
              <span className="tab-title">{tab.title}</span>
              <button className="tab-close-btn" title="Close tab" onClick={(e) => actions.closeUngroupedTab(e, tab.id)}>×</button>
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
          onDrop={(e) => { setIsDragOver(null); actions.handleDropOnUngrouped(e, parseDragData) }}
        >
          <div className="slbl" >Drop here to ungroup</div>
        </div>
      )}
    </div>
  )
}
