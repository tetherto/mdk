import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DatePicker, DateRangePicker } from '../index'

// February 2026 starts on a Sunday and spans four week rows; without fixedWeeks it draws 4
const FEBRUARY_2026 = new Date(2026, 1, 1)

const weekRows = (): number => document.querySelectorAll('.rdp-week').length

describe('DatePicker', () => {
  it('always draws six week rows', () => {
    render(<DatePicker placeholder="Pick" defaultMonth={FEBRUARY_2026} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pick' }))

    expect(weekRows()).toBe(6)
  })
})

describe('DateRangePicker', () => {
  it('draws six week rows in each month', () => {
    render(<DateRangePicker placeholder="Pick range" defaultMonth={FEBRUARY_2026} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pick range' }))

    expect(weekRows()).toBe(12)
  })
})

describe('DateRangePicker modal', () => {
  const range = { from: new Date(2026, 1, 2), to: new Date(2026, 1, 8) }

  it('opens as a dialog over a blurred overlay, with a close button', () => {
    render(<DateRangePicker placeholder="Pick range" defaultMonth={FEBRUARY_2026} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pick range' }))

    expect(screen.getByRole('dialog', { name: 'Select Date Range' })).toBeInTheDocument()
    expect(document.querySelector('.mdk-dialog__overlay.mdk-date-picker__overlay')).not.toBeNull()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('discards the draft when closed without applying', () => {
    const onSelect = vi.fn()
    render(
      <DateRangePicker
        placeholder="Pick range"
        selected={range}
        onSelect={onSelect}
        presets={[
          { label: 'Preset', value: { from: new Date(2026, 1, 10), to: new Date(2026, 1, 12) } },
        ]}
      />,
    )
    const trigger = screen.getByRole('button', { name: /02\/02\/2026/ })

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Preset' }))
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Apply Range' }))
    expect(onSelect).toHaveBeenCalledWith(range)
  })
})

describe('DateRangePicker month', () => {
  const caption = (): string[] =>
    Array.from(document.querySelectorAll('.rdp-caption_label')).map((el) => el.textContent ?? '')

  it('opens on the selected range, not the current month', () => {
    render(
      <DateRangePicker
        placeholder="Pick range"
        allowFutureDates
        selected={{ from: new Date(2025, 2, 10), to: new Date(2025, 2, 20) }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /03\/10\/2025/ }))

    expect(caption()).toEqual(['March 2025', 'April 2025'])
  })

  it('moves to a preset when it is clicked', () => {
    render(
      <DateRangePicker
        placeholder="Pick range"
        allowFutureDates
        defaultMonth={FEBRUARY_2026}
        presets={[
          { label: 'Summer', value: { from: new Date(2025, 6, 1), to: new Date(2025, 6, 31) } },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Pick range' }))
    fireEvent.click(screen.getByRole('button', { name: 'Summer' }))

    expect(caption()).toEqual(['July 2025', 'August 2025'])
  })
})

describe('DateRangePicker default presets', () => {
  it('"Last 7 Days" is 7 whole days ending today', () => {
    const onSelect = vi.fn()
    render(<DateRangePicker placeholder="Pick range" showPresets onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pick range' }))
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 Days' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply Range' }))

    const today = new Date()
    const sixDaysAgo = new Date(today)
    sixDaysAgo.setDate(today.getDate() - 6)
    const [range] = onSelect.mock.calls[0] ?? []
    expect(range.from.toDateString()).toBe(sixDaysAgo.toDateString())
    expect(range.to.toDateString()).toBe(today.toDateString())
  })
})
