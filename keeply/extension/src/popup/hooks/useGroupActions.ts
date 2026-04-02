import { useState } from 'react'
import { STORAGE_KEYS } from '@/shared/constants'
import type { GroupTab, KeeplyGroup } from '@/shared/types'
import type { TabInfoWithWindow } from '@/popup/hooks/useDefaultScreenData'

export function useGroupActions(
  keeplyGroups: KeeplyGroup[],
  allTabs: TabInfoWithWindow[],
  triggerRefresh: () => void,
) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [emojiPickerGroupId, setEmojiPickerGroupId] = useState<string | null>(null)
  const [menuOpenGroupId, setMenuOpenGroupId] = useState<string | null>(null)
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null)

  const saveGroups = (groups: KeeplyGroup[]) => {
    chrome.storage.local.set({ [STORAGE_KEYS.KEEPLY_GROUPS]: groups }, () => {
      triggerRefresh()
    })
  }

  const startEditing = (group: KeeplyGroup) => {
    setEditingGroupId(group.id)
    setEditName(group.name)
    setEmojiPickerGroupId(null)
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
    setEmojiPickerGroupId(null)
  }

  const pickEditEmoji = (emoji: string, groupId: string) => {
    const updated = keeplyGroups.map((g) =>
      g.id === groupId ? { ...g, emoji } : g,
    )
    saveGroups(updated)
    setEmojiPickerGroupId(null)
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

  const closeTab = (e: React.MouseEvent, groupTab: GroupTab, groupId: string) => {
    e.stopPropagation()
    if (groupTab.tabId !== undefined) {
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

  const handleDropOnGroup = (e: React.DragEvent, group: KeeplyGroup, parseDragData: (e: React.DragEvent) => { tabId: number; url: string; sourceGroupId: string } | null) => {
    e.preventDefault()
    const data = parseDragData(e)
    if (!data || data.sourceGroupId === group.id) return

    const tab = allTabs.find((t) => t.id === data.tabId)
    if (!tab) return
    const newGroupTab: GroupTab = { url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl, tabId: tab.id }

    const updated = keeplyGroups.map((g) => {
      if (g.id === group.id) {
        return { ...g, tabs: [...g.tabs, newGroupTab] }
      }
      if (g.id === data.sourceGroupId) {
        return { ...g, tabs: g.tabs.filter((t) => t.url !== data.url) }
      }
      return g
    }).filter((g) => g.tabs.length > 0)

    saveGroups(updated)
  }

  const handleDropOnUngrouped = (e: React.DragEvent, parseDragData: (e: React.DragEvent) => { tabId: number; url: string; sourceGroupId: string } | null) => {
    e.preventDefault()
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

  return {
    editingGroupId, editName, setEditName,
    emojiPickerGroupId, setEmojiPickerGroupId,
    menuOpenGroupId, setMenuOpenGroupId,
    confirmDeleteGroupId, setConfirmDeleteGroupId,
    startEditing, commitRename, cancelRename, pickEditEmoji,
    openAllClosed, closeAllOpen, closeTab, closeUngroupedTab, deleteGroup,
    saveGroups, handleDropOnGroup, handleDropOnUngrouped,
  }
}
