import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatusItem } from '../status-item'

import { Indicator } from '@tetherto/mdk-core-ui'

// Mock the Indicator component
vi.mock('@tetherto/mdk-core-ui', () => ({
  Indicator: vi.fn(({ color, size, children }) => (
    <div data-testid="indicator" data-color={color} data-size={size}>
      {children}
    </div>
  )),
}))

describe('statusItem', () => {
  describe('rendering', () => {
    it('should render label', () => {
      render(<StatusItem label="Temperature" status="normal" />)

      expect(screen.getByText('Temperature')).toBeInTheDocument()
    })

    it('should render status text in Indicator', () => {
      render(<StatusItem label="Pressure" status="warning" />)

      expect(screen.getByText('Warning')).toBeInTheDocument()
    })

    it('should render without label', () => {
      render(<StatusItem status="fault" />)

      expect(screen.getByText('Fault')).toBeInTheDocument()
    })

    it('should render Indicator component', () => {
      render(<StatusItem label="Test" status="normal" />)

      expect(screen.getByTestId('indicator')).toBeInTheDocument()
    })
  })

  describe('status types', () => {
    it('should render normal status with green color', () => {
      render(<StatusItem label="Test" status="normal" />)

      const indicator = screen.getByTestId('indicator')
      expect(screen.getByText('Normal')).toBeInTheDocument()
      expect(indicator).toHaveAttribute('data-color', 'green')
    })

    it('should render warning status with amber color', () => {
      render(<StatusItem label="Test" status="warning" />)

      const indicator = screen.getByTestId('indicator')
      expect(screen.getByText('Warning')).toBeInTheDocument()
      expect(indicator).toHaveAttribute('data-color', 'amber')
    })

    it('should render fault status with red color', () => {
      render(<StatusItem label="Test" status="fault" />)

      const indicator = screen.getByTestId('indicator')
      expect(screen.getByText('Fault')).toBeInTheDocument()
      expect(indicator).toHaveAttribute('data-color', 'red')
    })

    it('should render unavailable status with gray color', () => {
      render(<StatusItem label="Test" status="unavailable" />)

      const indicator = screen.getByTestId('indicator')
      expect(screen.getByText('Unavailable')).toBeInTheDocument()
      expect(indicator).toHaveAttribute('data-color', 'gray')
    })
  })

  describe('indicator component integration', () => {
    it('should pass correct color to Indicator for normal status', () => {
      render(<StatusItem label="Test" status="normal" />)

      expect(Indicator).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green', size: 'md' }),
        expect.anything(),
      )
    })

    it('should pass correct color to Indicator for warning status', () => {
      render(<StatusItem label="Test" status="warning" />)

      expect(Indicator).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'amber', size: 'md' }),
        expect.anything(),
      )
    })

    it('should pass correct color to Indicator for fault status', () => {
      render(<StatusItem label="Test" status="fault" />)

      expect(Indicator).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', size: 'md' }),
        expect.anything(),
      )
    })

    it('should pass correct color to Indicator for unavailable status', () => {
      render(<StatusItem label="Test" status="unavailable" />)

      expect(Indicator).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'gray', size: 'md' }),
        expect.anything(),
      )
    })

    it('should pass size md to Indicator', () => {
      render(<StatusItem label="Test" status="normal" />)

      expect(Indicator).toHaveBeenCalledWith(
        expect.objectContaining({ size: 'md' }),
        expect.anything(),
      )
    })
  })

  describe('edge cases', () => {
    it('should render unavailable status when status is undefined', () => {
      render(<StatusItem label="Test" />)

      expect(screen.getByText('Unavailable')).toBeInTheDocument()
      expect(screen.queryByText('Normal')).not.toBeInTheDocument()
      expect(screen.queryByText('Warning')).not.toBeInTheDocument()
      expect(screen.queryByText('Fault')).not.toBeInTheDocument()
    })

    it('should use gray color when status is undefined', () => {
      render(<StatusItem label="Test" />)

      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-color', 'gray')
    })

    it('should render with both label and status undefined', () => {
      const { container } = render(<StatusItem />)

      expect(container.querySelector('.mdk-status-item')).toBeInTheDocument()
      expect(screen.getByText('Unavailable')).toBeInTheDocument()
    })

    it('should not render label element when label is undefined', () => {
      const { container } = render(<StatusItem status="normal" />)

      const label = container.querySelector('.mdk-status-item__label')
      expect(label).toBeEmptyDOMElement()
    })
  })

  describe('structure', () => {
    it('should have correct class structure', () => {
      const { container } = render(<StatusItem label="Test" status="normal" />)

      expect(container.querySelector('.mdk-status-item')).toBeInTheDocument()
      expect(container.querySelector('.mdk-status-item__content')).toBeInTheDocument()
      expect(container.querySelector('.mdk-status-item__label')).toBeInTheDocument()
    })

    it('should render label text correctly', () => {
      render(<StatusItem label="Custom Label" status="normal" />)

      expect(screen.getByText('Custom Label')).toBeInTheDocument()
    })
  })

  describe('status label mapping', () => {
    it('should map normal to Normal', () => {
      render(<StatusItem status="normal" />)
      expect(screen.getByText('Normal')).toBeInTheDocument()
    })

    it('should map warning to Warning', () => {
      render(<StatusItem status="warning" />)
      expect(screen.getByText('Warning')).toBeInTheDocument()
    })

    it('should map fault to Fault', () => {
      render(<StatusItem status="fault" />)
      expect(screen.getByText('Fault')).toBeInTheDocument()
    })

    it('should map unavailable to Unavailable', () => {
      render(<StatusItem status="unavailable" />)
      expect(screen.getByText('Unavailable')).toBeInTheDocument()
    })
  })

  describe('component props', () => {
    it('should pass children text to Indicator', () => {
      render(<StatusItem label="Test" status="warning" />)

      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveTextContent('Warning')
    })

    it('should render all status types with correct labels and colors', () => {
      const statuses: Array<{
        status: 'normal' | 'warning' | 'fault' | 'unavailable'
        label: string
        color: string
      }> = [
        { status: 'normal', label: 'Normal', color: 'green' },
        { status: 'warning', label: 'Warning', color: 'amber' },
        { status: 'fault', label: 'Fault', color: 'red' },
        { status: 'unavailable', label: 'Unavailable', color: 'gray' },
      ]

      statuses.forEach(({ status, label, color }) => {
        const { unmount } = render(<StatusItem label="Test" status={status} />)

        expect(screen.getByText(label)).toBeInTheDocument()
        expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', color)

        unmount()
      })
    })
  })
})
