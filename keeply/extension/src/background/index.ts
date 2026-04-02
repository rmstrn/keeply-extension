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

// Typed message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Обрабатываем только сообщения от popup (не от content scripts)
  if (sender.tab) return false

  handleMessage(message, sendResponse)
  return true // Говорим Chrome что будем отвечать асинхронно
})

console.log('[Keeply] Service worker started')
