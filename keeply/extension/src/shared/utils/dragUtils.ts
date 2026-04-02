export const UNGROUPED_ID = 'ungrouped'

export interface DragTab {
  readonly tabId: number
  readonly url: string
}

export interface DragData {
  readonly tabs: DragTab[]
  readonly sourceGroupId: string
}

// Legacy single-tab format compat
interface LegacyDragData {
  readonly tabId: number
  readonly url: string
  readonly sourceGroupId: string
}

export function parseDragData(e: React.DragEvent): DragData | null {
  try {
    const raw = JSON.parse(e.dataTransfer.getData('text/plain'))
    // New multi-tab format
    if (raw.tabs && Array.isArray(raw.tabs)) return raw as DragData
    // Legacy single-tab format
    const legacy = raw as LegacyDragData
    if (legacy.tabId !== undefined && legacy.url) {
      return { tabs: [{ tabId: legacy.tabId, url: legacy.url }], sourceGroupId: legacy.sourceGroupId }
    }
  } catch { /* ignore non-JSON drag data */ }
  return null
}

export function makeDragData(tabs: DragTab[], sourceGroupId: string): string {
  return JSON.stringify({ tabs, sourceGroupId } satisfies DragData)
}

export function makeSingleDragData(tabId: number, url: string, sourceGroupId: string): string {
  return makeDragData([{ tabId, url }], sourceGroupId)
}
