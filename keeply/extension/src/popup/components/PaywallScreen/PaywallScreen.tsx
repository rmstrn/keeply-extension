import { useTabStore } from '@/popup/stores/tabStore'
import { useTheme } from '@/popup/hooks/useTheme'

const PRO_FEATURES = [
  'Unlimited AI groupings every day',
  '30-day session history & restore',
  'Sync across all your devices',
  'Saved spaces up to 20',
] as const

export function PaywallScreen() {
  const setScreen = useTabStore((s) => s.setScreen)
  const theme = useTheme()

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
        <div
          className="plan"
          role="radio"
          aria-checked="false"
          tabIndex={0}
          onClick={() => handleUpgrade(false)}
          onKeyDown={(e) => e.key === 'Enter' && handleUpgrade(false)}
        >
          <p className="plan-period">Monthly</p>
          <p className="plan-price">
            $6<sub>/mo</sub>
          </p>
          <p className="plan-save" style={{ opacity: 0 }}>
            —
          </p>
        </div>
        <div
          className="plan best"
          role="radio"
          aria-checked="true"
          tabIndex={0}
          onClick={() => handleUpgrade(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleUpgrade(true)}
        >
          <span className="plan-chip">BEST VALUE</span>
          <p className="plan-period">Annual</p>
          <p className="plan-price">
            $4<sub>/mo</sub>
          </p>
          <p className="plan-save">Save 33% · $48/yr</p>
        </div>
      </div>

      <div className="pw-feats" role="list" aria-label="Pro features">
        {PRO_FEATURES.map((feat) => (
          <div key={feat} className="pf" role="listitem">
            <div className="pf-icon">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                <path
                  d="M1.5 4.5l2 2 4-4"
                  stroke={theme.primary}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
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
