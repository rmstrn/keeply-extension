import { useCallback } from 'react'
import { useTabStore } from '@/popup/stores/tabStore'
import { useUsageStore } from '@/popup/stores/usageStore'
import { sendMessage } from '@/shared/utils/chromeUtils'

export function useTabGroups() {
  const { startGrouping, setResult, setError, triggerRefresh } = useTabStore()
  const { setStatus } = useUsageStore()

  const groupTabs = useCallback(async () => {
    startGrouping()

    try {
      const response = await sendMessage({ type: 'GROUP_TABS' })

      switch (response.type) {
        case 'GROUPING_COMPLETE':
          setResult(response.payload)
          triggerRefresh()
          await refreshUsage()
          break

        case 'GROUPING_ERROR':
          setError(response.payload.message)
          break

        default:
          setError('Unexpected response from background')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }, [startGrouping, setResult, setError, triggerRefresh])

  const refreshUsage = useCallback(async () => {
    try {
      const response = await sendMessage({ type: 'GET_USAGE' })
      if (response.type === 'USAGE_RESPONSE') {
        setStatus(response.payload)
      }
    } catch {
      // Не критично — игнорируем ошибку обновления usage
    }
  }, [setStatus])

  return { groupTabs, refreshUsage }
}
