import { tabCountLabel } from '@/shared/utils/chromeUtils'

interface TabCountBadgeProps {
  readonly count: number
}

export function TabCountBadge({ count }: TabCountBadgeProps) {
  return (
    <span className="tab-count-badge" aria-label={tabCountLabel(count)}>
      {tabCountLabel(count)}
    </span>
  )
}
