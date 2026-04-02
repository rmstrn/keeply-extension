import { MIN_GROUPS, MAX_GROUPS } from '@/shared/constants'
import type { TabInfo, GroupLanguage, MaxGroups } from '@/shared/types'

// =============================================================================
// PROMPT BUILDER
// =============================================================================

interface PromptOptions {
  readonly language: GroupLanguage
  readonly maxGroups: MaxGroups
}

/**
 * Формирует system prompt для AI
 */
export function buildSystemPrompt(options: PromptOptions): string {
  const maxGroupsInstruction =
    options.maxGroups === 'auto'
      ? `between ${MIN_GROUPS} and ${MAX_GROUPS}`
      : `exactly ${options.maxGroups}`

  const languageInstruction =
    options.language === 'auto' || options.language === 'en'
      ? 'English'
      : options.language === 'ru'
        ? 'Russian'
        : 'English'

  return `You are a browser tab organizer. Given a list of open browser tabs, group them into logical categories.

Rules:
- Create ${maxGroupsInstruction} groups
- Group names must be short (1-3 words), in ${languageInstruction}
- Choose color from: "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"
- Every tab must appear in exactly one group (use its index)
- Prefer meaningful names: "React Docs" not "Development"
- Similar topics go together

Return ONLY valid JSON — no explanation, no markdown:
{"groups":[{"name":"string","color":"string","tabIndices":[0,1,2]}]}`
}

/**
 * Формирует user message с вкладками
 */
export function buildUserMessage(tabs: TabInfo[]): string {
  const tabList = tabs
    .map((tab, index) => `${index}. ${tab.title} — ${tab.url}`)
    .join('\n')

  return `Group these ${tabs.length} browser tabs:\n\n${tabList}`
}

/**
 * Полный промпт для API вызова
 */
export function buildPrompt(
  tabs: TabInfo[],
  options: PromptOptions,
): { systemPrompt: string; userMessage: string } {
  return {
    systemPrompt: buildSystemPrompt(options),
    userMessage: buildUserMessage(tabs),
  }
}
