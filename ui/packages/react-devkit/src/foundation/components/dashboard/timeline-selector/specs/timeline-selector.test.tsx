import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TimelineSelector } from '../timeline-selector'

vi.mock('@core', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-root" data-value={value}>
      {children}
      <button data-testid="select-change-15m" onClick={() => onValueChange?.('15m')} />
    </div>
  ),
  SelectTrigger: ({ children, className, 'aria-label': ariaLabel }: any) => (
    <button data-testid="select-trigger" data-class={className} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: any) => (
    <span data-testid="select-value" data-placeholder={placeholder} />
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, disabled }: any) => (
    <div data-testid="select-item" data-value={value} data-disabled={String(disabled)}>
      {children}
    </div>
  ),
}))

vi.mock('@tetherto/mdk-ui-core', () => ({
  getTimelineOptions: vi.fn(() => [
    { value: '5m', label: '5 minutes' },
    { value: '15m', label: '15 minutes' },
    { value: '1h', label: '1 hour', disabled: true },
  ]),
}))

describe('TimelineSelector', () => {
  describe('rendering', () => {
    it('renders the Select root with the current value', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} />)

      expect(screen.getByTestId('select-root')).toHaveAttribute('data-value', '5m')
    })

    it('renders the trigger with the base BEM class', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} />)

      expect(screen.getByTestId('select-trigger')).toHaveAttribute(
        'data-class',
        'mdk-timeline-selector',
      )
    })

    it('renders the SelectContent wrapper', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} />)

      expect(screen.getByTestId('select-content')).toBeInTheDocument()
    })
  })

  describe('options prop', () => {
    it('falls back to getTimelineOptions when options is not provided', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} />)

      const items = screen.getAllByTestId('select-item')
      expect(items).toHaveLength(3)
      expect(items[0]).toHaveAttribute('data-value', '5m')
      expect(items[1]).toHaveAttribute('data-value', '15m')
      expect(items[2]).toHaveAttribute('data-value', '1h')
    })

    it('uses the provided options when supplied', () => {
      const options = [
        { value: '1m', label: '1 minute' },
        { value: '30m', label: '30 minutes' },
      ]
      render(<TimelineSelector value="1m" onChange={vi.fn()} options={options} />)

      const items = screen.getAllByTestId('select-item')
      expect(items).toHaveLength(2)
      expect(items[0]).toHaveAttribute('data-value', '1m')
      expect(items[1]).toHaveAttribute('data-value', '30m')
      expect(items[0]).toHaveTextContent('1 minute')
      expect(items[1]).toHaveTextContent('30 minutes')
    })

    it('renders an empty list when options=[]', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} options={[]} />)

      expect(screen.queryAllByTestId('select-item')).toHaveLength(0)
    })

    it('passes through the disabled flag on options', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} />)

      const items = screen.getAllByTestId('select-item')
      expect(items[0]).toHaveAttribute('data-disabled', 'undefined')
      expect(items[2]).toHaveAttribute('data-disabled', 'true')
    })
  })

  describe('label prop', () => {
    it('defaults the aria-label and placeholder to "Time range"', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} />)

      expect(screen.getByTestId('select-trigger')).toHaveAttribute('aria-label', 'Time range')
      expect(screen.getByTestId('select-value')).toHaveAttribute('data-placeholder', 'Time range')
    })

    it('uses a custom label when provided', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} label="Window" />)

      expect(screen.getByTestId('select-trigger')).toHaveAttribute('aria-label', 'Window')
      expect(screen.getByTestId('select-value')).toHaveAttribute('data-placeholder', 'Window')
    })
  })

  describe('className prop', () => {
    it('uses only the base class when className is not provided', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} />)

      expect(screen.getByTestId('select-trigger')).toHaveAttribute(
        'data-class',
        'mdk-timeline-selector',
      )
    })

    it('appends a custom className to the trigger', () => {
      render(<TimelineSelector value="5m" onChange={vi.fn()} className="dense" />)

      expect(screen.getByTestId('select-trigger')).toHaveAttribute(
        'data-class',
        'mdk-timeline-selector dense',
      )
    })
  })

  describe('onChange', () => {
    it('fires onChange with the new value when the user picks an option', () => {
      const onChange = vi.fn()
      render(<TimelineSelector value="5m" onChange={onChange} />)

      fireEvent.click(screen.getByTestId('select-change-15m'))

      expect(onChange).toHaveBeenCalledWith('15m')
    })

    it('fires onChange once per selection', () => {
      const onChange = vi.fn()
      render(<TimelineSelector value="5m" onChange={onChange} />)

      fireEvent.click(screen.getByTestId('select-change-15m'))

      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })
})
