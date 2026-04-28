import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../types/device'
import { DEVICE_STATUS } from '../../../../../constants/devices'
import type { BitMainImmersionSummaryBoxProps } from '../bitmain-immersion-summary-box'
import { BitMainImmersionSummaryBox } from '../bitmain-immersion-summary-box'
import {
  getImmersionTemperatureColor,
  shouldImmersionTemperatureFlash,
} from '../../../explorer/containers/bitmain-immersion/bitmain-immersion-utils'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()

  return {
    ...actual,
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
    formatValueUnit: (value: unknown, unit: string) => `${value}${unit}`,
  }
})

vi.mock('../../../explorer/containers/bitmain-immersion/bitmain-immersion-utils', () => ({
  getImmersionTemperatureColor: vi.fn(() => 'var(--test-color)'),
  shouldImmersionTemperatureFlash: vi.fn(() => false),
}))

const buildDevice = (
  containerSpecific: Record<string, unknown>,
  statsOverrides: Record<string, unknown> = {},
): Device =>
  ({
    id: 'container-1',
    type: 'bitmain-immersion',
    last: {
      snap: {
        stats: {
          status: 'running',
          container_specific: containerSpecific,
          ...statsOverrides,
        },
      },
    },
  }) as Device

const defaultCs = {
  second_supply_temp1: 40,
  second_supply_temp2: 41,
  primary_supply_temp: 42,
  second_pump2: true,
  second_pump1: true,
  second_pump1_fault: false,
  second_pump2_fault: false,
  one_pump: true,
}

const renderRoot = (props: BitMainImmersionSummaryBoxProps = {}) => {
  const { container } = render(
    <BitMainImmersionSummaryBox data={buildDevice(defaultCs)} {...props} />,
  )

  return container.querySelector('.mdk-bitmain-immersion-summary-box') as HTMLElement
}

describe('BitMainImmersionSummaryBox', () => {
  describe('rendering', () => {
    it('should return null when data is undefined', () => {
      const { container } = render(<BitMainImmersionSummaryBox />)

      expect(container.firstChild).toBeNull()
    })

    it('should render root, pump section, and liquid stat cards', () => {
      const root = renderRoot()

      expect(root).toBeInTheDocument()
      expect(root.querySelector('.mdk-bitmain-immersion-summary-box__pumps')).toBeInTheDocument()
      expect(
        root.querySelector('.mdk-bitmain-immersion-summary-box__liquid-stats'),
      ).toBeInTheDocument()
      expect(within(root).getByText('Oil Pump #1')).toBeInTheDocument()
      expect(within(root).getByText('Oil Pump #2')).toBeInTheDocument()
      expect(within(root).getByText('Water pump')).toBeInTheDocument()
      expect(within(root).getByText('Liquid supply Temp')).toBeInTheDocument()
      expect(within(root).getByText('Supply Temp1')).toBeInTheDocument()
      expect(within(root).getByText('Supply Temp2')).toBeInTheDocument()
    })

    it('should render temperature values with unit', () => {
      const root = renderRoot()

      expect(root.textContent).toContain('42°C')
      expect(root.textContent).toContain('40°C')
      expect(root.textContent).toContain('41°C')
    })
  })

  describe('pump indicators', () => {
    it('should show Running with green for both oil pumps and water when healthy', () => {
      const root = renderRoot()

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators).toHaveLength(3)
      expect(indicators[0]).toHaveAttribute('data-color', 'green')
      expect(indicators[1]).toHaveAttribute('data-color', 'green')
      expect(indicators[2]).toHaveAttribute('data-color', 'green')
      expect(within(root).getAllByText(DEVICE_STATUS.RUNNING)).toHaveLength(3)
    })

    it('should show Error in red when oil pump fault', () => {
      const root = renderRoot({
        data: buildDevice({
          ...defaultCs,
          second_pump1_fault: true,
          second_pump1: true,
        }),
      })

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[0]).toHaveAttribute('data-color', 'red')
      expect(within(root).getByText(DEVICE_STATUS.ERROR)).toBeInTheDocument()
    })

    it('should show Off in gray when oil pump not running and no fault', () => {
      const root = renderRoot({
        data: buildDevice({
          ...defaultCs,
          second_pump1: false,
          second_pump1_fault: false,
        }),
      })

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[0]).toHaveAttribute('data-color', 'gray')
      expect(within(root).getAllByText(DEVICE_STATUS.OFF).length).toBeGreaterThanOrEqual(1)
    })

    it('should show water pump Off when one_pump is false', () => {
      const root = renderRoot({
        data: buildDevice({
          ...defaultCs,
          one_pump: false,
        }),
      })

      const indicators = within(root).getAllByTestId('indicator')

      expect(indicators[2]).toHaveAttribute('data-color', 'gray')
      expect(indicators[2]).toHaveTextContent(DEVICE_STATUS.OFF)
    })
  })

  describe('immersion temperature helpers', () => {
    it('should call getImmersionTemperatureColor and flash helpers for each supply temp', () => {
      vi.clearAllMocks()

      renderRoot({
        data: buildDevice({
          ...defaultCs,
          primary_supply_temp: 42,
          second_supply_temp1: 40,
          second_supply_temp2: 41,
        }),
      })

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(42, 'running', null)
      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(40, 'running', null)
      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(41, 'running', null)
      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledWith(42, 'running', null)
      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledWith(40, 'running', null)
      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledWith(41, 'running', null)
    })

    it('should use stats.status from snap when present', () => {
      vi.clearAllMocks()

      renderRoot({
        data: buildDevice(defaultCs, { status: 'stopped' }),
      })

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(42, 'stopped', null)
    })

    it('should pass containerSettings to immersion helpers', () => {
      vi.clearAllMocks()

      const containerSettings = {
        thresholds: {
          oilTemperature: {
            COLD: 30,
            LIGHT_WARM: 38,
            WARM: 44,
            HOT: 48,
            SUPERHOT: 52,
          },
        },
      }

      renderRoot({ containerSettings })

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(42, 'running', containerSettings)
    })

    it('should pass undefined temperatures to immersion helpers when supply temps are absent', () => {
      vi.clearAllMocks()

      renderRoot({
        data: buildDevice({
          second_pump1: true,
          second_pump2: true,
          second_pump1_fault: false,
          second_pump2_fault: false,
          one_pump: true,
        }),
      })

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(undefined, 'running', null)
      expect(getImmersionTemperatureColor).toHaveBeenCalledTimes(3)
      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledWith(undefined, 'running', null)
      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledTimes(3)
    })
  })

  describe('CSS structure', () => {
    it('should apply pump grid and liquid stats grid classes', () => {
      const root = renderRoot()

      expect(root.querySelectorAll('.mdk-bitmain-immersion-summary-box__pump')).toHaveLength(3)
      expect(
        root.querySelector('.mdk-bitmain-immersion-summary-box__liquid-stats'),
      ).toBeInTheDocument()
    })
  })
})
