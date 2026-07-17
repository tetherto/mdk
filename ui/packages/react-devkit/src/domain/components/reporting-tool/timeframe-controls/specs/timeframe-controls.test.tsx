import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TimeframeControls } from '../timeframe-controls'

vi.mock('@tetherto/mdk-react-adapter', () => ({
  useTimezone: () => ({ timezone: 'UTC', setTimezone: vi.fn() }),
}))

describe('TimeframeControls', () => {
  it('applies band layout and renders hint text when hint is provided', () => {
    render(<TimeframeControls hint="Pick a timeframe" dateRange={{ start: 0, end: 1 }} />)

    expect(document.querySelector('.mdk-timeframe-controls--banded')).toBeInTheDocument()
    expect(screen.getByText('Pick a timeframe')).toBeInTheDocument()
    expect(screen.getByText('Pick a timeframe').className).toContain('mdk-timeframe-controls__hint')
  })

  it('does not use band layout when hint is omitted', () => {
    render(<TimeframeControls dateRange={{ start: 0, end: 1 }} />)

    expect(document.querySelector('.mdk-timeframe-controls--banded')).not.toBeInTheDocument()
    expect(document.querySelector('.mdk-timeframe-controls__hint')).not.toBeInTheDocument()
    expect(document.querySelector('.mdk-timeframe-controls')).toBeInTheDocument()
  })

  it('hides reset by default', () => {
    render(<TimeframeControls dateRange={{ start: 0, end: 1 }} />)

    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })

  it('shows reset when showResetButton is enabled', () => {
    const onReset = vi.fn()
    render(<TimeframeControls dateRange={{ start: 0, end: 1 }} showResetButton onReset={onReset} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalledOnce()
    expect(
      document.querySelector('.mdk-timeframe-controls__toolbar--with-reset'),
    ).toBeInTheDocument()
  })
})
