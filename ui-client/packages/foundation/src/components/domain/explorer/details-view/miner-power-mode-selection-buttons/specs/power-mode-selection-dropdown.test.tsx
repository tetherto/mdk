import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PowerModeSelectionDropdown } from '../power-mode-selection-dropdown'

vi.mock('../../../../../../utils/device-utils', () => ({
  getSupportedPowerModes: vi.fn(() => ['Normal', 'High Performance', 'Low Power']),
}))

vi.mock('../../miner-controls-card/miner-controls-utils', () => ({
  getDefaultSelectedPowerModes: vi.fn((modes) => Object.keys(modes)),
}))

vi.mock('@tetherto/mdk-core-ui', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  ArrowIcon: vi.fn(({ isOpen }) => <div data-testid="arrow-icon" data-open={String(isOpen)} />),
  SimpleTooltip: vi.fn(({ children, content }) => (
    <div data-testid="simple-tooltip" title={content}>
      {children}
    </div>
  )),
  DropdownMenu: {
    Root: vi.fn(({ children, onOpenChange }) => (
      <div data-testid="dropdown-root" onClick={() => onOpenChange?.(true)}>
        {children}
      </div>
    )),
    Trigger: vi.fn(({ children, disabled, asChild }) => {
      const content = asChild ? children : <button disabled={disabled}>{children}</button>
      return <div data-testid="dropdown-trigger">{content}</div>
    }),
    Content: vi.fn(({ children, align, side }) => (
      <div data-testid="dropdown-content" data-align={align} data-side={side}>
        {children}
      </div>
    )),
    Item: vi.fn(({ children, checked, onClick }) => (
      <div data-testid="dropdown-checkbox-item" data-checked={String(checked)} onClick={onClick}>
        {children}
      </div>
    )),
  },
}))

describe('PowerModeSelectionDropdown', () => {
  const defaultProps = {
    model: 'M50',
    currentPowerModes: { Normal: 10, High: 5 },
    buttonText: 'Select Mode',
    onPowerModeToggle: vi.fn(),
  }

  describe('rendering', () => {
    it('renders the dropdown root and trigger', () => {
      render(<PowerModeSelectionDropdown {...defaultProps} />)
      expect(screen.getByTestId('dropdown-root')).toBeInTheDocument()
      expect(screen.getByText('Select Mode')).toBeInTheDocument()
    })

    it('renders the correct number of power mode items', () => {
      render(<PowerModeSelectionDropdown {...defaultProps} />)
      const items = screen.getAllByTestId('dropdown-checkbox-item')
      // Based on the mock getSupportedPowerModes returning 3 items
      expect(items).toHaveLength(3)
    })

    it('formats the labels correctly with counts', () => {
      const currentPowerModes = { Normal: 10 }
      render(<PowerModeSelectionDropdown {...defaultProps} currentPowerModes={currentPowerModes} />)

      expect(screen.getByText('Normal (10)')).toBeInTheDocument()
      // Fallback to 0 if mode is not in currentPowerModes
      expect(screen.getByText('Low Power (0)')).toBeInTheDocument()
    })

    it('passes align="start" and side="top" to Content', () => {
      render(<PowerModeSelectionDropdown {...defaultProps} />)
      const content = screen.getByTestId('dropdown-content')
      expect(content).toHaveAttribute('data-align', 'start')
      expect(content).toHaveAttribute('data-side', 'top')
    })
  })

  describe('disabled state', () => {
    it('shows tooltip and default text when disabled', () => {
      render(<PowerModeSelectionDropdown {...defaultProps} disabled={true} />)

      expect(screen.getByTestId('simple-tooltip')).toBeInTheDocument()
      expect(screen.getByText('Set Power Mode')).toBeInTheDocument()
      expect(screen.getByTestId('simple-tooltip')).toHaveAttribute(
        'title',
        'Cannot change power mode while container is stopped.',
      )
    })

    it('does not show tooltip when enabled', () => {
      render(<PowerModeSelectionDropdown {...defaultProps} disabled={false} />)
      expect(screen.queryByTestId('simple-tooltip')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onPowerModeToggle with the correct mode key when clicked', () => {
      const onPowerModeToggle = vi.fn()
      render(<PowerModeSelectionDropdown {...defaultProps} onPowerModeToggle={onPowerModeToggle} />)

      const items = screen.getAllByTestId('dropdown-checkbox-item')
      fireEvent.click(items[1]) // Clicking 'High Performance'

      expect(onPowerModeToggle).toHaveBeenCalledWith('High Performance')
    })

    it('does not crash if onPowerModeToggle is not provided', () => {
      render(<PowerModeSelectionDropdown {...defaultProps} onPowerModeToggle={undefined} />)
      const item = screen.getAllByTestId('dropdown-checkbox-item')[0]

      expect(() => fireEvent.click(item)).not.toThrow()
    })
  })
})
