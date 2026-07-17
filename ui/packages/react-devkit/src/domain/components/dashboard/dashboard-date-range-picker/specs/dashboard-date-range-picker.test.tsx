import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardDateRangePicker } from '../dashboard-date-range-picker'

vi.mock('@primitives', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  DateRangePicker: ({
    selected,
    onSelect,
    dateFormat,
    disabled,
    triggerClassName,
    modalClassName,
  }: any) => (
    <div
      data-testid="core-date-range-picker"
      data-from={selected?.from?.toISOString?.()}
      data-to={selected?.to?.toISOString?.()}
      data-format={dateFormat}
      data-disabled={String(disabled)}
      data-trigger-class={triggerClassName}
      data-modal-class={modalClassName}
    >
      <button
        data-testid="select-valid"
        onClick={() =>
          onSelect?.({
            from: new Date('2026-02-01T00:00:00.000Z'),
            to: new Date('2026-02-07T00:00:00.000Z'),
          })
        }
      />
      <button data-testid="select-undefined" onClick={() => onSelect?.(undefined)} />
      <button data-testid="select-empty" onClick={() => onSelect?.({})} />
      <button
        data-testid="select-only-from"
        onClick={() => onSelect?.({ from: new Date('2026-02-01T00:00:00.000Z') })}
      />
      <button
        data-testid="select-only-to"
        onClick={() => onSelect?.({ to: new Date('2026-02-07T00:00:00.000Z') })}
      />
    </div>
  ),
}))

const START = new Date('2026-01-01T00:00:00.000Z').getTime()
const END = new Date('2026-01-08T00:00:00.000Z').getTime()

describe('DashboardDateRangePicker', () => {
  describe('rendering', () => {
    it('renders the underlying core DateRangePicker', () => {
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={vi.fn()} />)

      expect(screen.getByTestId('core-date-range-picker')).toBeInTheDocument()
    })

    it('passes value timestamps through as from/to Date objects', () => {
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={vi.fn()} />)

      const picker = screen.getByTestId('core-date-range-picker')
      expect(picker).toHaveAttribute('data-from', new Date(START).toISOString())
      expect(picker).toHaveAttribute('data-to', new Date(END).toISOString())
    })

    it('always sets the fixed modal class', () => {
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={vi.fn()} />)

      expect(screen.getByTestId('core-date-range-picker')).toHaveAttribute(
        'data-modal-class',
        'mdk-dashboard-date-range-picker__modal',
      )
    })
  })

  describe('dateFormat prop', () => {
    it('defaults to dd/MM/yyyy when not provided', () => {
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={vi.fn()} />)

      expect(screen.getByTestId('core-date-range-picker')).toHaveAttribute(
        'data-format',
        'dd/MM/yyyy',
      )
    })

    it('passes a custom dateFormat through', () => {
      render(
        <DashboardDateRangePicker
          value={{ start: START, end: END }}
          onChange={vi.fn()}
          dateFormat="yyyy-MM-dd"
        />,
      )

      expect(screen.getByTestId('core-date-range-picker')).toHaveAttribute(
        'data-format',
        'yyyy-MM-dd',
      )
    })
  })

  describe('disabled prop', () => {
    it('defaults to false when not provided', () => {
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={vi.fn()} />)

      expect(screen.getByTestId('core-date-range-picker')).toHaveAttribute('data-disabled', 'false')
    })

    it('passes true when disabled', () => {
      render(
        <DashboardDateRangePicker value={{ start: START, end: END }} onChange={vi.fn()} disabled />,
      )

      expect(screen.getByTestId('core-date-range-picker')).toHaveAttribute('data-disabled', 'true')
    })

    it('passes false when explicitly disabled={false}', () => {
      render(
        <DashboardDateRangePicker
          value={{ start: START, end: END }}
          onChange={vi.fn()}
          disabled={false}
        />,
      )

      expect(screen.getByTestId('core-date-range-picker')).toHaveAttribute('data-disabled', 'false')
    })
  })

  describe('className prop', () => {
    it('uses only the base trigger class when className is not provided', () => {
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={vi.fn()} />)

      expect(screen.getByTestId('core-date-range-picker')).toHaveAttribute(
        'data-trigger-class',
        'mdk-dashboard-date-range-picker__trigger',
      )
    })

    it('appends a custom className to the base trigger class', () => {
      render(
        <DashboardDateRangePicker
          value={{ start: START, end: END }}
          onChange={vi.fn()}
          className="extra"
        />,
      )

      expect(screen.getByTestId('core-date-range-picker')).toHaveAttribute(
        'data-trigger-class',
        'mdk-dashboard-date-range-picker__trigger extra',
      )
    })
  })

  describe('onChange (handleSelect branches)', () => {
    it('fires onChange with epoch-ms when a valid range is selected', () => {
      const onChange = vi.fn()
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={onChange} />)

      fireEvent.click(screen.getByTestId('select-valid'))

      expect(onChange).toHaveBeenCalledWith({
        start: new Date('2026-02-01T00:00:00.000Z').getTime(),
        end: new Date('2026-02-07T00:00:00.000Z').getTime(),
      })
    })

    it('does not fire onChange when range is undefined', () => {
      const onChange = vi.fn()
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={onChange} />)

      fireEvent.click(screen.getByTestId('select-undefined'))

      expect(onChange).not.toHaveBeenCalled()
    })

    it('does not fire onChange when range has neither from nor to', () => {
      const onChange = vi.fn()
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={onChange} />)

      fireEvent.click(screen.getByTestId('select-empty'))

      expect(onChange).not.toHaveBeenCalled()
    })

    it('does not fire onChange when only from is provided', () => {
      const onChange = vi.fn()
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={onChange} />)

      fireEvent.click(screen.getByTestId('select-only-from'))

      expect(onChange).not.toHaveBeenCalled()
    })

    it('does not fire onChange when only to is provided', () => {
      const onChange = vi.fn()
      render(<DashboardDateRangePicker value={{ start: START, end: END }} onChange={onChange} />)

      fireEvent.click(screen.getByTestId('select-only-to'))

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('memoization of selected', () => {
    it('passes updated dates after value changes', () => {
      const { rerender } = render(
        <DashboardDateRangePicker value={{ start: START, end: END }} onChange={vi.fn()} />,
      )

      const nextStart = new Date('2026-03-01T00:00:00.000Z').getTime()
      const nextEnd = new Date('2026-03-08T00:00:00.000Z').getTime()
      rerender(
        <DashboardDateRangePicker value={{ start: nextStart, end: nextEnd }} onChange={vi.fn()} />,
      )

      const picker = screen.getByTestId('core-date-range-picker')
      expect(picker).toHaveAttribute('data-from', new Date(nextStart).toISOString())
      expect(picker).toHaveAttribute('data-to', new Date(nextEnd).toISOString())
    })
  })
})
