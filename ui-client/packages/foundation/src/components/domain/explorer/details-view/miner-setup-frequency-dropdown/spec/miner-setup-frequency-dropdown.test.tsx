import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MinerSetupFrequencyDropdown } from '../miner-setup-frequency-dropdown'

vi.mock('@tetherto/mdk-core-ui', () => ({
  Button: vi.fn(({ children, disabled, ...props }) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  )),
  DropdownMenu: {
    Root: vi.fn(({ children, open, onOpenChange }) => (
      <div data-testid="dropdown-root" data-open={String(open)}>
        {children}
        <button data-testid="open-change-trigger" onClick={() => onOpenChange?.(!open)} />
      </div>
    )),
    Trigger: vi.fn(({ children, disabled, asChild }) =>
      asChild ? (
        <span data-testid="dropdown-trigger" data-disabled={String(disabled)}>
          {children}
        </span>
      ) : (
        <button disabled={disabled} data-testid="dropdown-trigger">
          {children}
        </button>
      ),
    ),
    Content: vi.fn(({ children, align, side }) => (
      <div data-testid="dropdown-content" data-align={align} data-side={side}>
        {children}
      </div>
    )),
    Group: vi.fn(({ children }) => <div data-testid="dropdown-group">{children}</div>),
    Label: vi.fn(({ children }) => <div data-testid="dropdown-label">{children}</div>),
    StaticCheckboxItem: vi.fn(({ children, checked, onClick }) => (
      <div data-testid="dropdown-checkbox-item" data-checked={String(checked)} onClick={onClick}>
        {children}
      </div>
    )),
  },
}))

describe('MinerSetupFrequencyDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the dropdown root', () => {
      render(<MinerSetupFrequencyDropdown />)
      expect(screen.getByTestId('dropdown-root')).toBeInTheDocument()
    })

    it('renders the trigger button with buttonText', () => {
      render(<MinerSetupFrequencyDropdown buttonText="Set Frequency" />)
      expect(screen.getByRole('button', { name: 'Set Frequency' })).toBeInTheDocument()
    })

    it('renders empty button text by default', () => {
      render(<MinerSetupFrequencyDropdown />)
      expect(screen.getByTestId('dropdown-label')).toHaveTextContent('')
    })

    it('renders the label with buttonText', () => {
      render(<MinerSetupFrequencyDropdown buttonText="Set Frequency" />)
      expect(screen.getByTestId('dropdown-label')).toHaveTextContent('Set Frequency')
    })

    it('renders 10 checkbox items', () => {
      render(<MinerSetupFrequencyDropdown />)
      expect(screen.getAllByTestId('dropdown-checkbox-item')).toHaveLength(10)
    })

    it('renders frequency items with correct labels', () => {
      render(<MinerSetupFrequencyDropdown />)
      const items = screen.getAllByTestId('dropdown-checkbox-item')
      items.forEach((item, index) => {
        expect(item).toHaveTextContent(`Frequency: ${index}`)
      })
    })

    it('passes align="start" and side="top" to Content', () => {
      render(<MinerSetupFrequencyDropdown />)
      const content = screen.getByTestId('dropdown-content')
      expect(content).toHaveAttribute('data-align', 'start')
      expect(content).toHaveAttribute('data-side', 'top')
    })
  })

  describe('open state', () => {
    it('renders with closed state by default', () => {
      render(<MinerSetupFrequencyDropdown />)
      expect(screen.getByTestId('dropdown-root')).toHaveAttribute('data-open', 'false')
    })

    it('opens when onOpenChange is called with true', () => {
      render(<MinerSetupFrequencyDropdown />)
      fireEvent.click(screen.getByTestId('open-change-trigger'))
      expect(screen.getByTestId('dropdown-root')).toHaveAttribute('data-open', 'true')
    })

    it('closes when an item is clicked', () => {
      render(<MinerSetupFrequencyDropdown onFrequencyToggle={vi.fn()} />)

      fireEvent.click(screen.getByTestId('open-change-trigger'))
      expect(screen.getByTestId('dropdown-root')).toHaveAttribute('data-open', 'true')

      fireEvent.click(screen.getAllByTestId('dropdown-checkbox-item')[0])
      expect(screen.getByTestId('dropdown-root')).toHaveAttribute('data-open', 'false')
    })

    it('closes and reopens correctly', () => {
      render(<MinerSetupFrequencyDropdown />)

      fireEvent.click(screen.getByTestId('open-change-trigger'))
      expect(screen.getByTestId('dropdown-root')).toHaveAttribute('data-open', 'true')

      fireEvent.click(screen.getByTestId('open-change-trigger'))
      expect(screen.getByTestId('dropdown-root')).toHaveAttribute('data-open', 'false')
    })
  })

  describe('disabled', () => {
    it('passes disabled prop to trigger', () => {
      render(<MinerSetupFrequencyDropdown disabled={true} buttonText="Freq" />)
      expect(screen.getByTestId('dropdown-trigger')).toHaveAttribute('data-disabled', 'true')
    })

    it('passes disabled=false to trigger when not disabled', () => {
      render(<MinerSetupFrequencyDropdown disabled={false} buttonText="Freq" />)
      expect(screen.getByTestId('dropdown-trigger')).toHaveAttribute('data-disabled', 'false')
    })

    it('passes disabled=undefined to trigger by default', () => {
      render(<MinerSetupFrequencyDropdown buttonText="Freq" />)
      expect(screen.getByTestId('dropdown-trigger')).toHaveAttribute('data-disabled', 'undefined')
    })
  })

  describe('checked state', () => {
    it('marks items as checked when their index is in selectedFrequency', () => {
      render(<MinerSetupFrequencyDropdown selectedFrequency={[0, 3, 7]} />)
      const items = screen.getAllByTestId('dropdown-checkbox-item')
      expect(items[0]).toHaveAttribute('data-checked', 'true')
      expect(items[3]).toHaveAttribute('data-checked', 'true')
      expect(items[7]).toHaveAttribute('data-checked', 'true')
    })

    it('marks items as unchecked when not in selectedFrequency', () => {
      render(<MinerSetupFrequencyDropdown selectedFrequency={[0]} />)
      const items = screen.getAllByTestId('dropdown-checkbox-item')
      expect(items[1]).toHaveAttribute('data-checked', 'false')
      expect(items[5]).toHaveAttribute('data-checked', 'false')
    })

    it('marks all items as unchecked when selectedFrequency is empty', () => {
      render(<MinerSetupFrequencyDropdown selectedFrequency={[]} />)
      screen.getAllByTestId('dropdown-checkbox-item').forEach((item) => {
        expect(item).toHaveAttribute('data-checked', 'false')
      })
    })

    it('marks all items as unchecked by default', () => {
      render(<MinerSetupFrequencyDropdown />)
      screen.getAllByTestId('dropdown-checkbox-item').forEach((item) => {
        expect(item).toHaveAttribute('data-checked', 'false')
      })
    })

    it('accepts number values in selectedFrequency', () => {
      render(<MinerSetupFrequencyDropdown selectedFrequency={[2, 5]} />)
      const items = screen.getAllByTestId('dropdown-checkbox-item')
      expect(items[2]).toHaveAttribute('data-checked', 'true')
      expect(items[5]).toHaveAttribute('data-checked', 'true')
    })

    it('accepts string values in selectedFrequency', () => {
      render(<MinerSetupFrequencyDropdown selectedFrequency={['1', '4']} />)
      const items = screen.getAllByTestId('dropdown-checkbox-item')
      expect(items[1]).toHaveAttribute('data-checked', 'true')
      expect(items[4]).toHaveAttribute('data-checked', 'true')
    })
  })

  describe('onFrequencyToggle', () => {
    it('calls onFrequencyToggle with the string index when an item is clicked', () => {
      const onFrequencyToggle = vi.fn()
      render(<MinerSetupFrequencyDropdown onFrequencyToggle={onFrequencyToggle} />)
      fireEvent.click(screen.getAllByTestId('dropdown-checkbox-item')[3])
      expect(onFrequencyToggle).toHaveBeenCalledWith('3')
    })

    it('calls onFrequencyToggle with "0" when first item is clicked', () => {
      const onFrequencyToggle = vi.fn()
      render(<MinerSetupFrequencyDropdown onFrequencyToggle={onFrequencyToggle} />)
      fireEvent.click(screen.getAllByTestId('dropdown-checkbox-item')[0])
      expect(onFrequencyToggle).toHaveBeenCalledWith('0')
    })

    it('calls onFrequencyToggle with "9" when last item is clicked', () => {
      const onFrequencyToggle = vi.fn()
      render(<MinerSetupFrequencyDropdown onFrequencyToggle={onFrequencyToggle} />)
      const items = screen.getAllByTestId('dropdown-checkbox-item')
      fireEvent.click(items[items.length - 1])
      expect(onFrequencyToggle).toHaveBeenCalledWith('9')
    })

    it('does not throw when onFrequencyToggle is not provided and item is clicked', () => {
      render(<MinerSetupFrequencyDropdown />)
      expect(() =>
        fireEvent.click(screen.getAllByTestId('dropdown-checkbox-item')[0]),
      ).not.toThrow()
    })

    it('calls onFrequencyToggle once per click', () => {
      const onFrequencyToggle = vi.fn()
      render(<MinerSetupFrequencyDropdown onFrequencyToggle={onFrequencyToggle} />)
      fireEvent.click(screen.getAllByTestId('dropdown-checkbox-item')[2])
      expect(onFrequencyToggle).toHaveBeenCalledTimes(1)
    })

    it('closes the dropdown and calls onFrequencyToggle when item clicked', () => {
      const onFrequencyToggle = vi.fn()
      render(<MinerSetupFrequencyDropdown onFrequencyToggle={onFrequencyToggle} />)

      fireEvent.click(screen.getByTestId('open-change-trigger'))
      expect(screen.getByTestId('dropdown-root')).toHaveAttribute('data-open', 'true')

      fireEvent.click(screen.getAllByTestId('dropdown-checkbox-item')[4])

      expect(onFrequencyToggle).toHaveBeenCalledWith('4')
      expect(screen.getByTestId('dropdown-root')).toHaveAttribute('data-open', 'false')
    })
  })
})
