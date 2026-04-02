import { useState, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { extractGroupableTabs } from '@/shared/utils/tabUtils'
import { tabCountLabel } from '@/shared/utils/chromeUtils'
import { TabRow } from '@/popup/components/TabRow/TabRow'
import { TabCountBadge } from '@/popup/components/TabCountBadge/TabCountBadge'
import type { TabInfo } from '@/shared/types'

export function ResultsScreen() {
  const result = useTabStore((s) => s.lastResult)
  const reset = useTabStore((s) => s.reset)
  const startGrouping = useTabStore((s) => s.startGrouping)
  const [allTabs, setAllTabs] = useState<TabInfo[]>([])

  useEffect(() => {
    try {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) return
        setAllTabs(extractGroupableTabs(tabs))
      })
    } catch {
      // Extension not loaded properly
    }
  }, [])

  if (!result) return null

  return (
    <div className="body">
      <div className="done-chip" role="status">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="#0D7A5F" />
          <path
            d="M5 8l2.5 2.5 4-5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="done-text">
          Done — {tabCountLabel(result.totalTabsGrouped)} → {result.groups.length} groups
        </span>
      </div>

      <div role="list" aria-label="Tab groups">
        {result.groups.map((group) => (
          <div key={group.name} className="gr" role="listitem">
            <div className="gh">
              <span className="gn">{group.name}</span>
              <TabCountBadge count={group.tabIds.length} />
            </div>
            <div className="gtabs">
              {group.tabIds.map((tabId) => {
                const tab = allTabs.find((t) => t.id === tabId)
                if (!tab) return null
                return <TabRow key={tabId} tab={tab} />
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="res-acts">
        <button className="ract" onClick={reset} aria-label="Undo grouping">
          Undo
        </button>
        <button
          className="ract"
          onClick={() => startGrouping()}
          aria-label="Regroup tabs"
        >
          Regroup
        </button>
        <button className="ract ok" onClick={reset} aria-label="Apply groups and close">
          Apply ✓
        </button>
      </div>
    </div>
  )
}
