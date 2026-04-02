import { useState, useRef, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useOutsideClick } from '@/popup/hooks/useOutsideClick'
import { STORAGE_KEYS, MAX_GROUP_NAME_LENGTH, GROUP_NAME_COUNTER_THRESHOLD, MAX_RECENT_GROUPS } from '@/shared/constants'
import type { KeeplyGroup, RecentGroup } from '@/shared/types'
import { EmojiPicker } from './EmojiPicker'

interface InlineGroupFormProps {
  onCreated: () => void
  onCancel: () => void
}

export function InlineGroupForm({ onCreated, onCancel }: InlineGroupFormProps) {
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)

  const [groupName, setGroupName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
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

  const canCreate = groupName.trim().length > 0

  const handleCreate = () => {
    if (!canCreate) return

    const newGroup: KeeplyGroup = {
      id: crypto.randomUUID(),
      name: groupName.trim(),
      color: 'blue',
      ...(selectedEmoji ? { emoji: selectedEmoji } : {}),
      tabs: [],
    }

    const newEntry: RecentGroup = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      groups: [{ name: newGroup.name, color: newGroup.color, tabIds: [] }],
      totalTabs: 0,
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
      <div className="igf-sep" />
    </div>
  )
}
