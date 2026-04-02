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

export function SettingsScreen() {
  const openUpgrade = () => {
    chrome.tabs.create({ url: 'https://keeply.app/pricing' })
  }

  return (
    <div className="body">
      <div className="ss-lbl">AI</div>

      <div className="sr">
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
          onClick={openUpgrade}
          onKeyDown={(e) => e.key === 'Enter' && openUpgrade()}
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

      {import.meta.env.DEV && (
        <div className="sr" style={{ borderTop: '1px dashed #DDDDD8', marginTop: 8 }}>
          <div>
            <p className="sr-label" style={{ color: '#C0392B' }}>Dev Tools</p>
            <p className="sr-sub">Only visible in development</p>
          </div>
          <button
            className="sr-val"
            style={{ color: '#C0392B' }}
            onClick={() => {
              chrome.storage.local.remove('keeply_usage', () => {
                window.location.reload()
              })
            }}
          >
            Reset limit
          </button>
        </div>
      )}
    </div>
  )
}
