import { describe, it, expect } from 'vitest'
import {
  buildSystemPrompt,
  buildUserMessage,
  buildPrompt,
} from '@/shared/utils/promptBuilder'
import type { TabInfo } from '@/shared/types'

// =============================================================================
// PROMPT BUILDER TESTS
// =============================================================================

const mockTabs: TabInfo[] = [
  { id: 1, title: 'Linear — Project Board', url: 'https://linear.app/board' },
  { id: 2, title: 'Notion — Team Wiki', url: 'https://notion.so/team' },
  { id: 3, title: 'Amazon — Cart', url: 'https://amazon.com/cart' },
]

describe('buildSystemPrompt', () => {
  it('includes auto group count instruction', () => {
    const prompt = buildSystemPrompt({ language: 'en', maxGroups: 'auto' })
    expect(prompt).toContain('between 2 and 8')
  })

  it('includes exact group count when specified', () => {
    const prompt = buildSystemPrompt({ language: 'en', maxGroups: 5 })
    expect(prompt).toContain('exactly 5')
  })

  it('includes English language instruction by default', () => {
    const prompt = buildSystemPrompt({ language: 'en', maxGroups: 'auto' })
    expect(prompt).toContain('English')
  })

  it('includes Russian language instruction when set', () => {
    const prompt = buildSystemPrompt({ language: 'ru', maxGroups: 'auto' })
    expect(prompt).toContain('Russian')
  })

  it('returns valid JSON instruction', () => {
    const prompt = buildSystemPrompt({ language: 'en', maxGroups: 'auto' })
    expect(prompt).toContain('JSON')
    expect(prompt).toContain('groups')
    expect(prompt).toContain('tabIndices')
  })

  it('lists all valid Chrome colors', () => {
    const prompt = buildSystemPrompt({ language: 'en', maxGroups: 'auto' })
    const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']
    colors.forEach((color) => {
      expect(prompt).toContain(color)
    })
  })

  it('instructs to return ONLY JSON (no markdown)', () => {
    const prompt = buildSystemPrompt({ language: 'en', maxGroups: 'auto' })
    expect(prompt.toLowerCase()).toContain('only')
    expect(prompt.toLowerCase()).toContain('json')
  })
})

describe('buildUserMessage', () => {
  it('includes tab count in message', () => {
    const message = buildUserMessage(mockTabs)
    expect(message).toContain('3')
  })

  it('includes all tab titles', () => {
    const message = buildUserMessage(mockTabs)
    expect(message).toContain('Linear — Project Board')
    expect(message).toContain('Notion — Team Wiki')
    expect(message).toContain('Amazon — Cart')
  })

  it('includes all tab URLs', () => {
    const message = buildUserMessage(mockTabs)
    expect(message).toContain('https://linear.app/board')
    expect(message).toContain('https://amazon.com/cart')
  })

  it('uses 0-based indices', () => {
    const message = buildUserMessage(mockTabs)
    expect(message).toContain('0.')
    expect(message).toContain('1.')
    expect(message).toContain('2.')
  })

  it('handles single tab', () => {
    const singleTab: TabInfo[] = [
      { id: 1, title: 'GitHub', url: 'https://github.com' },
    ]
    const message = buildUserMessage(singleTab)
    expect(message).toContain('1')
    expect(message).toContain('GitHub')
  })

  it('handles empty tabs array', () => {
    const message = buildUserMessage([])
    expect(message).toContain('0')
  })
})

describe('buildPrompt', () => {
  it('returns both systemPrompt and userMessage', () => {
    const result = buildPrompt(mockTabs, { language: 'en', maxGroups: 'auto' })
    expect(result).toHaveProperty('systemPrompt')
    expect(result).toHaveProperty('userMessage')
  })

  it('systemPrompt is a non-empty string', () => {
    const { systemPrompt } = buildPrompt(mockTabs, { language: 'en', maxGroups: 'auto' })
    expect(typeof systemPrompt).toBe('string')
    expect(systemPrompt.length).toBeGreaterThan(0)
  })

  it('userMessage contains tab information', () => {
    const { userMessage } = buildPrompt(mockTabs, { language: 'en', maxGroups: 'auto' })
    expect(userMessage).toContain('Linear')
  })
})
