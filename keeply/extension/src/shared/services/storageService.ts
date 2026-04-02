import { ok, err } from '@/shared/types'
import type { Result } from '@/shared/types'

// =============================================================================
// STORAGE SERVICE
// Chrome storage.local abstraction с полной типизацией
// =============================================================================

/**
 * Интерфейс для dependency injection в тестах
 * Позволяет мокать chrome.storage.local без браузера
 */
export interface IStorageAdapter {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(key: string): Promise<void>
}

/**
 * Реальный адаптер для Chrome Storage
 */
export class ChromeStorageAdapter implements IStorageAdapter {
  async get(key: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(result)
        }
      })
    })
  }

  async set(items: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }
}

/**
 * Type-safe Storage Service
 * Используем Result<T> вместо throw — явная обработка ошибок
 */
export class StorageService {
  constructor(private readonly adapter: IStorageAdapter) {}

  async get<T>(key: string): Promise<Result<T | null>> {
    try {
      const result = await this.adapter.get(key)
      const value = result[key]
      return ok(value !== undefined ? (value as T) : null)
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async set<T>(key: string, value: T): Promise<Result<void>> {
    try {
      await this.adapter.set({ [key]: value })
      return ok(undefined)
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async remove(key: string): Promise<Result<void>> {
    try {
      await this.adapter.remove(key)
      return ok(undefined)
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)))
    }
  }

  /**
   * Удобный метод: get с fallback если значения нет
   */
  async getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
    const result = await this.get<T>(key)
    if (!result.ok || result.value === null) return defaultValue
    return result.value
  }
}

// Singleton для production использования
export const storageService = new StorageService(new ChromeStorageAdapter())
