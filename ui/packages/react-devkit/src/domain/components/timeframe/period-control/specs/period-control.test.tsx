import type { PeriodState } from '@tetherto/mdk-react-adapter'
import type { DateRange } from '@primitives'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { PeriodControl } from '../period-control'

// The real date picker, swapped for one that records what it was given.
const picker = vi.hoisted(() => ({
  props: undefined as
    { selected?: DateRange; onSelect: (range: DateRange | undefined) => void } | undefined,
}))
vi.mock('@primitives', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DateRangePicker: (props: NonNullable<typeof picker.props>) => {
    picker.props = props
    return null
  },
}))

const state = (overrides: Partial<PeriodState> = {}): PeriodState => ({
  period: { preset: '30d', granularity: 'day' },
  query: { start: Date.UTC(2026, 8, 23), end: Date.UTC(2026, 9, 23), granularity: 'day' },
  allowed: ['hour', 'day', 'week'],
  isDefault: true,
  setPreset: vi.fn(),
  setCustom: vi.fn(),
  setGranularity: vi.fn(),
  reset: vi.fn(),
  ...overrides,
})

describe('PeriodControl', () => {
  it('disables the buckets that do not fit the range', () => {
    render(<PeriodControl state={state()} timezone="UTC" />)
    expect(screen.getByRole('button', { name: 'Hourly buckets' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Monthly buckets' })).toBeDisabled()
  })

  it('sets the granularity from the bucket toggle', () => {
    const s = state()
    render(<PeriodControl state={s} timezone="UTC" />)
    fireEvent.click(screen.getByRole('button', { name: 'Weekly buckets' }))
    expect(s.setGranularity).toHaveBeenCalledWith('week')
  })

  it('hides the buckets when asked', () => {
    render(<PeriodControl state={state()} timezone="UTC" showGranularity={false} />)
    expect(screen.queryByRole('group', { name: 'Buckets' })).not.toBeInTheDocument()
  })

  it('resets, and only once the period is not the default', () => {
    const s = state({ isDefault: false })
    const { rerender } = render(<PeriodControl state={state()} timezone="UTC" />)
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
    rerender(<PeriodControl state={s} timezone="UTC" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(s.reset).toHaveBeenCalledOnce()
  })

  describe('with the browser in another timezone than the site', () => {
    const browserTz = process.env.TZ
    beforeAll(() => {
      process.env.TZ = 'Asia/Singapore' // UTC+8
    })
    afterAll(() => {
      process.env.TZ = browserTz
    })

    // Tokyo days, Oct 1 to 7: midnight there is 15:00 UTC the day before, which
    // is still the day before in Singapore.
    const tokyo = state({
      period: { preset: 'custom', from: '2026-10-01', to: '2026-10-07', granularity: 'day' },
      query: {
        start: Date.UTC(2026, 8, 30, 15),
        end: Date.UTC(2026, 9, 7, 15),
        granularity: 'day',
      },
    })

    it("shows the site's days as the same dates in the picker", () => {
      render(<PeriodControl state={tokyo} timezone="Asia/Tokyo" />)
      const { from, to } = picker.props?.selected ?? {}
      expect([from?.getFullYear(), from?.getMonth(), from?.getDate()]).toEqual([2026, 9, 1])
      expect([to?.getFullYear(), to?.getMonth(), to?.getDate()]).toEqual([2026, 9, 7])
    })

    // Local midnight in Singapore is still the day before in New York.
    it('reads the dates picked as those days in the site', () => {
      const s = state()
      render(<PeriodControl state={s} timezone="America/New_York" />)
      picker.props?.onSelect({ from: new Date(2026, 9, 1), to: new Date(2026, 9, 7) })
      expect(s.setCustom).toHaveBeenCalledWith('2026-10-01', '2026-10-07')
    })
  })
})
