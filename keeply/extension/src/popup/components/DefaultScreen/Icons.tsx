export function TabIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x=".5" y=".5" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="7" y=".5" width="5.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x=".5" y="6" width="12" height="6.5" rx="1" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`chevron-icon${expanded ? ' expanded' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BulbLightningIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C8.5 2 6 4.5 6 8C6 11 8 13.5 8 13.5V16H16V13.5C16 13.5 18 11 18 8C18 4.5 15.5 2 12 2Z"
        fill={color}
      />
      <rect x="8.5" y="16" width="7" height="2" rx="1" fill={color} />
      <rect x="9.5" y="18.5" width="5" height="1.5" rx="0.75" fill={color} />
      <path
        d="M13.5 5.5L10.5 10H12.5L11 15L16 8H13.5L15 5.5Z"
        fill="transparent"
        stroke={color === '#312F2C' ? '#ABD1C6' : '#312F2C'}
        strokeWidth="0.8"
      />
      <path
        d="M13.5 5.5L10.5 10H12.5L11 15L16 8H13.5Z"
        fill={color === '#312F2C' ? '#ABD1C6' : '#312F2C'}
      />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
