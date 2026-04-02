import type { BackgroundMessage, PopupMessage } from '@/shared/types'

// =============================================================================
// CHROME API WRAPPERS
// Centralized utilities for chrome.* API calls with error handling
// =============================================================================

/**
 * Send a typed message to the background service worker
 */
export function sendMessage(message: BackgroundMessage): Promise<PopupMessage> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: PopupMessage) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(response)
    })
  })
}

/**
 * URL prefixes that are not groupable (internal Chrome pages)
 */
const SKIP_PREFIXES = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'data:'] as const

/**
 * Check if a URL belongs to a groupable (non-internal) tab
 */
export function isGroupableUrl(url: string | undefined): boolean {
  if (!url) return false
  return !SKIP_PREFIXES.some((p) => url.startsWith(p))
}

/**
 * Returns "1 tab" or "N tabs" with correct pluralization
 */
export function tabCountLabel(n: number): string {
  return n === 1 ? '1 tab' : `${n} tabs`
}
