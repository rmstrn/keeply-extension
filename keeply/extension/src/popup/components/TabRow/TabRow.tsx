import { useState } from 'react'
import type { TabInfo } from '@/shared/types'

interface TabRowProps {
  readonly tab: TabInfo
  readonly selected?: boolean
  readonly onToggle?: () => void
  readonly showCheckbox?: boolean
}

export function TabRow({ tab, selected, onToggle, showCheckbox }: TabRowProps) {
  return (
    <div className="tab-row" onClick={onToggle} role={onToggle ? 'option' : undefined}>
      {showCheckbox && (
        <div className={`tab-checkbox ${selected ? 'checked' : ''}`} aria-hidden="true">
          {selected && <CheckIcon />}
        </div>
      )}
      <TabFavicon url={tab.favIconUrl} />
      <span className="tab-title">{tab.title}</span>
    </div>
  )
}

export function TabFavicon({ url }: { readonly url?: string | undefined }) {
  const [error, setError] = useState(false)

  if (!url || error) {
    return (
      <div className="tab-favicon tab-favicon--fallback" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#9B9C96" strokeWidth="1" />
          <path d="M6 1c0 0-2 2-2 5s2 5 2 5M6 1c0 0 2 2 2 5s-2 5-2 5M1 6h10" stroke="#9B9C96" strokeWidth="1" />
        </svg>
      </div>
    )
  }

  return (
    <img
      className="tab-favicon"
      src={url}
      alt=""
      aria-hidden="true"
      width={14}
      height={14}
      onError={() => setError(true)}
    />
  )
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
