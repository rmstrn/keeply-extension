import { STORAGE_KEYS } from '@/shared/constants'
import type { RecentGroup } from '@/shared/types'

/**
 * Remove sessions containing a group name from recent groups storage
 */
export function removeGroupFromRecent(groupName: string, onDone: () => void): void {
  chrome.storage.local.get(STORAGE_KEYS.RECENT_GROUPS, (result) => {
    const existing = (result[STORAGE_KEYS.RECENT_GROUPS] as RecentGroup[] | undefined) ?? []
    const updated = existing.filter(
      (session) => !session.groups.some((g) => g.name === groupName),
    )
    chrome.storage.local.set({ [STORAGE_KEYS.RECENT_GROUPS]: updated }, onDone)
  })
}

/**
 * Remove a tabId from all recent sessions, pruning empty groups/sessions
 */
export function removeTabFromRecent(tabId: number, onDone: () => void): void {
  chrome.storage.local.get(STORAGE_KEYS.RECENT_GROUPS, (result) => {
    const existing = (result[STORAGE_KEYS.RECENT_GROUPS] as RecentGroup[] | undefined) ?? []
    const updated = existing
      .map((session) => ({
        ...session,
        groups: session.groups
          .map((g) => ({ ...g, tabIds: g.tabIds.filter((id) => id !== tabId) }))
          .filter((g) => g.tabIds.length > 0),
      }))
      .filter((session) => session.groups.length > 0)
    chrome.storage.local.set({ [STORAGE_KEYS.RECENT_GROUPS]: updated }, onDone)
  })
}
