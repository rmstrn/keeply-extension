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
  const triggerRefresh = useTabStore((s) => s.triggerRefresh)

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

  // Refresh groups when tabs change (removed/updated)
  useEffect(() => {
    const refresh = () => triggerRefresh()

    try {
      chrome.tabs.onRemoved.addListener(refresh)
      chrome.tabs.onUpdated.addListener(refresh)
    } catch {
      return
    }

    return () => {
      chrome.tabs.onRemoved.removeListener(refresh)
      chrome.tabs.onUpdated.removeListener(refresh)
    }
  }, [triggerRefresh])

  // Load groups + open tabs, reconcile tabIds by URL
  useEffect(() => {
    try {
      chrome.tabs.query({}, (chromeTabs) => {
        if (chrome.runtime.lastError) return

        const openTabs: TabInfoWithWindow[] = chromeTabs
          .filter((t) => t.id && isGroupableUrl(t.url))
          .map((t) => ({
            id: t.id!,
            title: t.title ?? '',
            url: t.url ?? '',
            favIconUrl: t.favIconUrl,
            windowId: t.windowId,
          }))

        setAllTabs(openTabs)

        chrome.storage.local.get(STORAGE_KEYS.KEEPLY_GROUPS, (result) => {
          if (chrome.runtime.lastError) return
          const stored = (result[STORAGE_KEYS.KEEPLY_GROUPS] as KeeplyGroup[] | undefined) ?? []

          // Build URL → open tab map for reconciliation
          const urlToTab = new Map<string, TabInfoWithWindow>()
          for (const tab of openTabs) {
            if (!urlToTab.has(tab.url)) {
              urlToTab.set(tab.url, tab)
            }
          }

          // Track which open tabs are claimed by groups (by URL)
          const claimedUrls = new Set<string>()

          // Reconcile: assign tabId if URL matches an open tab
          const reconciled = stored.map((group) => ({
            ...group,
            tabs: group.tabs.map((gt) => {
              const openTab = urlToTab.get(gt.url)
              if (openTab) {
                claimedUrls.add(gt.url)
                return { ...gt, tabId: openTab.id, title: openTab.title, favIconUrl: openTab.favIconUrl }
              }
              return { ...gt, tabId: undefined }
            }),
          }))

          setKeplyGroups(reconciled)
        })
      })
    } catch {
      // Extension not loaded properly
    }
  }, [lastRefresh])

  // Compute ungrouped tabs (tabs whose URL is not in any group)
  const groupedUrls = new Set(keeplyGroups.flatMap((g) => g.tabs.map((t) => t.url)))
  const ungroupedTabs = allTabs.filter((t) => !groupedUrls.has(t.url))

  return { tabCount, keeplyGroups, allTabs, ungroupedTabs }
}
