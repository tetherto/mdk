import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReportTimeFrameSelector } from '../report-time-frame-selector'

vi.mock('@primitives', () => ({
  RadioGroup: ({ children, onValueChange, value }: any) => (
    <div
      data-testid="radio-group"
      data-value={value}
      onClick={(e: React.MouseEvent) => {
        const btn = (e.target as HTMLElement).closest('button')
        if (btn?.dataset.value) onValueChange?.(btn.dataset.value)
      }}
    >
      {children}
    </div>
  ),
  RadioCard: ({ label, value }: any) => (
    <button type="button" data-testid={`radio-${value}`} data-value={value}>
      {label}
    </button>
  ),
  DateRangePicker: ({ selected }: any) => (
    <div
      data-testid="date-range-picker"
      data-from={selected?.from?.toISOString()}
      data-to={selected?.to?.toISOString()}
    />
  ),
}))

const DEFAULT_DATE_RANGE: [Date, Date] = [new Date('2026-01-08'), new Date('2026-01-14')]

const renderSelector = (
  overrides: Partial<React.ComponentProps<typeof ReportTimeFrameSelector>> = {},
) => {
  const props = {
    presetTimeFrame: 1 as number | null,
    dateRange: DEFAULT_DATE_RANGE,
    setPresetTimeFrame: vi.fn(),
    setDateRange: vi.fn(),
    ...overrides,
  }
  return { ...render(<ReportTimeFrameSelector {...props} />), props }
}

describe('ReportTimeFrameSelector', () => {
  describe('preset buttons', () => {
    it('renders 1D, 7D, 30D and Custom options', () => {
      renderSelector()
      expect(screen.getByTestId('radio-1')).toBeInTheDocument()
      expect(screen.getByTestId('radio-7')).toBeInTheDocument()
      expect(screen.getByTestId('radio-30')).toBeInTheDocument()
      expect(screen.getByTestId('radio-custom')).toBeInTheDocument()
    })

    it('reflects the active preset on the radio group', () => {
      renderSelector({ presetTimeFrame: 7 })
      expect(screen.getByTestId('radio-group')).toHaveAttribute('data-value', '7')
    })

    it('reflects custom mode on the radio group when preset is null', () => {
      renderSelector({ presetTimeFrame: null })
      expect(screen.getByTestId('radio-group')).toHaveAttribute('data-value', 'custom')
    })

    it('calls setPresetTimeFrame with the numeric value when a preset is clicked', () => {
      const { props } = renderSelector()
      fireEvent.click(screen.getByTestId('radio-7'))
      expect(props.setPresetTimeFrame).toHaveBeenCalledWith(7)
    })

    it('calls setPresetTimeFrame with 30 when 30D is clicked', () => {
      const { props } = renderSelector()
      fireEvent.click(screen.getByTestId('radio-30'))
      expect(props.setPresetTimeFrame).toHaveBeenCalledWith(30)
    })

    it('calls setPresetTimeFrame with null when Custom is clicked', () => {
      const { props } = renderSelector()
      fireEvent.click(screen.getByTestId('radio-custom'))
      expect(props.setPresetTimeFrame).toHaveBeenCalledWith(null)
    })
  })

  describe('DateRangePicker visibility', () => {
    it('hides DateRangePicker when a preset is active', () => {
      renderSelector({ presetTimeFrame: 1 })
      expect(screen.queryByTestId('date-range-picker')).not.toBeInTheDocument()
    })

    it('shows DateRangePicker when preset is null (custom mode)', () => {
      renderSelector({ presetTimeFrame: null })
      expect(screen.getByTestId('date-range-picker')).toBeInTheDocument()
    })

    it('passes the dateRange to DateRangePicker as from/to', () => {
      renderSelector({ presetTimeFrame: null })
      const picker = screen.getByTestId('date-range-picker')
      expect(picker).toHaveAttribute('data-from', DEFAULT_DATE_RANGE[0].toISOString())
      expect(picker).toHaveAttribute('data-to', DEFAULT_DATE_RANGE[1].toISOString())
    })
  })
})
