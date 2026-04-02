import { useTabStore } from '@/popup/stores/tabStore'

const GROUP_COLORS: Record<string, string> = {
  green: '#1D9E75',
  blue: '#2563EB',
  purple: '#6D4AFF',
  yellow: '#D97706',
  red: '#DC2626',
  pink: '#D4537E',
  cyan: '#0891B2',
  grey: '#6B7280',
}

export function ResultsScreen() {
  const result = useTabStore((s) => s.lastResult)
  const reset = useTabStore((s) => s.reset)
  const startGrouping = useTabStore((s) => s.startGrouping)

  if (!result) return null

  return (
    <div className="body">
      <div className="done-chip" role="status">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="#0D7A5F" />
          <path
            d="M5 8l2.5 2.5 4-5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="done-text">
          Done — {result.totalTabsGrouped} tabs → {result.groups.length} groups
        </span>
      </div>

      <div role="list" aria-label="Tab groups">
        {result.groups.map((group) => (
          <div key={group.name} className="gr" role="listitem">
            <div className="gh">
              <div
                className="gdot"
                style={{ background: GROUP_COLORS[group.color] ?? '#6B7280' }}
                aria-hidden="true"
              />
              <span className="gn">{group.name}</span>
              <span className="gbadge" aria-label={`${group.tabIds.length} tabs`}>
                {group.tabIds.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="res-acts">
        <button className="ract" onClick={reset} aria-label="Undo grouping">
          Undo
        </button>
        <button
          className="ract"
          onClick={() => startGrouping()}
          aria-label="Regroup tabs"
        >
          Regroup
        </button>
        <button className="ract ok" onClick={reset} aria-label="Apply groups and close">
          Apply ✓
        </button>
      </div>
    </div>
  )
}
