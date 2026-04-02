import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsageDots } from '@/popup/components/UsageDots/UsageDots'
import type { UsageStatus } from '@/shared/types'

function makeStatus(overrides: Partial<UsageStatus> = {}): UsageStatus {
  return {
    used: 0,
    remaining: 5,
    limit: 5,
    isLimitReached: false,
    resetDate: '2024-01-01',
    ...overrides,
  }
}

describe('UsageDots', () => {
  it('renders correct number of dots', () => {
    render(<UsageDots status={makeStatus({ limit: 5 })} />)
    const dots = document.querySelectorAll('.dot')
    expect(dots).toHaveLength(5)
  })

  it('marks used dots correctly', () => {
    render(<UsageDots status={makeStatus({ used: 3, remaining: 2 })} />)
    const usedDots = document.querySelectorAll('.dot.used')
    const freeDots = document.querySelectorAll('.dot.free')
    expect(usedDots).toHaveLength(3)
    expect(freeDots).toHaveLength(2)
  })

  it('shows remaining count when not at limit', () => {
    render(<UsageDots status={makeStatus({ used: 2, remaining: 3 })} />)
    expect(screen.getByText('3 left')).toBeInTheDocument()
  })

  it('shows "Limit reached" when all uses exhausted', () => {
    render(
      <UsageDots
        status={makeStatus({ used: 5, remaining: 0, isLimitReached: true })}
      />,
    )
    expect(screen.getByText('Limit reached')).toBeInTheDocument()
  })

  it('applies warn class when 2 or fewer remaining', () => {
    render(<UsageDots status={makeStatus({ used: 3, remaining: 2 })} />)
    const numEl = document.querySelector('.usage-num')
    expect(numEl).toHaveClass('warn')
  })

  it('applies out class when limit reached', () => {
    render(
      <UsageDots
        status={makeStatus({ used: 5, remaining: 0, isLimitReached: true })}
      />,
    )
    const numEl = document.querySelector('.usage-num')
    expect(numEl).toHaveClass('out')
  })

  it('has no warn/out class when plenty remaining', () => {
    render(<UsageDots status={makeStatus({ used: 1, remaining: 4 })} />)
    const numEl = document.querySelector('.usage-num')
    expect(numEl).not.toHaveClass('warn')
    expect(numEl).not.toHaveClass('out')
  })

  it('has accessible progressbar role', () => {
    render(<UsageDots status={makeStatus({ used: 3, remaining: 2 })} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toBeInTheDocument()
    expect(progressbar).toHaveAttribute('aria-valuenow', '3')
    expect(progressbar).toHaveAttribute('aria-valuemax', '5')
  })

  it('shows "Free uses today" label', () => {
    render(<UsageDots status={makeStatus()} />)
    expect(screen.getByText('Free uses today')).toBeInTheDocument()
  })
})
