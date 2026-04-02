import { useState, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { extractGroupableTabs } from '@/shared/utils/tabUtils'
import { GROUP_COLOR_HEX } from '@/shared/constants'
import { tabCountLabel } from '@/shared/utils/chromeUtils'
import { TabRow } from '@/popup/components/TabRow/TabRow'
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
              <div
                className="gdot"
                style={{ background: GROUP_COLOR_HEX[group.color] ?? '#6B7280' }}
                aria-hidden="true"
              />
              <span className="gn">{group.name}</span>
              <span className="gbadge" aria-label={tabCountLabel(group.tabIds.length)}>
                {group.tabIds.length}
              </span>
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
