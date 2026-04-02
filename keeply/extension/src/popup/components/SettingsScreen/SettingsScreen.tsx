import { useState, useEffect, useRef } from 'react'
import type { Theme } from '@/shared/types'

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
  const [showDev, setShowDev] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<Theme>('system')
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      chrome.storage.local.get('keeply_settings', (result) => {
        if (chrome.runtime.lastError) return
        const settings = result['keeply_settings'] as { theme?: Theme } | undefined
        if (settings?.theme) setCurrentTheme(settings.theme)
      })
    } catch {
      // Extension not loaded properly
    }
  }, [])

  const openUpgrade = () => {
    chrome.tabs.create({ url: 'https://keeply.app/pricing' })
  }

  const handleThemeChange = (newTheme: Theme) => {
    setCurrentTheme(newTheme)

    // Apply immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    }

    // Save to storage
    try {
      chrome.storage.local.get('keeply_settings', (result) => {
        if (chrome.runtime.lastError) return
        const updated = { ...(result['keeply_settings'] as Record<string, unknown> ?? {}), theme: newTheme }
        chrome.storage.local.set({ keeply_settings: updated })
      })
    } catch {
      // Extension not loaded properly
    }
  }

  const handleVersionTap = () => {
    tapCountRef.current += 1
    if (tapCountRef.current >= 5) {
      setShowDev((d) => !d)
      tapCountRef.current = 0
    }
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 2000)
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
        <div className="theme-picker">
          {(['light', 'system', 'dark'] as const).map((t) => (
            <button
              key={t}
              className={`theme-btn${currentTheme === t ? ' active' : ''}`}
              onClick={() => handleThemeChange(t)}
              aria-label={t}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
            >
              {t === 'light' ? '\u2600' : t === 'dark' ? '\u263E' : '\u2699'}
            </button>
          ))}
        </div>
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

      <div className="sr" style={{ cursor: 'default' }} onClick={handleVersionTap}>
        <div>
          <p className="sr-label">Keeply v1.0.0</p>
          <p className="sr-sub">keeply.app · Send feedback</p>
        </div>
      </div>

      {showDev && (
        <div className="sr" style={{ borderTop: '1px dashed #DDDDD8', marginTop: 8 }}>
          <div>
            <p className="sr-label" style={{ color: '#C0392B' }}>Dev Tools</p>
            <p className="sr-sub">Reset AI usage counter</p>
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
