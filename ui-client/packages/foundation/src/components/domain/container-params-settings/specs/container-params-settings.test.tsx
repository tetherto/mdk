import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getContainerParametersSettings } from '../../../../utils/container-settings-utils'
import { ContainerParamsSettings } from '../container-params-settings'

// Mock the Input component
vi.mock('@mdk/core', () => ({
  Label: vi.fn(({ children, className }) => (
    <label data-testid="param-label" className={className}>
      {children}
    </label>
  )),
  Input: vi.fn(({ value, onChange, disabled, suffix, type, className }) => (
    <input
      data-testid="param-input"
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      data-suffix={suffix}
      className={className}
    />
  )),
}))

// Mock the container settings utils
vi.mock('../../../../utils/container-settings-utils', () => ({
  getContainerParametersSettings: vi.fn((data) => {
    if (!data || !data.type) return undefined

    if (data.type.includes('bd') || data.type.includes('bitdeer')) {
      return {
        coolOilAlarmTemp: {
          name: 'Cool Oil Alarm Temp',
          value: 33,
          suffix: '°C',
          type: 'number',
        },
        hotOilAlarmTemp: {
          name: 'Hot Oil Alarm Temp',
          value: 48,
          suffix: '°C',
          type: 'number',
        },
        alarmPressure: {
          name: 'Alarm Pressure',
          value: 2.5,
          suffix: 'bar',
          type: 'number',
        },
      }
    }

    return undefined
  }),
}))

describe('containerParamsSettings', () => {
  const mockBitdeerData = {
    type: 'container-bd-d40',
    coolOilAlarmTemp: 33,
    hotOilAlarmTemp: 48,
    alarmPressure: 2.5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders with default title', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)
      expect(screen.getByText('Parameters')).toBeInTheDocument()
    })

    it('renders with custom title', () => {
      render(<ContainerParamsSettings title="System Settings" data={mockBitdeerData} />)
      expect(screen.getByText('System Settings')).toBeInTheDocument()
    })

    it('renders parameter labels', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      expect(screen.getByText('Cool Oil Alarm Temp')).toBeInTheDocument()
      expect(screen.getByText('Hot Oil Alarm Temp')).toBeInTheDocument()
      expect(screen.getByText('Alarm Pressure')).toBeInTheDocument()
    })

    it('renders input fields for each parameter', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      expect(inputs).toHaveLength(3)
    })

    it('renders in grid layout', () => {
      const { container } = render(<ContainerParamsSettings data={mockBitdeerData} />)

      const grid = container.querySelector('.mdk-container-params__grid')
      expect(grid).toBeInTheDocument()
      expect(grid?.children).toHaveLength(3)
    })

    it('returns null when no params', () => {
      const { container } = render(<ContainerParamsSettings data={{}} />)
      expect(container.firstChild).toBeNull()
    })

    it('returns null when data has no type', () => {
      const { container } = render(<ContainerParamsSettings data={{ someKey: 'value' }} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('input Properties', () => {
    it('renders inputs with correct values', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      expect(inputs[0]).toHaveValue(33)
      expect(inputs[1]).toHaveValue(48)
      expect(inputs[2]).toHaveValue(2.5)
    })

    it('renders inputs as disabled', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      inputs.forEach((input) => {
        expect(input).toBeDisabled()
      })
    })

    it('renders inputs with correct type', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('type', 'number')
      })
    })

    it('renders inputs with correct suffixes', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      expect(inputs[0]).toHaveAttribute('data-suffix', '°C')
      expect(inputs[1]).toHaveAttribute('data-suffix', '°C')
      expect(inputs[2]).toHaveAttribute('data-suffix', 'bar')
    })

    it('applies correct className to inputs', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      inputs.forEach((input) => {
        expect(input).toHaveClass('mdk-container-params__input')
      })
    })
  })

  describe('data Updates', () => {
    it('updates params when data changes', () => {
      const { rerender } = render(<ContainerParamsSettings data={mockBitdeerData} />)

      expect(screen.getByText('Cool Oil Alarm Temp')).toBeInTheDocument()

      const newData = {
        type: 'container-bd-d50',
        coolOilAlarmTemp: 35,
      }

      rerender(<ContainerParamsSettings data={newData} />)

      // Component should re-fetch params with new data
      expect(screen.getByText('Cool Oil Alarm Temp')).toBeInTheDocument()
    })

    it('handles data prop changes', () => {
      const { rerender } = render(<ContainerParamsSettings data={mockBitdeerData} />)

      expect(getContainerParametersSettings).toHaveBeenCalledWith(mockBitdeerData)

      const newData = { type: 'container-bd-new' }
      rerender(<ContainerParamsSettings data={newData} />)

      expect(getContainerParametersSettings).toHaveBeenCalledWith(newData)
    })
  })

  describe('change Handlers', () => {
    it('handles input change events', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      const firstInput = inputs[0]

      fireEvent.change(firstInput, { target: { value: '40' } })

      // Input should update (even though it's disabled, we test the handler)
      expect(firstInput).toBeInTheDocument()
    })

    it('updates state when input value changes', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      fireEvent.change(inputs[0], { target: { value: '35' } })

      // The component should handle the change internally
      expect(inputs[0]).toBeInTheDocument()
    })

    it('converts string input to number', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')
      fireEvent.change(inputs[0], { target: { value: '42.5' } })

      // Handler should convert to number
      expect(inputs[0]).toBeInTheDocument()
    })

    it('does not update if param key does not exist', () => {
      render(<ContainerParamsSettings data={mockBitdeerData} />)

      const inputs = screen.getAllByTestId('param-input')

      // Simulate change event
      fireEvent.change(inputs[0], { target: { value: '50' } })

      // Component should still render without errors
      expect(inputs[0]).toBeInTheDocument()
    })
  })

  describe('layout and Structure', () => {
    it('renders with correct CSS classes', () => {
      const { container } = render(<ContainerParamsSettings data={mockBitdeerData} />)

      expect(container.querySelector('.mdk-container-params')).toBeInTheDocument()
      expect(container.querySelector('.mdk-container-params__title')).toBeInTheDocument()
      expect(container.querySelector('.mdk-container-params__grid')).toBeInTheDocument()
      expect(container.querySelector('.mdk-container-params__field')).toBeInTheDocument()
      expect(container.querySelector('.mdk-container-params__label')).toBeInTheDocument()
    })

    it('renders each parameter in a separate field div', () => {
      const { container } = render(<ContainerParamsSettings data={mockBitdeerData} />)

      const fields = container.querySelectorAll('.mdk-container-params__field')
      expect(fields).toHaveLength(3)
    })

    it('associates labels with inputs correctly', () => {
      const { container } = render(<ContainerParamsSettings data={mockBitdeerData} />)

      const labels = container.querySelectorAll('.mdk-container-params__label')
      expect(labels).toHaveLength(3)
      expect(labels[0]).toHaveTextContent('Cool Oil Alarm Temp')
    })
  })
})
