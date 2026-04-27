// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EnabledDisableToggleProps } from '../enabled-disable-toggle/enabled-disable-toggle'
import { EnabledDisableToggle } from '../enabled-disable-toggle/enabled-disable-toggle'

vi.mock('@mdk/core', () => ({
  Button: vi.fn(({ children, onClick, disabled, variant }) => (
    <button data-testid={`button-${variant || 'outline'}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )),
  Switch: vi.fn(({ checked, disabled }) => (
    <input data-testid="switch" type="checkbox" checked={checked} disabled={disabled} readOnly />
  )),
  SimpleTooltip: vi.fn(({ children, content }) => (
    <div data-testid="tooltip" data-content={content}>
      {children}
    </div>
  )),
}))

describe('EnabledDisableToggle', () => {
  const mockOnToggle = vi.fn()

  const defaultProps: EnabledDisableToggleProps = {
    value: undefined,
    tankNumber: 1,
    isButtonDisabled: false,
    isOffline: false,
    onToggle: mockOnToggle,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders tooltip wrapper', () => {
      render(<EnabledDisableToggle {...defaultProps} />)
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('renders main container', () => {
      const { container } = render(<EnabledDisableToggle {...defaultProps} />)
      expect(container.querySelector('.mdk-enabled-disable-toggle')).toBeInTheDocument()
    })
  })

  describe('tooltip', () => {
    it('shows offline message when isOffline is true', () => {
      render(<EnabledDisableToggle {...defaultProps} isOffline={true} />)
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-content', 'Container is offline')
    })

    it('does not show tooltip content when not offline', () => {
      render(<EnabledDisableToggle {...defaultProps} isOffline={false} />)
      expect(screen.getByTestId('tooltip')).not.toHaveAttribute(
        'data-content',
        'Container is offline',
      )
    })
  })

  describe('boolean value - switch display', () => {
    it('renders switch when value is true', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} />)
      expect(screen.getByTestId('switch')).toBeInTheDocument()
    })

    it('renders switch when value is false', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} />)
      expect(screen.getByTestId('switch')).toBeInTheDocument()
    })

    it('renders switch as checked when value is true', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} />)
      expect(screen.getByTestId('switch')).toBeChecked()
    })

    it('renders switch as unchecked when value is false', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} />)
      expect(screen.getByTestId('switch')).not.toBeChecked()
    })

    it('renders switch as disabled', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} />)
      expect(screen.getByTestId('switch')).toBeDisabled()
    })

    it('renders toggle container with correct class', () => {
      const { container } = render(<EnabledDisableToggle {...defaultProps} value={true} />)
      expect(container.querySelector('.mdk-enabled-disable-toggle__toggle')).toBeInTheDocument()
    })

    it('renders label text in toggle', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} tankNumber={1} />)
      expect(screen.getByText('Tank 1 Circulation')).toBeInTheDocument()
    })

    it('does not render switch when value is not boolean', () => {
      render(<EnabledDisableToggle {...defaultProps} value="string" />)
      expect(screen.queryByTestId('switch')).not.toBeInTheDocument()
    })

    it('does not render switch when value is null', () => {
      render(<EnabledDisableToggle {...defaultProps} value={null} />)
      expect(screen.queryByTestId('switch')).not.toBeInTheDocument()
    })

    it('does not render switch when value is undefined', () => {
      render(<EnabledDisableToggle {...defaultProps} value={undefined} />)
      expect(screen.queryByTestId('switch')).not.toBeInTheDocument()
    })
  })

  describe('enable button', () => {
    it('renders enable button when value is undefined', () => {
      render(<EnabledDisableToggle {...defaultProps} value={undefined} />)
      expect(screen.getByTestId('button-primary')).toBeInTheDocument()
      expect(screen.getByTestId('button-primary')).toHaveTextContent(/Enable/)
    })

    it('renders enable button when value is null', () => {
      render(<EnabledDisableToggle {...defaultProps} value={null} />)
      expect(screen.getByTestId('button-primary')).toBeInTheDocument()
    })

    it('renders enable button when value is false', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} />)
      expect(screen.getByTestId('button-primary')).toBeInTheDocument()
    })

    it('does not render enable button when value is true', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} />)
      expect(screen.queryByTestId('button-primary')).not.toBeInTheDocument()
    })

    it('renders enable button with correct label for tank', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} tankNumber={1} />)
      expect(screen.getByTestId('button-primary')).toHaveTextContent('Enable Tank 1 Circulation')
    })

    it('renders enable button with correct label for air exhaust', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} tankNumber={0} />)
      expect(screen.getByTestId('button-primary')).toHaveTextContent('Enable Air Exhaust System')
    })

    it('enables enable button when not disabled and not offline', () => {
      render(
        <EnabledDisableToggle
          {...defaultProps}
          value={false}
          isButtonDisabled={false}
          isOffline={false}
        />,
      )
      expect(screen.getByTestId('button-primary')).not.toBeDisabled()
    })

    it('disables enable button when isButtonDisabled is true', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} isButtonDisabled={true} />)
      expect(screen.getByTestId('button-primary')).toBeDisabled()
    })

    it('disables enable button when isOffline is true', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} isOffline={true} />)
      expect(screen.getByTestId('button-primary')).toBeDisabled()
    })

    it('disables enable button when both isOffline and isButtonDisabled are true', () => {
      render(
        <EnabledDisableToggle
          {...defaultProps}
          value={false}
          isOffline={true}
          isButtonDisabled={true}
        />,
      )
      expect(screen.getByTestId('button-primary')).toBeDisabled()
    })

    it('calls onToggle with isOn true when enable button clicked', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} tankNumber={1} />)
      fireEvent.click(screen.getByTestId('button-primary'))
      expect(mockOnToggle).toHaveBeenCalledWith({ tankNumber: 1, isOn: true })
    })

    it('calls onToggle once when enable button clicked', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} />)
      fireEvent.click(screen.getByTestId('button-primary'))
      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('disable button', () => {
    it('renders disable button when value is true', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} />)
      expect(screen.getByTestId('button-outline')).toBeInTheDocument()
      expect(screen.getByTestId('button-outline')).toHaveTextContent(/Disable/)
    })

    it('renders disable button when value is undefined', () => {
      render(<EnabledDisableToggle {...defaultProps} value={undefined} />)
      expect(screen.getByTestId('button-outline')).toBeInTheDocument()
    })

    it('renders disable button when value is null', () => {
      render(<EnabledDisableToggle {...defaultProps} value={null} />)
      expect(screen.getByTestId('button-outline')).toBeInTheDocument()
    })

    it('does not render disable button when value is false', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} />)
      expect(screen.queryByTestId('button-outline')).not.toBeInTheDocument()
    })

    it('renders disable button with correct label for tank', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} tankNumber={2} />)
      expect(screen.getByTestId('button-outline')).toHaveTextContent('Disable Tank 2 Circulation')
    })

    it('renders disable button with correct label for air exhaust', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} tankNumber={0} />)
      expect(screen.getByTestId('button-outline')).toHaveTextContent('Disable Air Exhaust System')
    })

    it('enables disable button when not disabled and not offline', () => {
      render(
        <EnabledDisableToggle
          {...defaultProps}
          value={true}
          isButtonDisabled={false}
          isOffline={false}
        />,
      )
      expect(screen.getByTestId('button-outline')).not.toBeDisabled()
    })

    it('disables disable button when isButtonDisabled is true', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} isButtonDisabled={true} />)
      expect(screen.getByTestId('button-outline')).toBeDisabled()
    })

    it('disables disable button when isOffline is true', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} isOffline={true} />)
      expect(screen.getByTestId('button-outline')).toBeDisabled()
    })

    it('disables disable button when both isOffline and isButtonDisabled are true', () => {
      render(
        <EnabledDisableToggle
          {...defaultProps}
          value={true}
          isOffline={true}
          isButtonDisabled={true}
        />,
      )
      expect(screen.getByTestId('button-outline')).toBeDisabled()
    })

    it('calls onToggle with isOn false when disable button clicked', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} tankNumber={1} />)
      fireEvent.click(screen.getByTestId('button-outline'))
      expect(mockOnToggle).toHaveBeenCalledWith({ tankNumber: 1, isOn: false })
    })

    it('calls onToggle once when disable button clicked', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} />)
      fireEvent.click(screen.getByTestId('button-outline'))
      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('onToggle callback params', () => {
    it('passes tankNumber to onToggle when enable clicked', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} tankNumber={2} />)
      fireEvent.click(screen.getByTestId('button-primary'))
      expect(mockOnToggle).toHaveBeenCalledWith({ tankNumber: 2, isOn: true })
    })

    it('passes tankNumber to onToggle when disable clicked', () => {
      render(<EnabledDisableToggle {...defaultProps} value={true} tankNumber={2} />)
      fireEvent.click(screen.getByTestId('button-outline'))
      expect(mockOnToggle).toHaveBeenCalledWith({ tankNumber: 2, isOn: false })
    })

    it('passes string tankNumber to onToggle', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} tankNumber="tank-a" />)
      fireEvent.click(screen.getByTestId('button-primary'))
      expect(mockOnToggle).toHaveBeenCalledWith({ tankNumber: 'tank-a', isOn: true })
    })

    it('passes falsy tankNumber to onToggle', () => {
      render(<EnabledDisableToggle {...defaultProps} value={false} tankNumber={0} />)
      fireEvent.click(screen.getByTestId('button-primary'))
      expect(mockOnToggle).toHaveBeenCalledWith({ tankNumber: 0, isOn: true })
    })
  })

  describe('non-boolean value edge cases', () => {
    it('renders both buttons when value is a string', () => {
      render(<EnabledDisableToggle {...defaultProps} value="some-string" />)
      expect(screen.getByTestId('button-primary')).toBeInTheDocument()
      expect(screen.getByTestId('button-outline')).toBeInTheDocument()
    })

    it('renders both buttons when value is a number', () => {
      render(<EnabledDisableToggle {...defaultProps} value={42} />)
      expect(screen.getByTestId('button-primary')).toBeInTheDocument()
      expect(screen.getByTestId('button-outline')).toBeInTheDocument()
    })

    it('renders both buttons when value is an object', () => {
      render(<EnabledDisableToggle {...defaultProps} value={{}} />)
      expect(screen.getByTestId('button-primary')).toBeInTheDocument()
      expect(screen.getByTestId('button-outline')).toBeInTheDocument()
    })
  })
})
