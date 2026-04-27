import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PumpItem } from '../pump-box'
import { PumpBox } from '../pump-box'

// Mock the Indicator component
vi.mock('@mdk/core', () => ({
  Indicator: ({ color, size, children }: any) => (
    <div data-testid="indicator" data-color={color} data-size={size}>
      {children}
    </div>
  ),
}))

// Mock DEVICE_STATUS constants
vi.mock('../../../../../../../../constants/devices', () => ({
  DEVICE_STATUS: {
    RUNNING: 'Running',
    OFF: 'Off',
  },
}))

describe('pumpBox', () => {
  describe('rendering', () => {
    it('should render running pump correctly', () => {
      const pumpItem: PumpItem = {
        enabled: true,
        index: 0,
      }

      render(<PumpBox pumpItem={pumpItem} pumpTitle="Oil" />)

      expect(screen.getByText('Oil Pump 1')).toBeInTheDocument()
      expect(screen.getByText('Running')).toBeInTheDocument()

      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-color', 'green')
      expect(indicator).toHaveAttribute('data-size', 'md')
    })

    it('should render stopped pump correctly', () => {
      const pumpItem: PumpItem = {
        enabled: false,
        index: 1,
      }

      render(<PumpBox pumpItem={pumpItem} pumpTitle="Water" />)

      expect(screen.getByText('Water Pump 2')).toBeInTheDocument()
      expect(screen.getByText('Off')).toBeInTheDocument()

      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-color', 'gray')
    })

    it('should calculate pump number correctly (index + 1)', () => {
      const testCases = [
        { index: 0, expected: '1' },
        { index: 1, expected: '2' },
        { index: 5, expected: '6' },
      ]

      testCases.forEach(({ index, expected }) => {
        const { unmount } = render(<PumpBox pumpItem={{ enabled: true, index }} pumpTitle="Oil" />)

        expect(screen.getByText(`Oil Pump ${expected}`)).toBeInTheDocument()
        unmount()
      })
    })

    it('should render with different pump titles', () => {
      const pumpItem: PumpItem = { enabled: true, index: 0 }

      const { rerender } = render(<PumpBox pumpItem={pumpItem} pumpTitle="Oil" />)
      expect(screen.getByText('Oil Pump 1')).toBeInTheDocument()

      rerender(<PumpBox pumpItem={pumpItem} pumpTitle="Water" />)
      expect(screen.getByText('Water Pump 1')).toBeInTheDocument()

      rerender(<PumpBox pumpItem={pumpItem} pumpTitle="Coolant" />)
      expect(screen.getByText('Coolant Pump 1')).toBeInTheDocument()
    })
  })

  describe('null cases', () => {
    it('should return null when pumpItem is undefined', () => {
      const { container } = render(<PumpBox pumpItem={undefined} pumpTitle="Oil" />)
      expect(container.firstChild).toBeNull()
    })

    it('should return null when enabled property is missing', () => {
      const pumpItem = { index: 0 } as PumpItem
      const { container } = render(<PumpBox pumpItem={pumpItem} pumpTitle="Oil" />)
      expect(container.firstChild).toBeNull()
    })

    it('should return null when enabled is not a boolean', () => {
      const pumpItem = { enabled: 'true' as any, index: 0 }
      const { container } = render(<PumpBox pumpItem={pumpItem} pumpTitle="Oil" />)
      expect(container.firstChild).toBeNull()
    })

    it('should return null when pumpItem is null', () => {
      const { container } = render(<PumpBox pumpItem={null as any} pumpTitle="Oil" />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('state indicators', () => {
    it('should show green indicator when pump is running', () => {
      render(<PumpBox pumpItem={{ enabled: true, index: 0 }} pumpTitle="Oil" />)

      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-color', 'green')
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    it('should show gray indicator when pump is off', () => {
      render(<PumpBox pumpItem={{ enabled: false, index: 0 }} pumpTitle="Oil" />)

      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-color', 'gray')
      expect(screen.getByText('Off')).toBeInTheDocument()
    })
  })

  describe('css classes', () => {
    it('should apply correct CSS classes', () => {
      const { container } = render(
        <PumpBox pumpItem={{ enabled: true, index: 0 }} pumpTitle="Oil" />,
      )

      expect(container.querySelector('.mdk-pump-box')).toBeInTheDocument()
      expect(container.querySelector('.mdk-pump-box__status')).toBeInTheDocument()
      expect(container.querySelector('.mdk-pump-box__title')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle index 0', () => {
      render(<PumpBox pumpItem={{ enabled: true, index: 0 }} pumpTitle="Oil" />)
      expect(screen.getByText('Oil Pump 1')).toBeInTheDocument()
    })

    it('should handle large index numbers', () => {
      render(<PumpBox pumpItem={{ enabled: true, index: 999 }} pumpTitle="Oil" />)
      expect(screen.getByText('Oil Pump 1000')).toBeInTheDocument()
    })

    it('should handle negative index (edge case)', () => {
      render(<PumpBox pumpItem={{ enabled: true, index: -1 }} pumpTitle="Oil" />)
      expect(screen.getByText('Oil Pump 0')).toBeInTheDocument()
    })

    it('should handle empty pump title', () => {
      render(<PumpBox pumpItem={{ enabled: true, index: 0 }} pumpTitle="" />)
      expect(screen.getByText('Pump 1')).toBeInTheDocument()
    })

    it('should handle very long pump title', () => {
      const longTitle = 'Very Long Pump Title That Might Overflow'
      render(<PumpBox pumpItem={{ enabled: true, index: 0 }} pumpTitle={longTitle} />)
      expect(screen.getByText(`${longTitle} Pump 1`)).toBeInTheDocument()
    })
  })

  describe('type safety', () => {
    it('should only accept boolean for enabled property', () => {
      // These should return null (not boolean)
      const invalidCases = [
        { enabled: 1 as any, index: 0 },
        { enabled: 'true' as any, index: 0 },
        { enabled: null as any, index: 0 },
        { enabled: undefined, index: 0 },
      ]

      invalidCases.forEach((pumpItem) => {
        const { container, unmount } = render(<PumpBox pumpItem={pumpItem} pumpTitle="Oil" />)
        expect(container.firstChild).toBeNull()
        unmount()
      })
    })

    it('should accept valid PumpItem with boolean enabled', () => {
      const validCases = [
        { enabled: true, index: 0 },
        { enabled: false, index: 0 },
      ]

      validCases.forEach((pumpItem) => {
        const { container, unmount } = render(<PumpBox pumpItem={pumpItem} pumpTitle="Oil" />)
        expect(container.firstChild).not.toBeNull()
        unmount()
      })
    })
  })
})
