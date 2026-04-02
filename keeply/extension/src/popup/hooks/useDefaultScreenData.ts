import { useState, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { STORAGE_KEYS } from '@/shared/constants'
import { isGroupableUrl } from '@/shared/utils/chromeUtils'
import type { KeeplyGroup, TabInfo } from '@/shared/types'

// =============================================================================
// TYPES
// =============================================================================

export interface TabInfoWithWindow extends TabInfo {
  readonly windowId?: number | undefined
}

// =============================================================================
// HOOK — fetches all data needed by DefaultScreen
// =============================================================================

export function useDefaultScreenData() {
  const lastRefresh = useTabStore((s) => s.lastRefresh)

  const [tabCount, setTabCount] = useState(0)
  const [keeplyGroups, setKeplyGroups] = useState<KeeplyGroup[]>([])
  const [allTabs, setAllTabs] = useState<TabInfoWithWindow[]>([])

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

  // Load Keeply groups from storage
  useEffect(() => {
    try {
      chrome.storage.local.get(STORAGE_KEYS.KEEPLY_GROUPS, (result) => {
        if (chrome.runtime.lastError) return
        const groups = result[STORAGE_KEYS.KEEPLY_GROUPS] as KeeplyGroup[] | undefined
        setKeplyGroups(groups ?? [])
      })
    } catch {
      // Extension not loaded properly
    }
  }, [lastRefresh])

  // Load all open tabs (for display inside groups and ungrouped section)
  useEffect(() => {
    try {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) return
        setAllTabs(
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

  // Compute ungrouped tabs (tabs not in any Keeply group)
  const groupedTabIds = new Set(keeplyGroups.flatMap((g) => [...g.tabIds]))
  const ungroupedTabs = allTabs.filter((t) => !groupedTabIds.has(t.id))

  return { tabCount, keeplyGroups, allTabs, ungroupedTabs }
}
