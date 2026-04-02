import { useState, useRef, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import type { TabInfoWithWindow } from '@/popup/hooks/useDefaultScreenData'
import { useOutsideClick } from '@/popup/hooks/useOutsideClick'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { STORAGE_KEYS, MAX_GROUP_NAME_LENGTH, MAX_RECENT_GROUPS } from '@/shared/constants'
import type { GroupTab, KeeplyGroup, RecentGroup } from '@/shared/types'
import { CheckIcon } from './Icons'
import { EmojiPicker } from './EmojiPicker'

interface InlineGroupFormProps {
  ungroupedTabs: TabInfoWithWindow[]
  onCreated: () => void
  onCancel: () => void
}

export function InlineGroupForm({ ungroupedTabs, onCreated, onCancel }: InlineGroupFormProps) {
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)

  const [groupName, setGroupName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set())
  const [emojiOpen, setEmojiOpen] = useState(false)

  const formRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) onCancel()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onCancel])

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
          [STORAGE_KEYS.RECENT_GROUPS]: [newEntry, ...existingRecent].slice(0, MAX_RECENT_GROUPS),
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
          maxLength={MAX_GROUP_NAME_LENGTH}
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
