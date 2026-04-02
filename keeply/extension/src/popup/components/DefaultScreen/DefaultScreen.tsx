import { useUsageStore } from '@/popup/stores/usageStore'
import { useTabGroups } from '@/popup/hooks/useTabGroups'
import { UsageDots } from '@/popup/components/UsageDots/UsageDots'

// =============================================================================
// DEFAULT SCREEN
// =============================================================================

const RECENT_MOCK = [
  { name: 'Work', color: '#1D9E75', tabCount: 8, ago: '2h ago' },
  { name: 'Research', color: '#6D4AFF', tabCount: 5, ago: 'yesterday' },
  { name: 'Shopping', color: '#D97706', tabCount: 3, ago: '2d ago' },
]

export function DefaultScreen() {
  const { groupTabs } = useTabGroups()
  const status = useUsageStore((s) => s.status)

  return (
    <div className="body">
      <div className="tab-meta">
        <span className="tab-ct">
          <TabIcon />
          24 tabs open
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
        disabled={status.isLimitReached}
        aria-label="Group tabs with AI"
      >
        <BulbIcon />
        Group tabs with AI
      </button>

      <UsageDots status={status} />

      <div className="divider" role="separator" />

      <div className="stats" role="region" aria-label="Tab statistics">
        <div className="stat">
          <span className="sn">24</span>
          <span className="sl">Open tabs</span>
        </div>
        <div className="stat">
          <span className="sn">12</span>
          <span className="sl">Sessions</span>
        </div>
        <div className="stat">
          <span className="sn">47</span>
          <span className="sl">All time</span>
        </div>
      </div>

      <div className="slbl" aria-label="Recent groups section">Recent groups</div>
      {RECENT_MOCK.map((group) => (
        <div key={group.name} className="rr" role="button" tabIndex={0}>
          <div className="rdot" style={{ background: group.color }} aria-hidden="true" />
          <span className="rn">{group.name}</span>
          <span className="rm">{group.tabCount} tabs · {group.ago}</span>
        </div>
      ))}
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
