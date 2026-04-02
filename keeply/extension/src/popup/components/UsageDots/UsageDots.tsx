import type { UsageStatus } from '@/shared/types'

// =============================================================================
// USAGE DOTS COMPONENT
// ●●●○○ визуализация free uses
// =============================================================================

interface UsageDotsProps {
  readonly status: UsageStatus
}

export function UsageDots({ status }: UsageDotsProps) {
  const { used, limit, remaining, isLimitReached } = status

  return (
    <div className="usage-wrap">
      <div className="usage-top">
        <span className="usage-lbl">Free uses today</span>
        <div className="usage-right">
          <div className="dots" role="progressbar" aria-valuenow={used} aria-valuemax={limit} aria-label={`${used} of ${limit} free uses used`}>
            {Array.from({ length: limit }, (_, i) => (
              <div
                key={i}
                className={`dot ${i < used ? 'used' : 'free'}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span
            className={`usage-num ${isLimitReached ? 'out' : remaining <= 2 ? 'warn' : ''}`}
            aria-live="polite"
          >
            {isLimitReached ? 'Limit reached' : `${remaining} left`}
          </span>
        </div>
      </div>
    </div>
  )
}
