import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService } from '@/shared/services/storageService'
import type { IStorageAdapter } from '@/shared/services/storageService'

// =============================================================================
// MOCK ADAPTER — in-memory storage для тестов
// =============================================================================

function createMockAdapter(initial: Record<string, unknown> = {}): IStorageAdapter {
  const store = { ...initial }
  return {
    get: vi.fn(async (key: string) => ({ [key]: store[key] })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(store, items)
    }),
    remove: vi.fn(async (key: string) => {
      delete store[key]
    }),
  }
}

function createFailingAdapter(): IStorageAdapter {
  return {
    get: vi.fn().mockRejectedValue(new Error('Storage unavailable')),
    set: vi.fn().mockRejectedValue(new Error('Storage unavailable')),
    remove: vi.fn().mockRejectedValue(new Error('Storage unavailable')),
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('StorageService.get', () => {
  it('returns value when key exists', async () => {
    const adapter = createMockAdapter({ myKey: { foo: 'bar' } })
    const service = new StorageService(adapter)

    const result = await service.get<{ foo: string }>('myKey')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ foo: 'bar' })
  })

  it('returns null when key does not exist', async () => {
    const adapter = createMockAdapter({})
    const service = new StorageService(adapter)

    const result = await service.get('nonExistent')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toBeNull()
  })

  it('returns error when storage fails', async () => {
    const service = new StorageService(createFailingAdapter())
    const result = await service.get('anyKey')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('Storage unavailable')
  })

  it('calls adapter.get with correct key', async () => {
    const adapter = createMockAdapter()
    const service = new StorageService(adapter)

    await service.get('testKey')
    expect(adapter.get).toHaveBeenCalledWith('testKey')
  })
})

describe('StorageService.set', () => {
  it('stores value successfully', async () => {
    const adapter = createMockAdapter()
    const service = new StorageService(adapter)

    const result = await service.set('myKey', { value: 42 })
    expect(result.ok).toBe(true)
    expect(adapter.set).toHaveBeenCalledWith({ myKey: { value: 42 } })
  })

  it('returns error when storage fails', async () => {
    const service = new StorageService(createFailingAdapter())
    const result = await service.set('key', 'value')

    expect(result.ok).toBe(false)
  })

  it('can store different types', async () => {
    const adapter = createMockAdapter()
    const service = new StorageService(adapter)

    await service.set('string', 'hello')
    await service.set('number', 42)
    await service.set('array', [1, 2, 3])
    await service.set('object', { a: 1 })

    expect(adapter.set).toHaveBeenCalledTimes(4)
  })
})

describe('StorageService.remove', () => {
  it('removes value successfully', async () => {
    const adapter = createMockAdapter({ toDelete: 'value' })
    const service = new StorageService(adapter)

    const result = await service.remove('toDelete')
    expect(result.ok).toBe(true)
    expect(adapter.remove).toHaveBeenCalledWith('toDelete')
  })

  it('returns error when storage fails', async () => {
    const service = new StorageService(createFailingAdapter())
    const result = await service.remove('key')
    expect(result.ok).toBe(false)
  })
})

describe('StorageService.getOrDefault', () => {
  it('returns stored value when it exists', async () => {
    const adapter = createMockAdapter({ key: 'stored' })
    const service = new StorageService(adapter)

    const result = await service.getOrDefault('key', 'default')
    expect(result).toBe('stored')
  })

  it('returns default when key is missing', async () => {
    const adapter = createMockAdapter({})
    const service = new StorageService(adapter)

    const result = await service.getOrDefault('missing', 'fallback')
    expect(result).toBe('fallback')
  })

  it('returns default when storage fails', async () => {
    const service = new StorageService(createFailingAdapter())
    const result = await service.getOrDefault('key', { default: true })
    expect(result).toEqual({ default: true })
  })

  it('works with complex types', async () => {
    const defaultSettings = { theme: 'light', limit: 5 }
    const adapter = createMockAdapter({})
    const service = new StorageService(adapter)

    const result = await service.getOrDefault('settings', defaultSettings)
    expect(result).toEqual(defaultSettings)
  })

  it('does not call set on default return', async () => {
    const adapter = createMockAdapter({})
    const service = new StorageService(adapter)

    await service.getOrDefault('key', 'default')
    expect(adapter.set).not.toHaveBeenCalled()
  })
})
