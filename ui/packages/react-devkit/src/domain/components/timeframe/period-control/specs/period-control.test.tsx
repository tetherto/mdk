import type { PeriodState } from '@tetherto/mdk-react-adapter'
import type { DateRange, PresetItem } from '@primitives'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PeriodControl } from '../period-control'

// The real date picker, swapped for one that records what it was given.
const picker = vi.hoisted(() => ({
  props: undefined as
    | {
        selected?: DateRange
        presets?: PresetItem[]
        onSelect: (range: DateRange | undefined) => void
      }
    | undefined,
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
    expect(screen.getByRole('button', { name: 'Monthly buckets' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('says why a bucket is disabled', async () => {
    const s = state()
    render(<PeriodControl state={s} timezone="UTC" />)
    const monthly = screen.getByRole('button', { name: 'Monthly buckets' })

    fireEvent.focus(monthly)
    expect(
      (await screen.findAllByText('Monthly buckets need a period of 60 days or more')).length,
    ).toBeGreaterThan(0)

    fireEvent.click(monthly)
    expect(s.setGranularity).not.toHaveBeenCalled()
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

  describe('picker presets', () => {
    beforeAll(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(Date.UTC(2026, 9, 23, 12)) // Oct 23, 12:00 UTC
    })
    afterEach(() => {
      picker.props = undefined
    })
    afterAll(() => {
      vi.useRealTimers()
    })

    const day = (d?: Date) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate()]

    it('offers the last 7, 14, 30 and 90 days as site days ending today', () => {
      render(<PeriodControl state={state()} timezone="UTC" />)
      const presets = picker.props?.presets ?? []
      expect(presets.map((p) => p.label)).toEqual([
        'Last 7 days',
        'Last 14 days',
        'Last 30 days',
        'Last 90 days',
      ])
      // Whole days ending today: Last 7 days is Oct 17 to 23, seven days
      expect(day(presets[0]?.value.from)).toEqual([2026, 10, 17])
      expect(day(presets[0]?.value.to)).toEqual([2026, 10, 23])
      expect(day(presets[1]?.value.from)).toEqual([2026, 10, 10])
    })

    it('shows a rolling day preset as that many whole days, so it matches its picker preset', () => {
      const now = Date.UTC(2026, 9, 23, 12)
      render(
        <PeriodControl
          state={state({
            period: { preset: '7d', granularity: 'day' },
            query: { start: now - 7 * 86_400_000, end: now, granularity: 'day' },
          })}
          timezone="UTC"
        />,
      )
      expect(day(picker.props?.selected?.from)).toEqual([2026, 10, 17])
      expect(day(picker.props?.selected?.to)).toEqual([2026, 10, 23])
    })

    it('sets the rolling preset when a preset matching the Period select is applied', () => {
      const s = state()
      render(<PeriodControl state={s} timezone="UTC" />)
      const last30 = picker.props!.presets![2]!
      picker.props!.onSelect(last30.value)
      expect(s.setPreset).toHaveBeenCalledWith('30d')
      expect(s.setCustom).not.toHaveBeenCalled()
    })

    it('sets a custom range for a preset the Period select does not have', () => {
      const s = state()
      render(<PeriodControl state={s} timezone="UTC" />)
      const last14 = picker.props!.presets![1]!
      picker.props!.onSelect(last14.value)
      expect(s.setCustom).toHaveBeenCalledWith('2026-10-10', '2026-10-23')
      expect(s.setPreset).not.toHaveBeenCalled()
    })
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
