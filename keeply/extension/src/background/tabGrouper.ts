import { extractGroupableTabs, parseAIResponse } from '@/shared/utils/tabUtils'
import { buildPrompt } from '@/shared/utils/promptBuilder'
import { recordUsage, getUsageStatus, createInitialUsage } from '@/shared/utils/usageUtils'
import { ok, err } from '@/shared/types'
import { STORAGE_KEYS, EDGE_FUNCTION_URL, AI_REQUEST_TIMEOUT_MS, MAX_RECENT_GROUPS } from '@/shared/constants'
import type {
  GroupingResult,
  KeeplyGroup,
  RecentGroup,
  TabInfo,
  UsageState,
  Settings,
  Result,
} from '@/shared/types'
import type { StorageService } from '@/shared/services/storageService'
import { DEFAULT_SETTINGS } from '@/shared/constants'

// =============================================================================
// AI CLIENT
// =============================================================================

interface AIGroupResponse {
  readonly content: string
}

export async function callAIProxy(
  systemPrompt: string,
  userMessage: string,
  proToken: string | null,
  signal: AbortSignal,
): Promise<Result<string>> {
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(proToken ? { Authorization: `Bearer ${proToken}` } : {}),
      },
      body: JSON.stringify({ systemPrompt, userMessage }),
      signal,
    })

    if (!response.ok) {
      return err(new Error(`Edge Function error: ${response.status}`))
    }

    const data = (await response.json()) as AIGroupResponse
    return ok(data.content)
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return err(new Error('Request timed out'))
    }
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

// =============================================================================
// TAB GROUPER — orchestrates AI grouping, saves to Keeply storage only
// =============================================================================

export class TabGrouper {
  constructor(private readonly storage: StorageService) {}

  async groupTabs(): Promise<Result<GroupingResult>> {
    // 1. Check usage limit
    const usageResult = await this.checkAndRecordUsage()
    if (!usageResult.ok) return usageResult

    // 2. Fetch all open tabs
    const tabsResult = await this.fetchTabs()
    if (!tabsResult.ok) return tabsResult

    const tabs = tabsResult.value
    if (tabs.length === 0) {
      return err(new Error('No groupable tabs found'))
    }

    // 3. Get settings
    const settings = await this.storage.getOrDefault<Settings>(
      STORAGE_KEYS.SETTINGS,
      DEFAULT_SETTINGS,
    )

    // 4. Build prompt
    const { systemPrompt, userMessage } = buildPrompt(tabs, {
      language: settings.language,
      maxGroups: settings.maxGroups,
    })

    // 5. Call AI
    const proToken = await this.storage.getOrDefault<string | null>(
      STORAGE_KEYS.PRO_TOKEN,
      null,
    )

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

    const aiResult = await callAIProxy(systemPrompt, userMessage, proToken, controller.signal)
    clearTimeout(timeout)

    if (!aiResult.ok) return aiResult

    // 6. Parse AI response
    const parseResult = parseAIResponse(aiResult.value, tabs)
    if (!parseResult.ok) return parseResult

    // 7. Save groups to Keeply storage (no Chrome tab groups API)
    const keeplyGroups: KeeplyGroup[] = parseResult.value.groups.map((g) => ({
      id: crypto.randomUUID(),
      name: g.name,
      color: g.color,
      tabIds: [...g.tabIds],
    }))
    await this.storage.set(STORAGE_KEYS.KEEPLY_GROUPS, keeplyGroups)

    // 8. Save to history
    await this.saveRecentGroup(parseResult.value)

    return ok(parseResult.value)
  }

  async getGroups(): Promise<KeeplyGroup[]> {
    return this.storage.getOrDefault<KeeplyGroup[]>(STORAGE_KEYS.KEEPLY_GROUPS, [])
  }

  async saveGroups(groups: readonly KeeplyGroup[]): Promise<void> {
    await this.storage.set(STORAGE_KEYS.KEEPLY_GROUPS, [...groups])
  }

  private async checkAndRecordUsage(): Promise<Result<void>> {
    const currentUsage = await this.storage.getOrDefault<UsageState>(
      STORAGE_KEYS.USAGE,
      createInitialUsage(),
    )

    const status = getUsageStatus(currentUsage)

    if (status.isLimitReached) {
      return err(new Error('FREE_LIMIT_REACHED'))
    }

    const newUsage = recordUsage(currentUsage)
    return this.storage.set(STORAGE_KEYS.USAGE, newUsage)
  }

  private async fetchTabs(): Promise<Result<TabInfo[]>> {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (chromeTabs) => {
        if (chrome.runtime.lastError) {
          resolve(err(new Error(chrome.runtime.lastError.message)))
          return
        }
        const tabs = extractGroupableTabs(chromeTabs)
        resolve(ok(tabs))
      })
    })
  }

  private async saveRecentGroup(result: GroupingResult): Promise<void> {
    const recentGroups = await this.storage.getOrDefault<RecentGroup[]>(
      STORAGE_KEYS.RECENT_GROUPS,
      [],
    )

    const newEntry: RecentGroup = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      groups: result.groups,
      totalTabs: result.totalTabsGrouped,
    }

    const updated = [newEntry, ...recentGroups].slice(0, MAX_RECENT_GROUPS)
    await this.storage.set(STORAGE_KEYS.RECENT_GROUPS, updated)

    const totalTabsGrouped = await this.storage.getOrDefault<number>(
      STORAGE_KEYS.TOTAL_TABS_GROUPED,
      0,
    )
    await this.storage.set(
      STORAGE_KEYS.TOTAL_TABS_GROUPED,
      totalTabsGrouped + result.totalTabsGrouped,
    )
  }
}
