import { useTabStore } from '@/popup/stores/tabStore'

// =============================================================================
// LOADING SCREEN
// =============================================================================

const TAG_COLORS = [
  { bg: '#E4F4EE', color: '#0D7A5F', label: 'Work' },
  { bg: '#EDE9FF', color: '#5B21B6', label: 'Research' },
  { bg: '#FEF3C7', color: '#92400E', label: 'Shopping' },
  { bg: '#FFE4E6', color: '#9F1239', label: 'Social' },
  { bg: '#DBEAFE', color: '#1E40AF', label: 'Docs' },
]

export function LoadingScreen() {
  return (
    <div className="lb" role="status" aria-label="Grouping tabs with AI">
      <div className="spin-wrap" aria-hidden="true">
        <div className="spin" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p className="lt">Grouping your tabs…</p>
        <p className="ls" style={{ marginTop: 5 }}>
          AI is analyzing your tabs
        </p>
      </div>
      <div className="tags" aria-hidden="true">
        {TAG_COLORS.map((tag) => (
          <span
            key={tag.label}
            className="tag"
            style={{ background: tag.bg, color: tag.color }}
          >
            {tag.label}
          </span>
        ))}
      </div>
      <div className="prog-wrap">
        <div className="prog-row">
          <span className="prog-lbl">Analyzing patterns…</span>
          <span className="prog-pct" aria-hidden="true" />
        </div>
        <div className="prog-track" role="progressbar" aria-label="AI processing">
          <div className="prog-fill" />
        </div>
      </div>
      <p className="ls">Usually done in 2–3 seconds</p>
    </div>
  )
}

// =============================================================================
// RESULTS SCREEN
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

export function ResultsScreen() {
  const result = useTabStore((s) => s.lastResult)
  const reset = useTabStore((s) => s.reset)
  const startGrouping = useTabStore((s) => s.startGrouping)

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
          Done — {result.totalTabsGrouped} tabs → {result.groups.length} groups
        </span>
      </div>

      <div role="list" aria-label="Tab groups">
        {result.groups.map((group) => (
          <div key={group.name} className="gr" role="listitem">
            <div className="gh">
              <div
                className="gdot"
                style={{ background: GROUP_COLORS[group.color] ?? '#6B7280' }}
                aria-hidden="true"
              />
              <span className="gn">{group.name}</span>
              <span className="gbadge" aria-label={`${group.tabIds.length} tabs`}>
                {group.tabIds.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="res-acts">
        <button className="ract" onClick={reset} aria-label="Undo grouping">
          Undo
        </button>
        <button className="ract" onClick={() => void startGrouping()} aria-label="Regroup tabs">
          Regroup
        </button>
        <button
          className="ract ok"
          onClick={reset}
          aria-label="Apply groups and close"
        >
          Apply ✓
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// PAYWALL SCREEN
// =============================================================================

const PRO_FEATURES = [
  'Unlimited AI groupings every day',
  '30-day session history & restore',
  'Sync across all your devices',
  'Saved spaces up to 20',
] as const

const CHECKMARK = (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
    <path
      d="M1.5 4.5l2 2 4-4"
      stroke="#0D7A5F"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function PaywallScreen() {
  const setScreen = useTabStore((s) => s.setScreen)

  const handleUpgrade = (annual: boolean) => {
    const url = annual
      ? 'https://keeply.app/checkout?plan=annual'
      : 'https://keeply.app/checkout?plan=monthly'
    chrome.tabs.create({ url })
  }

  return (
    <div className="pw-body">
      <div className="pw-top">
        <div className="pw-c1" aria-hidden="true" />
        <div className="pw-c2" aria-hidden="true" />
        <div className="pw-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 2.5l2.4 4.8 5.3.8-3.85 3.75.91 5.3L11 14.7l-4.76 2.45.91-5.3L3.3 8.1l5.3-.8L11 2.5z"
              fill="white"
              fillOpacity=".95"
            />
          </svg>
        </div>
        <p className="pw-title">You've used all 5 free groups</p>
        <p className="pw-sub">
          Unlock unlimited AI groupings, 30-day history &amp; sync across devices
        </p>
      </div>

      <div className="pw-plans" role="radiogroup" aria-label="Choose plan">
        <div className="plan" role="radio" aria-checked="false" tabIndex={0}
          onClick={() => handleUpgrade(false)}
          onKeyDown={(e) => e.key === 'Enter' && handleUpgrade(false)}>
          <p className="plan-period">Monthly</p>
          <p className="plan-price">$6<sub>/mo</sub></p>
          <p className="plan-save" style={{ opacity: 0 }}>—</p>
        </div>
        <div className="plan best" role="radio" aria-checked="true" tabIndex={0}
          onClick={() => handleUpgrade(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleUpgrade(true)}>
          <span className="plan-chip">BEST VALUE</span>
          <p className="plan-period">Annual</p>
          <p className="plan-price">$4<sub>/mo</sub></p>
          <p className="plan-save">Save 33% · $48/yr</p>
        </div>
      </div>

      <div className="pw-feats" role="list" aria-label="Pro features">
        {PRO_FEATURES.map((feat) => (
          <div key={feat} className="pf" role="listitem">
            <div className="pf-icon">{CHECKMARK}</div>
            <span className="pf-text">{feat}</span>
          </div>
        ))}
      </div>

      <div className="pw-cta-wrap">
        <button className="pw-cta" onClick={() => handleUpgrade(true)}>
          Upgrade to Pro · $48/year
        </button>
        <p className="pw-note">Cancel anytime · No hidden fees · 7-day free trial</p>
      </div>

      <p
        className="pw-skip"
        role="button"
        tabIndex={0}
        onClick={() => setScreen('default')}
        onKeyDown={(e) => e.key === 'Enter' && setScreen('default')}
      >
        Maybe later · resets tomorrow
      </p>
    </div>
  )
}

// =============================================================================
// SETTINGS SCREEN
// =============================================================================

export function SettingsScreen() {
  return (
    <div className="body">
      <div className="ss-lbl" id="ai-section">AI</div>
      <div className="sr" role="group" aria-labelledby="ai-section">
        <div>
          <p className="sr-label">Group language</p>
          <p className="sr-sub">Language for AI group names</p>
        </div>
        <span className="sr-val" role="button" tabIndex={0} aria-haspopup="listbox">
          English ›
        </span>
      </div>

      <div className="sr">
        <div>
          <p className="sr-label">Max groups</p>
          <p className="sr-sub">How many groups to create</p>
        </div>
        <span className="sr-val" role="button" tabIndex={0} aria-haspopup="listbox">
          Auto ›
        </span>
      </div>

      <div className="sr">
        <div>
          <p className="sr-label">Auto-group on startup</p>
          <p className="sr-sub">Group tabs when Chrome opens</p>
        </div>
        <ToggleSwitch id="auto-group" checked={false} onChange={() => {}} />
      </div>

      <div className="ss-lbl">Appearance</div>

      <div className="sr">
        <div>
          <p className="sr-label">Theme</p>
          <p className="sr-sub">Light, dark, or follow system</p>
        </div>
        <span className="sr-val" role="button" tabIndex={0}>
          System ›
        </span>
      </div>

      <div className="sr">
        <div>
          <p className="sr-label">Show tab count badge</p>
          <p className="sr-sub">Number on toolbar icon</p>
        </div>
        <ToggleSwitch id="show-badge" checked={true} onChange={() => {}} />
      </div>

      <div className="ss-lbl">Account</div>

      <div className="sr">
        <div>
          <p className="sr-label">Upgrade to Pro</p>
          <p className="sr-sub">$6/mo or $48/yr · 7-day trial</p>
        </div>
        <span
          className="sr-val action"
          role="button"
          tabIndex={0}
          onClick={() => chrome.tabs.create({ url: 'https://keeply.app/pricing' })}
          onKeyDown={(e) => e.key === 'Enter' && chrome.tabs.create({ url: 'https://keeply.app/pricing' })}
        >
          Upgrade ↗
        </span>
      </div>

      <div className="sr">
        <div>
          <p className="sr-label">Keeply v1.0.0</p>
          <p className="sr-sub">keeply.app · Send feedback</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// TOGGLE SWITCH sub-component
// =============================================================================

interface ToggleSwitchProps {
  readonly id: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
}

function ToggleSwitch({ id, checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      className={`toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-label={checked ? 'Enabled' : 'Disabled'}
    />
  )
}
