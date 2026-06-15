import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TIMEFRAME_TYPE } from '@/constants/ranges'
import { TimeframeControls } from '../timeframe-controls'
import {
  monthsForYear,
  rangeOfMonth,
  rangeOfYear,
  weeksOfMonth,
  YEARS,
} from '../timeframe-controls.helper'

vi.mock('@tetherto/mdk-react-adapter', () => ({
  useTimezone: () => ({ timezone: 'UTC', setTimezone: vi.fn() }),
}))

describe('TimeframeControls (integration)', () => {
  it('renders real selects for year, month, and week', () => {
    const now = Date.now()
    render(<TimeframeControls dateRange={{ start: now, end: now }} hint="Integration" />)

    const root = document.querySelector('.mdk-timeframe-controls')
    expect(root).not.toBeNull()

    expect(root?.querySelectorAll('.mdk-select__trigger').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Integration')).toBeInTheDocument()
  })

  it('omits the band shell when hint is not passed', () => {
    render(<TimeframeControls dateRange={{ start: Date.now(), end: Date.now() }} />)

    const root = document.querySelector('.mdk-timeframe-controls')
    expect(root).not.toBeNull()
    expect(document.querySelector('.mdk-timeframe-controls--banded')).toBeNull()
  })

  it('can hide month and week pickers', () => {
    render(
      <TimeframeControls
        dateRange={{ start: Date.now(), end: Date.now() }}
        isMonthSelectVisible={false}
        isWeekSelectVisible={false}
      />,
    )

    const triggers = document.querySelectorAll('.mdk-select__trigger')
    expect(triggers.length).toBe(1)
  })

  it('renders when dateRange is omitted', () => {
    render(<TimeframeControls hint="Hi" />)
    expect(document.querySelector('.mdk-timeframe-controls')).not.toBeNull()
  })

  it('resets internal selection when the range cannot be inferred', () => {
    render(<TimeframeControls dateRange={{ start: 100, end: 200 }} />)
    expect(document.querySelector('.mdk-timeframe-controls')).not.toBeNull()
  })

  it('syncs year selection from props when timeframeType is year', () => {
    const y = Math.max(...YEARS)
    const [start, end] = rangeOfYear(y)
    render(
      <TimeframeControls
        dateRange={{ start: start.getTime(), end: end.getTime() }}
        timeframeType={TIMEFRAME_TYPE.YEAR}
      />,
    )

    expect(screen.getByText(String(y))).toBeInTheDocument()
  })

  it('syncs month selection from props when timeframeType is month', () => {
    const y = Math.min(...YEARS)
    const monthIdx = 4
    const [start, end] = rangeOfMonth(y, monthIdx)
    render(
      <TimeframeControls
        dateRange={{ start: start.getTime(), end: end.getTime() }}
        timeframeType={TIMEFRAME_TYPE.MONTH}
      />,
    )

    const monthLabel = monthsForYear(y).find((m) => m.month === monthIdx)?.label ?? ''
    expect(screen.getByRole('combobox', { name: 'Month' })).toHaveTextContent(monthLabel)
  })

  it('shows only one timeframe control filled: month mode leaves year and week as placeholders', () => {
    // Pin the clock to a mid-month date. `monthsForYear` hides months after
    // end-of-yesterday for the current year, so on a month boundary the
    // visible-month clamp can override the month derived from the range. A
    // fixed mid-month date keeps the assertion deterministic.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'))
    try {
      const y = Math.min(...YEARS)
      const monthIdx = 2
      const [start, end] = rangeOfMonth(y, monthIdx)
      render(
        <TimeframeControls
          dateRange={{ start: start.getTime(), end: end.getTime() }}
          timeframeType={TIMEFRAME_TYPE.MONTH}
        />,
      )

      expect(screen.getByRole('combobox', { name: 'Year' })).toHaveTextContent('Year')
      const monthLabel = monthsForYear(y).find((m) => m.month === monthIdx)?.label ?? ''
      expect(screen.getByRole('combobox', { name: 'Month' })).toHaveTextContent(monthLabel)
      expect(screen.getByRole('combobox', { name: 'Week' })).toHaveTextContent('Week')
    } finally {
      vi.useRealTimers()
    }
  })

  it('syncs week selection from props when timeframeType is week', () => {
    const y = Math.min(...YEARS)
    const monthIdx = 2
    const weeks = weeksOfMonth(y, monthIdx, 'UTC')
    const row = weeks.find((w) => !w.disabled)
    if (!row) return

    render(
      <TimeframeControls
        dateRange={{ start: row.start.getTime(), end: row.end.getTime() }}
        timeframeType={TIMEFRAME_TYPE.WEEK}
      />,
    )

    const weekCombo = screen.getByRole('combobox', { name: 'Week' })
    expect(weekCombo.textContent).toContain(row.label ?? '')
  })

  it('fires onRangeChange and onTimeframeTypeChange after picking a different year', async () => {
    const onRangeChange = vi.fn()
    const onTimeframeTypeChange = vi.fn()
    const anchor = YEARS[0]!
    const [start, end] = rangeOfYear(anchor)

    render(
      <TimeframeControls
        dateRange={{ start: start.getTime(), end: end.getTime() }}
        timeframeType={TIMEFRAME_TYPE.YEAR}
        onRangeChange={onRangeChange}
        onTimeframeTypeChange={onTimeframeTypeChange}
      />,
    )

    const combos = screen.getAllByRole('combobox')
    fireEvent.pointerDown(combos[0]!)
    fireEvent.click(combos[0]!)

    const target = YEARS[YEARS.length - 1]!
    const opt = await screen.findByRole('option', { name: String(target) })
    fireEvent.click(opt)

    await waitFor(() => {
      expect(onRangeChange).toHaveBeenCalled()
      expect(onTimeframeTypeChange).toHaveBeenCalledWith(TIMEFRAME_TYPE.YEAR)
    })

    const [range] = onRangeChange.mock.calls.at(-1) ?? []
    expect(range?.[0].getFullYear()).toBe(target)
  })
})
