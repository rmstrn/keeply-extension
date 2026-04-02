import { useState, useRef, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { useTabGroups } from '@/popup/hooks/useTabGroups'
import { useDefaultScreenData } from '@/popup/hooks/useDefaultScreenData'
import type { TabInfoWithWindow } from '@/popup/hooks/useDefaultScreenData'
import { UsageDots } from '@/popup/components/UsageDots/UsageDots'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { TabCountBadge } from '@/popup/components/TabCountBadge/TabCountBadge'
import { STORAGE_KEYS } from '@/shared/constants'
import { tabCountLabel } from '@/shared/utils/chromeUtils'
import type { GroupTab, KeeplyGroup, RecentGroup } from '@/shared/types'

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

const EMOJI_CATEGORIES = [
  { label: 'Work',  emojis: ['💼', '📊', '📝', '💡', '🖥️', '📱', '🔧', '⚙️'] },
  { label: 'Media', emojis: ['🎬', '🎵', '🎮', '📚', '🎨', '🎭', '📷', '🎙️'] },
  { label: 'Life',  emojis: ['🛒', '🏠', '🚗', '✈️', '🍕', '☕', '💪', '🧘'] },
  { label: 'Other', emojis: ['⭐', '🔥', '💎', '🚀', '❤️', '🌿', '🎯', '💰'] },
] as const

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
  useEffect(() => {
    if (!emojiOpen) return
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [emojiOpen])

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

    // Snapshot tab data from selected ungrouped tabs
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
      {/* Name row: emoji + input + confirm */}
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
          {emojiOpen && (
            <div className="emoji-dropdown">
              {EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.label} className="emoji-cat">
                  <div className="emoji-cat-label">{cat.label}</div>
                  <div className="emoji-grid">
                    {cat.emojis.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className="emoji-cell"
                        onClick={() => pickEmoji(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Tab selection */}
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

  const { tabCount, keeplyGroups, allTabs, ungroupedTabs } = useDefaultScreenData()

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isDragOver, setIsDragOver] = useState<string | null>(null)
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmojiOpen, setEditEmojiOpen] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const editEmojiRef = useRef<HTMLDivElement>(null)

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startEditing = (group: KeeplyGroup) => {
    setEditingGroupId(group.id)
    setEditName(group.name)
    setEditEmojiOpen(false)
  }

  const commitRename = (groupId: string) => {
    const trimmed = editName.trim()
    if (trimmed.length === 0) {
      cancelRename()
      return
    }
    const updated = keeplyGroups.map((g) =>
      g.id === groupId ? { ...g, name: trimmed } : g,
    )
    saveGroups(updated)
    setEditingGroupId(null)
  }

  const cancelRename = () => {
    setEditingGroupId(null)
    setEditEmojiOpen(false)
  }

  const pickEditEmoji = (emoji: string, groupId: string) => {
    const updated = keeplyGroups.map((g) =>
      g.id === groupId ? { ...g, emoji } : g,
    )
    saveGroups(updated)
    setEditEmojiOpen(false)
  }

  const openAllClosed = (e: React.MouseEvent, group: KeeplyGroup) => {
    e.stopPropagation()
    for (const gt of group.tabs) {
      if (gt.tabId === undefined) {
        chrome.tabs.create({ url: gt.url })
      }
    }
  }

  const closeAllOpen = (e: React.MouseEvent, group: KeeplyGroup) => {
    e.stopPropagation()
    const openTabs = group.tabs.filter((t) => t.tabId !== undefined)
    if (openTabs.length === 0) return
    const tabIds = openTabs.map((t) => t.tabId!)
    chrome.tabs.remove(tabIds, () => {
      if (chrome.runtime.lastError) return
      const updated = keeplyGroups.map((g) =>
        g.id === group.id
          ? { ...g, tabs: g.tabs.map((t) => ({ ...t, tabId: undefined })) }
          : g,
      )
      saveGroups(updated)
    })
  }

  // Close edit emoji picker on outside click
  useEffect(() => {
    if (!editEmojiOpen) return
    const handler = (e: MouseEvent) => {
      if (editEmojiRef.current && !editEmojiRef.current.contains(e.target as Node)) {
        setEditEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editEmojiOpen])

  // Move tab into a Keeply group (storage-only)
  const handleDropOnGroup = (e: React.DragEvent, group: KeeplyGroup) => {
    e.preventDefault()
    setIsDragOver(null)
    const data = parseDragData(e)
    if (!data || data.sourceGroupId === group.id) return

    // Snapshot tab data from allTabs
    const tab = allTabs.find((t) => t.id === data.tabId)
    if (!tab) return
    const newGroupTab: GroupTab = { url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl, tabId: tab.id }

    const updated = keeplyGroups.map((g) => {
      if (g.id === group.id) {
        return { ...g, tabs: [...g.tabs, newGroupTab] }
      }
      // Remove from source group if dragging between groups
      if (g.id === data.sourceGroupId) {
        return { ...g, tabs: g.tabs.filter((t) => t.url !== data.url) }
      }
      return g
    }).filter((g) => g.tabs.length > 0)

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
          ? { ...g, tabs: g.tabs.filter((t) => t.url !== data.url) }
          : g,
      )
      .filter((g) => g.tabs.length > 0)

    saveGroups(updated)
  }

  const handleGroupDragLeave = (e: React.DragEvent, groupId: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (isDragOver === groupId) setIsDragOver(null)
    }
  }

  const closeTab = (e: React.MouseEvent, groupTab: GroupTab, groupId: string) => {
    e.stopPropagation()
    if (groupTab.tabId !== undefined) {
      // Tab is open — close it in Chrome, keep entry with tabId=undefined
      chrome.tabs.remove(groupTab.tabId, () => {
        if (chrome.runtime.lastError) return
        const updated = keeplyGroups.map((g) =>
          g.id === groupId
            ? { ...g, tabs: g.tabs.map((t) => t.url === groupTab.url ? { ...t, tabId: undefined } : t) }
            : g,
        )
        saveGroups(updated)
      })
    } else {
      // Tab is closed — remove entry from group entirely
      const updated = keeplyGroups
        .map((g) =>
          g.id === groupId
            ? { ...g, tabs: g.tabs.filter((t) => t.url !== groupTab.url) }
            : g,
        )
        .filter((g) => g.tabs.length > 0)
      saveGroups(updated)
    }
  }

  const closeUngroupedTab = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation()
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) return
      triggerRefresh()
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

      {keeplyGroups.map((group) => {
        const isExpanded = expandedGroups.has(group.id)
        const isEditing = editingGroupId === group.id
        const closedCount = group.tabs.filter((t) => t.tabId === undefined).length
        return (
          <div
            key={group.id}
            className={`group-item${isDragOver === group.id ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(group.id) }}
            onDragLeave={(e) => handleGroupDragLeave(e, group.id)}
            onDrop={(e) => handleDropOnGroup(e, group)}
          >
            <div className="rr group-header" onClick={() => { if (!isEditing) toggleGroup(group.id) }}>
              {isEditing ? (
                <>
                  <div className="emoji-picker-wrapper" ref={editEmojiRef}>
                    <button
                      type="button"
                      className="group-emoji-btn"
                      onClick={(e) => { e.stopPropagation(); setEditEmojiOpen((o) => !o) }}
                      aria-label="Change emoji"
                    >
                      {group.emoji ?? '😀'}
                    </button>
                    {editEmojiOpen && (
                      <div className="emoji-dropdown">
                        {EMOJI_CATEGORIES.map((cat) => (
                          <div key={cat.label} className="emoji-cat">
                            <div className="emoji-cat-label">{cat.label}</div>
                            <div className="emoji-grid">
                              {cat.emojis.map((e) => (
                                <button
                                  key={e}
                                  type="button"
                                  className="emoji-cell"
                                  onClick={(ev) => { ev.stopPropagation(); pickEditEmoji(e, group.id) }}
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    ref={editInputRef}
                    className="group-rename-input"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(group.id)
                      if (e.key === 'Escape') cancelRename()
                    }}
                    onBlur={() => commitRename(group.id)}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={50}
                    autoFocus
                  />
                </>
              ) : (
                <>
                  {group.emoji && (
                    <span
                      className="group-emoji"
                      role="button"
                      aria-label="Change emoji"
                      onClick={(e) => { e.stopPropagation(); startEditing(group) }}
                    >
                      {group.emoji}
                    </span>
                  )}
                  <span
                    className="rn"
                    onClick={(e) => { e.stopPropagation(); startEditing(group) }}
                  >
                    {group.name}
                  </span>
                </>
              )}
              {closedCount > 0 && (
                <button
                  className="group-action-btn"
                  title="Open all closed tabs"
                  onClick={(e) => openAllClosed(e, group)}
                >
                  Open all
                </button>
              )}
              {group.tabs.length - closedCount > 0 && (
                <button
                  className="group-action-btn"
                  title="Close all open tabs"
                  onClick={(e) => closeAllOpen(e, group)}
                >
                  Close all
                </button>
              )}
              <TabCountBadge count={group.tabs.length} />
              <svg className={`expand-arrow${isExpanded ? ' expanded' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <button className="group-delete-btn" title="Delete group" onClick={(e) => deleteGroup(e, group)}>×</button>
            </div>

            {isExpanded && (
              <div className="group-tabs-list">
                {group.tabs.map((gt) => {
                  const isOpen = gt.tabId !== undefined
                  return (
                    <div
                      key={gt.url}
                      className={`tab-row group-tab-row${isOpen ? '' : ' tab-closed'}`}
                      draggable={isOpen}
                      onDragStart={isOpen ? (e) => {
                        e.stopPropagation()
                        e.dataTransfer.setData('text/plain', makeDragData(gt.tabId!, gt.url, group.id))
                        e.dataTransfer.effectAllowed = 'move'
                      } : undefined}
                      onClick={() => {
                        if (isOpen) {
                          chrome.tabs.update(gt.tabId!, { active: true })
                          const openTab = allTabs.find((t) => t.id === gt.tabId)
                          if (openTab?.windowId !== undefined) chrome.windows.update(openTab.windowId, { focused: true })
                        } else {
                          chrome.tabs.create({ url: gt.url })
                        }
                      }}
                    >
                      <TabFavicon url={gt.favIconUrl} />
                      <span className="tab-title">{gt.title}</span>
                      <button
                        className="tab-close-btn"
                        title={isOpen ? 'Close tab' : 'Remove from group'}
                        onClick={(e) => closeTab(e, gt, group.id)}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
                {group.tabs.length === 0 && (
                  <div className="tab-row empty"><span className="rm">No tabs in this group</span></div>
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
                e.dataTransfer.setData('text/plain', makeDragData(tab.id, tab.url, 'ungrouped'))
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <TabFavicon url={tab.favIconUrl} />
              <span className="tab-title">{tab.title}</span>
              <button className="tab-close-btn" title="Close tab" onClick={(e) => closeUngroupedTab(e, tab.id)}>×</button>
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

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
