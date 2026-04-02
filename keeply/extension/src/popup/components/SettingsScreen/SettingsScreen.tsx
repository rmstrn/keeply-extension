import { useState, useEffect, useRef } from 'react'
import { applyTheme } from '@/shared/utils/themeUtils'
import { useTheme } from '@/popup/hooks/useTheme'
import { useSettingsStore } from '@/popup/stores/settingsStore'
import { THEMES } from '@/shared/constants/theme'
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
  const theme = useTheme()
  const updateSetting = useSettingsStore((s) => s.updateSetting)
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
    updateSetting('theme', newTheme)
    applyTheme(newTheme)

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
          <p className="sr-sub">Choose a color scheme</p>
        </div>
        <select
          className="theme-select"
          value={currentTheme === 'dark' ? 'soft-jade' : currentTheme}
          onChange={(e) => handleThemeChange(e.target.value as Theme)}
          style={{ background: theme.surface, color: theme.text, borderColor: theme.border }}
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
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
        <div className="sr" style={{ borderTop: `1px dashed ${theme.border}`, marginTop: 8 }}>
          <div>
            <p className="sr-label" style={{ color: theme.danger }}>Dev Tools</p>
            <p className="sr-sub">Reset AI usage counter</p>
          </div>
          <button
            className="sr-val"
            style={{ color: theme.danger }}
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
