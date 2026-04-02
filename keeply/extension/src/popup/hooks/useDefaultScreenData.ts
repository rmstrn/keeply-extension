import { useState, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { isGroupableUrl } from '@/shared/utils/chromeUtils'
import type { ChromeTabGroupColor, TabInfo } from '@/shared/types'

// =============================================================================
// TYPES
// =============================================================================

export interface TabInfoWithWindow extends TabInfo {
  readonly windowId?: number | undefined
}

export interface GroupWithTabs {
  readonly id: string
  readonly name: string
  readonly color: ChromeTabGroupColor
  readonly tabIds: readonly number[]
  readonly tabs: readonly TabInfoWithWindow[]
}

// =============================================================================
// HOOK — fetches all data needed by DefaultScreen
// =============================================================================

export function useDefaultScreenData() {
  const lastRefresh = useTabStore((s) => s.lastRefresh)

  const [tabCount, setTabCount] = useState(0)
  const [currentGroups, setCurrentGroups] = useState<GroupWithTabs[]>([])
  const [inboxTabs, setInboxTabs] = useState<TabInfoWithWindow[]>([])

  // Live tab count with listeners
  useEffect(() => {
    const updateCount = () => {
      try {
        chrome.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError) return
          setTabCount(tabs.filter((t) => isGroupableUrl(t.url)).length)
        })
      } catch {
        // Extension not loaded properly
      }
    }

    updateCount()

    try {
      chrome.tabs.onCreated.addListener(updateCount)
      chrome.tabs.onRemoved.addListener(updateCount)
      chrome.tabs.onUpdated.addListener(updateCount)
    } catch {
      return
    }

    return () => {
      chrome.tabs.onCreated.removeListener(updateCount)
      chrome.tabs.onRemoved.removeListener(updateCount)
      chrome.tabs.onUpdated.removeListener(updateCount)
    }
  }, [])

  // Load current Chrome groups with their tabs
  useEffect(() => {
    try {
      chrome.tabGroups.query({}, (groups) => {
        if (chrome.runtime.lastError) return
        const promises = groups.map(
          (group) =>
            new Promise<GroupWithTabs>((resolve) => {
              chrome.tabs.query({ groupId: group.id }, (tabs) => {
                resolve({
                  id: String(group.id),
                  name: group.title ?? 'Unnamed',
                  color: group.color as ChromeTabGroupColor,
                  tabIds: tabs.map((t) => t.id).filter((id): id is number => id !== undefined),
                  tabs: tabs
                    .filter((t) => t.id && isGroupableUrl(t.url))
                    .map((t) => ({
                      id: t.id!,
                      title: t.title ?? t.url ?? '',
                      url: t.url ?? '',
                      favIconUrl: t.favIconUrl,
                      windowId: t.windowId,
                    })),
                })
              })
            }),
        )
        Promise.all(promises).then(setCurrentGroups)
      })
    } catch {
      // Extension not loaded properly
    }
  }, [lastRefresh])

  // Load inbox (ungrouped) tabs
  useEffect(() => {
    try {
      chrome.tabs.query({ groupId: chrome.tabGroups.TAB_GROUP_ID_NONE }, (tabs) => {
        if (chrome.runtime.lastError) return
        setInboxTabs(
          tabs
            .filter((t) => t.id && isGroupableUrl(t.url))
            .map((t) => ({
              id: t.id!,
              title: t.title ?? '',
              url: t.url ?? '',
              favIconUrl: t.favIconUrl,
              windowId: t.windowId,
            })),
        )
      })
    } catch {
      // Extension not loaded properly
    }
  }, [lastRefresh])

  return { tabCount, currentGroups, inboxTabs }
}
