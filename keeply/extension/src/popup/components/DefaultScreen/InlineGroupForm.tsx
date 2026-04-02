import { useState, useRef, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import type { TabInfoWithWindow } from '@/popup/hooks/useDefaultScreenData'
import { useOutsideClick } from '@/popup/hooks/useOutsideClick'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { STORAGE_KEYS, MAX_GROUP_NAME_LENGTH, GROUP_NAME_COUNTER_THRESHOLD, MAX_RECENT_GROUPS } from '@/shared/constants'
import type { GroupTab, KeeplyGroup, RecentGroup } from '@/shared/types'
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

  const canCreate = groupName.trim().length > 0

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
    <div className="igf" ref={formRef}>
      <div className="igf-sep" />
      <div className="igf-name-row">
        <div className="emoji-picker-wrapper" ref={emojiRef}>
          <button
            type="button"
            className="igf-emoji"
            onClick={() => setEmojiOpen((o) => !o)}
            aria-label="Pick emoji"
          >
            {selectedEmoji ?? '😀'}
          </button>
          {emojiOpen && <EmojiPicker onPick={pickEmoji} />}
        </div>
        <input
          ref={inputRef}
          className="igf-input"
          type="text"
          placeholder="Group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          maxLength={MAX_GROUP_NAME_LENGTH}
        />
        {groupName.length >= GROUP_NAME_COUNTER_THRESHOLD && (
          <span className="igf-counter">{groupName.length}/{MAX_GROUP_NAME_LENGTH}</span>
        )}
        <button
          type="button"
          className="igf-confirm"
          onClick={handleCreate}
          disabled={!canCreate}
          aria-label="Create group"
        >
          Add
        </button>
      </div>

      {ungroupedTabs.length > 0 && (
        <div className="igf-tabs" role="listbox" aria-label="Select tabs">
          {ungroupedTabs.map((tab) => (
            <div
              key={tab.id}
              className={`igf-tab${selectedTabIds.has(tab.id) ? ' selected' : ''}`}
              onClick={() => toggleTab(tab.id)}
              role="option"
              aria-selected={selectedTabIds.has(tab.id)}
            >
              <span className={`igf-check${selectedTabIds.has(tab.id) ? ' checked' : ''}`}>
                {selectedTabIds.has(tab.id) && (
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </span>
              <TabFavicon url={tab.favIconUrl} />
              <span className="tab-title">{tab.title}</span>
            </div>
          ))}
        </div>
      )}
      <div className="igf-sep" />
    </div>
  )
}
