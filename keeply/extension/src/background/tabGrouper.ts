import { extractGroupableTabs, parseAIResponse } from '@/shared/utils/tabUtils'
import { buildPrompt } from '@/shared/utils/promptBuilder'
import { recordUsage, getUsageStatus, createInitialUsage } from '@/shared/utils/usageUtils'
import { ok, err } from '@/shared/types'
import { STORAGE_KEYS, EDGE_FUNCTION_URL, AI_REQUEST_TIMEOUT_MS, MAX_RECENT_GROUPS } from '@/shared/constants'
import type {
  GroupingResult,
  RecentGroup,
  TabGroup,
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

/**
 * Вызывает Edge Function прокси
 * Отдельная функция для тестирования через мок
 */
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
// TAB GROUPER — оркестрация всего флоу
// =============================================================================

export class TabGrouper {
  constructor(private readonly storage: StorageService) {}

  /**
   * Главный метод: читает вкладки → вызывает AI → применяет группы
   */
  async groupTabs(): Promise<Result<GroupingResult>> {
    // 1. Проверяем лимит
    const usageResult = await this.checkAndRecordUsage()
    if (!usageResult.ok) return usageResult

    // 2. Читаем все вкладки
    const tabsResult = await this.fetchTabs()
    if (!tabsResult.ok) return tabsResult

    const tabs = tabsResult.value
    if (tabs.length === 0) {
      return err(new Error('No groupable tabs found'))
    }

    // 3. Получаем настройки
    const settings = await this.storage.getOrDefault<Settings>(
      STORAGE_KEYS.SETTINGS,
      DEFAULT_SETTINGS,
    )

    // 4. Строим промпт
    const { systemPrompt, userMessage } = buildPrompt(tabs, {
      language: settings.language,
      maxGroups: settings.maxGroups,
    })

    // 5. Вызываем AI
    const proToken = await this.storage.getOrDefault<string | null>(
      STORAGE_KEYS.PRO_TOKEN,
      null,
    )

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

    const aiResult = await callAIProxy(systemPrompt, userMessage, proToken, controller.signal)
    clearTimeout(timeout)

    if (!aiResult.ok) return aiResult

    // 6. Парсим ответ
    const parseResult = parseAIResponse(aiResult.value, tabs)
    if (!parseResult.ok) return parseResult

    // 7. Применяем группы в браузере
    const applyResult = await this.applyGroups(parseResult.value.groups)
    if (!applyResult.ok) return applyResult

    // 8. Сохраняем в историю и обновляем счётчик
    await this.saveRecentGroup(parseResult.value)

    return parseResult
  }

  /**
   * Снимает использование из free лимита
   */
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
    const saveResult = await this.storage.set(STORAGE_KEYS.USAGE, newUsage)
    return saveResult
  }

  /**
   * Читает все открытые вкладки через Chrome API
   */
  private async fetchTabs(): Promise<Result<import('@/shared/types').TabInfo[]>> {
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

  /**
   * Сохраняет результат группировки в историю и обновляет общий счётчик
   */
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

    // Increment total tabs grouped counter
    const totalTabsGrouped = await this.storage.getOrDefault<number>(
      STORAGE_KEYS.TOTAL_TABS_GROUPED,
      0,
    )
    await this.storage.set(
      STORAGE_KEYS.TOTAL_TABS_GROUPED,
      totalTabsGrouped + result.totalTabsGrouped,
    )
  }

  /**
   * Применяет группы через chrome.tabGroups API
   */
  private async applyGroups(groups: readonly TabGroup[]): Promise<Result<void>> {
    try {
      // Сначала убираем существующие группы
      const existingGroups = await new Promise<chrome.tabGroups.TabGroup[]>((resolve) => {
        chrome.tabGroups.query({}, resolve)
      })

      for (const existingGroup of existingGroups) {
        await new Promise<void>((resolve) => {
          chrome.tabs.ungroup(
            existingGroup.id ? [existingGroup.id] : [],
            resolve,
          )
        })
      }

      // Применяем новые группы
      for (const group of groups) {
        const groupId = await new Promise<number>((resolve, reject) => {
          chrome.tabs.group({ tabIds: [...group.tabIds] }, (id) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve(id)
            }
          })
        })

        await new Promise<void>((resolve, reject) => {
          chrome.tabGroups.update(
            groupId,
            { title: group.name, color: group.color, collapsed: false },
            () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else {
                resolve()
              }
            },
          )
        })
      }

      return ok(undefined)
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)))
    }
  }
}
