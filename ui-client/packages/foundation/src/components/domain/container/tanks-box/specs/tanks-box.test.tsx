import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { TanksBoxProps } from '../tanks-box'
import { TanksBox } from '../tanks-box'

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
  UNITS: { PRESSURE_BAR: 'bar', TEMPERATURE_C: '°C' },
}))

vi.mock('../../../../../constants/devices', () => ({
  DEVICE_STATUS: {
    RUNNING: 'Running',
    OFF: 'Off',
  },
}))

const minimalData: TanksBoxProps['data'] = {
  oil_pump: [{ cold_temp_c: 42, enabled: true }],
  water_pump: [{ enabled: true }],
  pressure: [{}],
}

const renderRoot = (rootElement: ReactNode) => {
  const { container } = render(rootElement)

  return container.querySelector('.mdk-tanks-box') as HTMLElement
}

describe('TanksBox', () => {
  describe('rendering', () => {
    it('should render single tank with label and temperature', () => {
      const root = renderRoot(<TanksBox data={minimalData} />)

      expect(root).toBeInTheDocument()
      expect(within(root).getByText('Tank 1')).toBeInTheDocument()

      const tempValue = root.querySelector('.mdk-tanks-box__param-value')

      expect(tempValue).toHaveTextContent('42°C')
      expect(within(root).getByText('Temperature')).toBeInTheDocument()
    })

    it('should render multiple tanks with correct labels', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [
              { cold_temp_c: 40, enabled: true },
              { cold_temp_c: 44, enabled: false },
            ],
            water_pump: [{ enabled: true }, { enabled: false }],
            pressure: [{}, {}],
          }}
        />,
      )

      expect(root).toBeInTheDocument()
      expect(within(root).getByText('Tank 1')).toBeInTheDocument()
      expect(within(root).getByText('Tank 2')).toBeInTheDocument()
      expect(root.textContent).toContain('40°C')
      expect(root.textContent).toContain('44°C')
    })

    it('should render pressure when value is provided', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [{ cold_temp_c: 45, enabled: true }],
            water_pump: [{ enabled: true }],
            pressure: [{ value: 1.2 }],
          }}
        />,
      )

      expect(root).toBeInTheDocument()
      expect(within(root).getByText('Pressure')).toBeInTheDocument()

      const paramValues = root.querySelectorAll('.mdk-tanks-box__param-value')
      const pressureValue = Array.from(paramValues).find(
        (el) => (el.textContent ?? '').includes('1.2') && (el.textContent ?? '').includes('bar'),
      )

      expect(pressureValue).toHaveTextContent(/1\.2\s*bar/)
    })

    it('should not render pressure block when pressure value is missing', () => {
      const root = renderRoot(<TanksBox data={minimalData} />)

      expect(root).toBeInTheDocument()

      const pressureLabels = within(root).queryAllByText('Pressure')

      expect(pressureLabels).toHaveLength(0)
    })

    it('should render Oil Pump and Water Pump statuses', () => {
      const root = renderRoot(<TanksBox data={minimalData} />)

      expect(root).toBeInTheDocument()
      expect(within(root).getByText('Oil Pump')).toBeInTheDocument()
      expect(within(root).getByText('Water Pump')).toBeInTheDocument()
      expect(within(root).getAllByText('Running')).toHaveLength(2)
    })

    it('should show Off when pumps are disabled', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [{ cold_temp_c: 42, enabled: false }],
            water_pump: [{ enabled: false }],
            pressure: [{}],
          }}
        />,
      )

      expect(root).toBeInTheDocument()
      expect(within(root).getAllByText('Off')).toHaveLength(2)
    })

    it('should pass correct indicator colors for pump states', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [{ cold_temp_c: 42, enabled: true }],
            water_pump: [{ enabled: false }],
            pressure: [{}],
          }}
        />,
      )

      expect(root).toBeInTheDocument()

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators).toHaveLength(2)
      expect(indicators[0]).toHaveAttribute('data-color', 'green')
      expect(indicators[1]).toHaveAttribute('data-color', 'gray')
    })
  })

  describe('null and empty data', () => {
    it('should return null when data is null', () => {
      const root = renderRoot(<TanksBox data={null as unknown as TanksBoxProps['data']} />)

      expect(root).toBeNull()
    })

    it('should return null when data is undefined', () => {
      const root = renderRoot(<TanksBox data={undefined as unknown as TanksBoxProps['data']} />)

      expect(root).toBeNull()
    })

    it('should render root with no rows when oil_pump is empty', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [],
            water_pump: [],
            pressure: [],
          }}
        />,
      )

      expect(root).toBeInTheDocument()
      expect(within(root).queryByText('Tank 1')).not.toBeInTheDocument()
    })
  })

  describe('water_pump and pressure fallbacks', () => {
    it('should use false for water pump when water_pump entry is missing at index', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [{ cold_temp_c: 42, enabled: true }],
            water_pump: [],
            pressure: [],
          }}
        />,
      )

      expect(root).toBeInTheDocument()
      expect(within(root).getByText('Water Pump')).toBeInTheDocument()
      expect(within(root).getAllByText('Off')).toHaveLength(1)
      expect(within(root).getByText('Running')).toBeInTheDocument()
    })

    it('should not throw when pressure array is shorter than oil_pump', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [
              { cold_temp_c: 40, enabled: true },
              { cold_temp_c: 44, enabled: true },
            ],
            water_pump: [{ enabled: true }, { enabled: true }],
            pressure: [{ value: 1.0 }],
          }}
        />,
      )

      expect(root).toBeInTheDocument()
      expect(within(root).getByText('Tank 1')).toBeInTheDocument()
      expect(within(root).getByText('Tank 2')).toBeInTheDocument()
    })
  })

  describe('CSS classes', () => {
    it('should apply root and row CSS classes', () => {
      const root = renderRoot(<TanksBox data={minimalData} />)

      expect(root).toBeInTheDocument()
      expect(root.querySelector('.mdk-tanks-box__row')).toBeInTheDocument()
      expect(root.querySelector('.mdk-tanks-box__params')).toBeInTheDocument()
      expect(root.querySelector('.mdk-tanks-box__pump-statuses')).toBeInTheDocument()
    })
  })

  describe('optional props', () => {
    it('should render with flash and tooltip on oil_pump', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [
              {
                cold_temp_c: 55,
                enabled: true,
                flash: true,
                tooltip: 'High temperature',
              },
            ],
            water_pump: [{ enabled: true }],
            pressure: [{}],
          }}
        />,
      )

      expect(root).toBeInTheDocument()

      const tempValue = root.querySelector('.mdk-tanks-box__param-value')

      expect(tempValue).toHaveTextContent('55°C')

      const tooltip = within(root).getByTestId('tooltip')

      expect(tooltip).toHaveAttribute('data-content', 'High temperature')
    })

    it('should render pressure with tooltip when provided', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [{ cold_temp_c: 42, enabled: true }],
            water_pump: [{ enabled: true }],
            pressure: [{ value: 1.5, tooltip: 'Elevated pressure' }],
          }}
        />,
      )

      expect(root).toBeInTheDocument()

      const tooltips = within(root).getAllByTestId('tooltip')
      const pressureTooltip = tooltips.find((el) =>
        el.getAttribute('data-content')?.includes('Elevated pressure'),
      )

      expect(pressureTooltip).toBeDefined()
    })

    it('should render with color on tank', () => {
      const root = renderRoot(
        <TanksBox
          data={{
            oil_pump: [{ cold_temp_c: 42, enabled: true, color: '#34c759' }],
            water_pump: [{ enabled: true }],
            pressure: [{}],
          }}
        />,
      )

      expect(root).toBeInTheDocument()

      const label = root.querySelector('.mdk-tanks-box__param-label')

      expect(label).toHaveStyle({ color: '#34c759' })
    })
  })
})
