import { TabGrouper } from './tabGrouper'
import { storageService } from '@/shared/services/storageService'
import { getUsageStatus, createInitialUsage } from '@/shared/utils/usageUtils'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '@/shared/constants'
import type { BackgroundMessage, PopupMessage, KeeplyGroup, UsageState, Settings } from '@/shared/types'

const grouper = new TabGrouper(storageService)

// =============================================================================
// TYPED MESSAGE HANDLER
// =============================================================================

export function handleMessage(
  message: BackgroundMessage,
  sendResponse: (response: PopupMessage) => void,
): void {
  switch (message.type) {
    case 'GROUP_TABS':
      handleGroupTabs(sendResponse)
      break

    case 'GET_USAGE':
      handleGetUsage(sendResponse)
      break

    case 'GET_SETTINGS':
      handleGetSettings(sendResponse)
      break

    case 'SAVE_SETTINGS':
      handleSaveSettings(message.payload, sendResponse)
      break

    case 'UNDO_GROUPING':
      // TODO: implement undo logic
      break

    case 'GET_KEEPLY_GROUPS':
      handleGetKeplyGroups(sendResponse)
      break

    case 'SAVE_KEEPLY_GROUPS':
      handleSaveKeplyGroups(message.payload, sendResponse)
      break
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function handleGroupTabs(
  sendResponse: (response: PopupMessage) => void,
): Promise<void> {
  sendResponse({ type: 'GROUPING_STARTED' })

  const result = await grouper.groupTabs()

  if (result.ok) {
    sendResponse({ type: 'GROUPING_COMPLETE', payload: result.value })
  } else {
    sendResponse({
      type: 'GROUPING_ERROR',
      payload: { message: result.error.message },
    })
  }
}

async function handleGetUsage(
  sendResponse: (response: PopupMessage) => void,
): Promise<void> {
  const usage = await storageService.getOrDefault<UsageState>(
    STORAGE_KEYS.USAGE,
    createInitialUsage(),
  )
  sendResponse({ type: 'USAGE_RESPONSE', payload: getUsageStatus(usage) })
}

async function handleGetSettings(
  sendResponse: (response: PopupMessage) => void,
): Promise<void> {
  const settings = await storageService.getOrDefault<Settings>(
    STORAGE_KEYS.SETTINGS,
    DEFAULT_SETTINGS,
  )
  sendResponse({ type: 'SETTINGS_RESPONSE', payload: settings })
}

async function handleSaveSettings(
  partial: Partial<Settings>,
  sendResponse: (response: PopupMessage) => void,
): Promise<void> {
  const current = await storageService.getOrDefault<Settings>(
    STORAGE_KEYS.SETTINGS,
    DEFAULT_SETTINGS,
  )
  const updated: Settings = { ...current, ...partial }
  await storageService.set(STORAGE_KEYS.SETTINGS, updated)
  sendResponse({ type: 'SETTINGS_RESPONSE', payload: updated })
}

async function handleGetKeplyGroups(
  sendResponse: (response: PopupMessage) => void,
): Promise<void> {
  const groups = await grouper.getGroups()
  sendResponse({ type: 'KEEPLY_GROUPS_RESPONSE', payload: groups })
}

async function handleSaveKeplyGroups(
  groups: readonly KeeplyGroup[],
  sendResponse: (response: PopupMessage) => void,
): Promise<void> {
  await grouper.saveGroups(groups)
  sendResponse({ type: 'KEEPLY_GROUPS_RESPONSE', payload: [...groups] })
}
