import { useState, useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { useTabGroups } from '@/popup/hooks/useTabGroups'
import { UsageDots } from '@/popup/components/UsageDots/UsageDots'
import { STORAGE_KEYS } from '@/shared/constants'
import type { BackgroundMessage, PopupMessage, RecentGroup, TabInfo } from '@/shared/types'

// =============================================================================
// COLOR MAP — hex values for display
// =============================================================================

const GROUP_COLORS: Record<string, string> = {
  green: '#1D9E75',
  blue: '#2563EB',
  purple: '#6D4AFF',
  yellow: '#D97706',
  red: '#DC2626',
  pink: '#D4537E',
  cyan: '#0891B2',
  grey: '#6B7280',
}

// =============================================================================
// TIME AGO HELPER
// =============================================================================

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function sendMessage(message: BackgroundMessage): Promise<PopupMessage> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: PopupMessage) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(response)
    })
  })
}

// =============================================================================
// DEFAULT SCREEN
// =============================================================================

export function DefaultScreen() {
  const { groupTabs } = useTabGroups()
  const status = useUsageStore((s) => s.status)
  const isLoading = useUsageStore((s) => s.isLoading)
  const setScreen = useTabStore((s) => s.setScreen)

  const [tabCount, setTabCount] = useState(0)
  const [recentGroups, setRecentGroups] = useState<RecentGroup[]>([])
  const [totalTabsGrouped, setTotalTabsGrouped] = useState(0)
  const [inboxTabs, setInboxTabs] = useState<TabInfo[]>([])

  // Fetch real tab count
  useEffect(() => {
    try {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) return
        setTabCount(tabs.length)
      })
    } catch {
      // Extension not loaded properly
    }
  }, [])

  // Load recent groups and total counter from storage
  useEffect(() => {
    try {
      chrome.storage.local.get(
        [STORAGE_KEYS.RECENT_GROUPS, STORAGE_KEYS.TOTAL_TABS_GROUPED],
        (result) => {
          if (chrome.runtime.lastError) return
          const groups = result[STORAGE_KEYS.RECENT_GROUPS] as RecentGroup[] | undefined
          if (groups) setRecentGroups(groups)
          const total = result[STORAGE_KEYS.TOTAL_TABS_GROUPED] as number | undefined
          if (typeof total === 'number') setTotalTabsGrouped(total)
        },
      )
    } catch {
      // Extension not loaded properly
    }
  }, [])

  // Load current groups to detect inbox tabs
  useEffect(() => {
    void (async () => {
      try {
        const response = await sendMessage({ type: 'GET_CURRENT_GROUPS' })
        if (response.type === 'CURRENT_GROUPS_RESPONSE') {
          setInboxTabs([...response.payload.inboxTabs])
        }
      } catch {
        // Extension not loaded properly
      }
    })()
  }, [])

  return (
    <div className="body">
      <div className="tab-meta">
        <span className="tab-ct">
          <TabIcon />
          {tabCount} tabs open
        </span>
        <button
          className="fullpage-btn"
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('fullpage.html') })}
          title="Open full page view"
        >
          Full page
          <ExternalIcon />
        </button>
      </div>

      {/* CTA — always solid teal via inline style */}
      <button
        className="cta-btn"
        style={{ background: '#0D7A5F', color: '#FFFFFF', border: 'none' }}
        onMouseOver={(e) => { e.currentTarget.style.background = '#0A5C47' }}
        onMouseOut={(e) => { e.currentTarget.style.background = '#0D7A5F' }}
        onClick={() => void groupTabs()}
        disabled={!isLoading && status.isLimitReached}
        aria-label="Group tabs with AI"
      >
        <BulbIcon />
        Group tabs with AI
      </button>

      <UsageDots status={status} />

      <div className="divider" role="separator" />

      <div className="stats" role="region" aria-label="Tab statistics">
        <div className="stat">
          <span className="sn">{tabCount}</span>
          <span className="sl">Open tabs</span>
        </div>
        <div className="stat">
          <span className="sn">{recentGroups.length}</span>
          <span className="sl">Sessions</span>
        </div>
        <div className="stat">
          <span className="sn">{totalTabsGrouped}</span>
          <span className="sl">All time</span>
        </div>
      </div>

      {inboxTabs.length > 0 && (
        <div className="inbox-hint">
          {inboxTabs.length} tabs in Inbox — not grouped yet
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="slbl" aria-label="Recent groups section">Groups</div>
        <button className="new-group-btn" onClick={() => setScreen('manual')}>+ New</button>
      </div>
      {recentGroups.length === 0 ? (
        <div className="rr empty">
          <span className="rm">No groups yet. Click Group tabs to start.</span>
        </div>
      ) : (
        recentGroups.map((entry) => (
          <div key={entry.id} className="rr" role="button" tabIndex={0}>
            <div
              className="rdot"
              style={{ background: GROUP_COLORS[entry.groups[0]?.color ?? 'grey'] ?? '#6B7280' }}
              aria-hidden="true"
            />
            <span className="rn">
              {entry.groups.map((g) => g.name).join(', ')}
            </span>
            <span className="rm">
              {entry.totalTabs} tabs · {timeAgo(entry.timestamp)}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

// Inline SVG icons для чистоты компонента
function TabIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x=".5" y=".5" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="7" y=".5" width="5.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x=".5" y="6" width="12" height="6.5" rx="1" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function BulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2C5.8 2 4 3.8 4 6c0 1.7.9 3.1 2.3 3.9V11h3.4V9.9C11.1 9.1 12 7.7 12 6c0-2.2-1.8-4-4-4z"
        fill="white"
        fillOpacity=".9"
      />
      <rect x="5.8" y="11" width="4.4" height="1.5" rx=".75" fill="white" fillOpacity=".7" />
      <rect x="6.3" y="12.5" width="3.4" height="1" rx=".5" fill="white" fillOpacity=".5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path
        d="M2 8L8 2M8 2H4.5M8 2v3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
