import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

// =============================================================================
// CHROME API GLOBAL MOCK
// Используется во всех тестах автоматически
// =============================================================================

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    onCreated: { addListener: vi.fn(), removeListener: vi.fn() },
    onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
    onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  windows: {
    update: vi.fn(),
    WINDOW_ID_CURRENT: -2,
  },
  runtime: {
    lastError: null as chrome.runtime.LastError | null,
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
  },
}

// Глобальный объект chrome
vi.stubGlobal('chrome', chromeMock)

// Сброс между тестами
afterEach(() => {
  vi.clearAllMocks()
  chromeMock.runtime.lastError = null
})

export { chromeMock }
