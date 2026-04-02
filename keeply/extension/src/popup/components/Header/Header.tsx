import { useTabStore } from '@/popup/stores/tabStore'

// =============================================================================
// HEADER COMPONENT
// =============================================================================

export function Header() {
  const screen = useTabStore((s) => s.screen)
  const setScreen = useTabStore((s) => s.setScreen)
  const isPro = false // TODO: подключить proStore когда будет Stripe

  const showBack = screen === 'settings'

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

        {!showBack && (
          <button
            className="settings-btn"
            onClick={() => setScreen('settings')}
            aria-label="Settings"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.92c.04-.32.07-.64.07-.98s-.03-.67-.07-1l2.16-1.63c.19-.15.24-.42.12-.64l-2.05-3.55c-.12-.22-.39-.3-.61-.22l-2.55 1.03c-.52-.4-1.08-.73-1.7-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.62.25-1.18.58-1.7.98L4.88 5.02c-.23-.08-.49 0-.61.22L2.22 8.79c-.12.21-.07.49.12.64L4.5 11.06c-.04.33-.07.65-.07 1s.03.67.07 1L2.34 14.7c-.19.15-.24.42-.12.64l2.05 3.55c.12.22.39.3.61.22l2.55-1.03c.52.4 1.08.73 1.7.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.62-.25 1.18-.58 1.7-.98l2.55 1.03c.23.08.49 0 .61-.22l2.05-3.55c.12-.21.07-.49-.12-.64l-2.16-1.64z" />
            </svg>
          </button>
        )}

        {showBack && (
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
