export const UNGROUPED_ID = 'ungrouped'

export interface DragData {
  readonly tabId: number
  readonly url: string
  readonly sourceGroupId: string
}

export function parseDragData(e: React.DragEvent): DragData | null {
  try {
    const data = JSON.parse(e.dataTransfer.getData('text/plain')) as DragData
    if (data.tabId && data.url) return data
  } catch { /* ignore non-JSON drag data */ }
  return null
}

export function makeDragData(tabId: number, url: string, sourceGroupId: string): string {
  return JSON.stringify({ tabId, url, sourceGroupId } satisfies DragData)
}
