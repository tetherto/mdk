// @vitest-environment jsdom
import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TankRowProps } from '../tank-row'
import { TankRow } from '../tank-row'

vi.mock('@tetherto/core', () => ({
  Indicator: ({
    color,
    size,
    children,
  }: {
    color: string
    size: string
    children: React.ReactNode
  }) => (
    <div data-testid="indicator" data-color={color} data-size={size}>
      {children}
    </div>
  ),
  SimpleTooltip: ({
    content,
    children,
  }: {
    content: React.ReactNode
    children: React.ReactNode
  }) => (
    <span data-testid="tooltip" data-content={String(content)}>
      {children}
    </span>
  ),
  UNITS: { PRESSURE_BAR: 'bar' },
}))

vi.mock('../../../../../constants/devices', () => ({
  DEVICE_STATUS: {
    RUNNING: 'Running',
    OFF: 'Off',
  },
}))

const defaultProps: TankRowProps = {
  label: 'Tank 1',
  temperature: 42,
  unit: '°C',
  oilPumpEnabled: true,
  waterPumpEnabled: true,
  color: '',
  pressure: {},
}

const renderRoot = (props: Partial<TankRowProps> = {}) => {
  const { container } = render(<TankRow {...defaultProps} {...props} />)
  return container.querySelector('.mdk-tanks-box__row') as HTMLElement
}

describe('TankRow', () => {
  describe('rendering', () => {
    it('should render label and temperature', () => {
      const root = renderRoot()

      expect(root).toBeInTheDocument()
      expect(within(root).getByText('Tank 1')).toBeInTheDocument()
      expect(within(root).getByText('Temperature')).toBeInTheDocument()

      const tempValue = root.querySelector('.mdk-tanks-box__param-value')

      expect(tempValue).toHaveTextContent('42°C')
    })

    it('should use default temperature tooltip when tooltip is not provided', () => {
      const root = renderRoot()

      const tooltip = within(root).getByTestId('tooltip')

      expect(tooltip).toHaveAttribute('data-content', 'Temperature: 42°C')
    })

    it('should use custom tooltip when provided', () => {
      const root = renderRoot({ tooltip: 'Custom temp tooltip' })

      const tooltip = within(root).getByTestId('tooltip')

      expect(tooltip).toHaveAttribute('data-content', 'Custom temp tooltip')
    })

    it('should render temperature label with color fallback when color is empty', () => {
      const root = renderRoot({ color: '' })

      const label = root.querySelector('.mdk-tanks-box__param-label')

      expect(label).toHaveStyle({ color: 'var(--mdk-color-white-5)' })
    })

    it('should render temperature label and value with custom color', () => {
      const root = renderRoot({ color: '#34c759' })

      const labels = root.querySelectorAll('.mdk-tanks-box__param-label')

      expect(labels[0]).toHaveStyle({ color: '#34c759' })

      const values = root.querySelectorAll('.mdk-tanks-box__param-value')

      expect(values[0]).toHaveStyle({ color: '#34c759' })
    })

    it('should set data-flash on label and value when flash is true', () => {
      const root = renderRoot({ flash: true })

      const label = root.querySelector('.mdk-tanks-box__param-label')
      const value = root.querySelector('.mdk-tanks-box__param-value')

      expect(label).toHaveAttribute('data-flash', 'true')
      expect(value).toHaveAttribute('data-flash', 'true')
    })

    it('should not set data-flash when flash is undefined', () => {
      const root = renderRoot({ flash: undefined })

      const label = root.querySelector('.mdk-tanks-box__param-label')

      expect(label).not.toHaveAttribute('data-flash')
    })
  })

  describe('pressure', () => {
    it('should not render pressure block when pressure.value is undefined', () => {
      const root = renderRoot({ pressure: {} })

      const pressureLabels = within(root).queryAllByText('Pressure')

      expect(pressureLabels).toHaveLength(0)
    })

    it('should not render pressure block when pressure.value is null', () => {
      const root = renderRoot({ pressure: { value: null as unknown as number } })

      const pressureLabels = within(root).queryAllByText('Pressure')

      expect(pressureLabels).toHaveLength(0)
    })

    it('should render pressure block when pressure.value is provided', () => {
      const root = renderRoot({ pressure: { value: 1.2 } })

      expect(within(root).getByText('Pressure')).toBeInTheDocument()

      const paramValues = root.querySelectorAll('.mdk-tanks-box__param-value')
      const pressureValue = Array.from(paramValues).find(
        (el) => (el.textContent ?? '').includes('1.2') && (el.textContent ?? '').includes('bar'),
      )

      expect(pressureValue).toHaveTextContent(/1\.2\s*bar/)
    })

    it('should use default pressure tooltip when pressure.tooltip is not provided', () => {
      const root = renderRoot({ pressure: { value: 1.2 } })

      const tooltips = within(root).getAllByTestId('tooltip')
      const pressureTooltip = tooltips.find((el) =>
        el.getAttribute('data-content')?.startsWith('Pressure:'),
      )

      expect(pressureTooltip).toHaveAttribute('data-content', 'Pressure: 1.2 bar')
    })

    it('should use custom pressure tooltip when provided', () => {
      const root = renderRoot({
        pressure: { value: 1.5, tooltip: 'Elevated pressure' },
      })

      const tooltips = within(root).getAllByTestId('tooltip')
      const pressureTooltip = tooltips.find((el) =>
        el.getAttribute('data-content')?.includes('Elevated pressure'),
      )

      expect(pressureTooltip).toBeDefined()
    })

    it('should render pressure label and value with pressure.color fallback', () => {
      const root = renderRoot({ pressure: { value: 1.0 } })

      const labels = root.querySelectorAll('.mdk-tanks-box__param-label')

      expect(labels[1]).toHaveStyle({ color: 'var(--mdk-color-white-5)' })

      const values = root.querySelectorAll('.mdk-tanks-box__param-value')

      expect(values[1]).toHaveStyle({ color: 'var(--mdk-color-white)' })
    })

    it('should render pressure with custom pressure.color', () => {
      const root = renderRoot({
        pressure: { value: 1.2, color: '#ff3b30' },
      })

      const labels = root.querySelectorAll('.mdk-tanks-box__param-label')

      expect(labels[1]).toHaveStyle({ color: '#ff3b30' })

      const values = root.querySelectorAll('.mdk-tanks-box__param-value')

      expect(values[1]).toHaveStyle({ color: '#ff3b30' })
    })

    it('should set data-flash on pressure label and value when pressure.flash is true', () => {
      const root = renderRoot({ pressure: { value: 1.2, flash: true } })

      const labels = root.querySelectorAll('.mdk-tanks-box__param-label')
      const values = root.querySelectorAll('.mdk-tanks-box__param-value')

      expect(labels[1]).toHaveAttribute('data-flash', 'true')
      expect(values[1]).toHaveAttribute('data-flash', 'true')
    })
  })

  describe('pump statuses', () => {
    it('should render Oil Pump and Water Pump with Running when both enabled', () => {
      const root = renderRoot({ oilPumpEnabled: true, waterPumpEnabled: true })

      expect(within(root).getByText('Oil Pump')).toBeInTheDocument()
      expect(within(root).getByText('Water Pump')).toBeInTheDocument()
      expect(within(root).getAllByText('Running')).toHaveLength(2)

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[0]).toHaveAttribute('data-color', 'green')
      expect(indicators[1]).toHaveAttribute('data-color', 'green')
    })

    it('should render Oil Pump Off and Water Pump Running when only water enabled', () => {
      const root = renderRoot({ oilPumpEnabled: false, waterPumpEnabled: true })

      expect(within(root).getAllByText('Off')).toHaveLength(1)
      expect(within(root).getAllByText('Running')).toHaveLength(1)

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[0]).toHaveAttribute('data-color', 'gray')
      expect(indicators[1]).toHaveAttribute('data-color', 'green')
    })

    it('should render both pumps Off when both disabled', () => {
      const root = renderRoot({ oilPumpEnabled: false, waterPumpEnabled: false })

      expect(within(root).getAllByText('Off')).toHaveLength(2)

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[0]).toHaveAttribute('data-color', 'gray')
      expect(indicators[1]).toHaveAttribute('data-color', 'gray')
    })
  })

  describe('CSS structure', () => {
    it('should apply row and param CSS classes', () => {
      const root = renderRoot()

      expect(root).toHaveClass('mdk-tanks-box__row')
      expect(root.querySelector('.mdk-tanks-box__params')).toBeInTheDocument()
      expect(root.querySelectorAll('.mdk-tanks-box__param').length).toBeGreaterThanOrEqual(1)
      expect(root.querySelector('.mdk-tanks-box__pump-statuses')).toBeInTheDocument()
      expect(root.querySelectorAll('.mdk-tanks-box__pump-status')).toHaveLength(2)
    })
  })
})
