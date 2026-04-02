import { handleMessage } from './messageHandler'
import { storageService } from '@/shared/services/storageService'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '@/shared/constants'

// =============================================================================
// SERVICE WORKER ENTRY POINT
// =============================================================================

// Инициализация при установке расширения
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await storageService.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
    console.log('[Keeply] Extension installed, settings initialized')
  }
})

// Migrate old tabIds format → tabs (URL snapshots)
async function migrateGroupsIfNeeded(): Promise<void> {
  const raw = await storageService.getOrDefault<Record<string, unknown>[]>(STORAGE_KEYS.KEEPLY_GROUPS, [])
  if (raw.length === 0) return
  // Detect old format: has tabIds array but no tabs array
  if (!Array.isArray((raw[0] as Record<string, unknown>)['tabIds'])) return
  if (Array.isArray((raw[0] as Record<string, unknown>)['tabs'])) return

  const chromeTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({}, (tabs) => resolve(tabs ?? []))
  })
  const tabMap = new Map(chromeTabs.filter((t) => t.id).map((t) => [t.id!, t]))

  const migrated = raw.map((g) => {
    const tabIds = (g['tabIds'] as number[] | undefined) ?? []
    return {
      ...g,
      tabs: tabIds
        .map((id) => {
          const ct = tabMap.get(id)
          return ct?.url
            ? { url: ct.url, title: ct.title ?? '', favIconUrl: ct.favIconUrl, tabId: id }
            : null
        })
        .filter(Boolean),
      tabIds: undefined,
    }
  })

  await storageService.set(STORAGE_KEYS.KEEPLY_GROUPS, migrated)
  console.log('[Keeply] Migrated groups from tabIds to URL snapshots')
}

void migrateGroupsIfNeeded()

// Typed message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Обрабатываем только сообщения от popup (не от content scripts)
  if (sender.tab) return false

  handleMessage(message, sendResponse)
  return true // Говорим Chrome что будем отвечать асинхронно
})

console.log('[Keeply] Service worker started')
