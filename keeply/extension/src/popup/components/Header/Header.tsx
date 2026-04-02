import { useTabStore } from '@/popup/stores/tabStore'

// =============================================================================
// HEADER COMPONENT
// =============================================================================

export function Header() {
  const screen = useTabStore((s) => s.screen)
  const setScreen = useTabStore((s) => s.setScreen)
  const isPro = false // TODO: подключить proStore когда будет Stripe

  const isSettings = screen === 'settings'

  return (
    <header className="hdr">
      <div className="logo">
        <div className="logo-box" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="6" height="4.5" rx="1.3" fill="white" fillOpacity=".5" />
            <rect x="9" y="1" width="6" height="4.5" rx="1.3" fill="white" fillOpacity=".5" />
            <rect x="1" y="7" width="14" height="8" rx="1.5" fill="white" />
          </svg>
        </div>
        <span className="logo-name">Keeply</span>
      </div>

      <div className="hdr-right">
        <span className={isPro ? 'pill pill-pro' : 'pill pill-free'}>
          {isPro ? 'PRO' : 'FREE'}
        </span>

        {!isSettings && (
          <button
            className="settings-btn"
            onClick={() => setScreen('settings')}
            aria-label="Settings"
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M7 1.5v1.3M7 11.2v1.3M1.5 7h1.3M11.2 7h1.3M3.2 3.2l.9.9M9.9 9.9l.9.9M3.2 10.8l.9-.9M9.9 4.1l.9-.9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        {isSettings && (
          <button
            className="settings-btn"
            onClick={() => setScreen('default')}
            aria-label="Back"
            title="Back"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M9 2L4 7l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
