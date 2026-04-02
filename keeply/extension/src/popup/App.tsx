import { useEffect } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { useSettingsStore } from '@/popup/stores/settingsStore'
import { DefaultScreen } from '@/popup/components/DefaultScreen/DefaultScreen'
import { LoadingScreen } from '@/popup/components/LoadingScreen/LoadingScreen'
import { ResultsScreen } from '@/popup/components/ResultsScreen/ResultsScreen'
import { PaywallScreen } from '@/popup/components/PaywallScreen/PaywallScreen'
import { SettingsScreen } from '@/popup/components/SettingsScreen/SettingsScreen'
import { Header } from '@/popup/components/Header/Header'
import type { BackgroundMessage, PopupMessage } from '@/shared/types'

// =============================================================================
// APP — Screen Router
// =============================================================================

function sendMessage(msg: BackgroundMessage): Promise<PopupMessage> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response: PopupMessage) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(response)
    })
  })
}

export function App() {
  const screen = useTabStore((s) => s.screen)
  const { setStatus } = useUsageStore()
  const { setSettings } = useSettingsStore()

  // Инициализация при открытии popup
  useEffect(() => {
    void (async () => {
      try {
        const [usageResp, settingsResp] = await Promise.all([
          sendMessage({ type: 'GET_USAGE' }),
          sendMessage({ type: 'GET_SETTINGS' }),
        ])
        if (usageResp.type === 'USAGE_RESPONSE') setStatus(usageResp.payload)
        if (settingsResp.type === 'SETTINGS_RESPONSE') setSettings(settingsResp.payload)
      } catch (e) {
        console.error('[Keeply] Init failed:', e)
      }
    })()
  }, [setStatus, setSettings])

  return (
    <div className="popup">
      <Header />
      {screen === 'default' && <DefaultScreen />}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'results' && <ResultsScreen />}
      {screen === 'paywall' && <PaywallScreen />}
      {screen === 'settings' && <SettingsScreen />}
    </div>
  )
}
