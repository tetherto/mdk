import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../types/device'
import type { SupplyLiquidBoxProps } from '../supply-liquid-box'
import { SupplyLiquidBox } from '../supply-liquid-box'
import {
  getAntspaceSupplyLiquidPressureColor,
  getAntspaceSupplyLiquidTemperatureColor,
  shouldAntspacePressureFlash,
  shouldAntspacePressureSuperflash,
  shouldAntspaceSupplyLiquidTempFlash,
  shouldAntspaceSupplyLiquidTempSuperflash,
} from '../../../explorer/containers/bitmain/bitmain-hydro-utils'

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()

  return {
    ...actual,
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

vi.mock('../../../explorer/containers/bitmain/bitmain-hydro-utils', () => ({
  getAntspaceSupplyLiquidPressureColor: vi.fn(() => 'var(--pressure-color)'),
  getAntspaceSupplyLiquidTemperatureColor: vi.fn(() => 'var(--temp-color)'),
  shouldAntspacePressureFlash: vi.fn(() => false),
  shouldAntspacePressureSuperflash: vi.fn(() => false),
  shouldAntspaceSupplyLiquidTempFlash: vi.fn(() => false),
  shouldAntspaceSupplyLiquidTempSuperflash: vi.fn(() => false),
}))

const buildDevice = (
  stats: Record<string, unknown>,
  containerSpecific: Record<string, unknown> = {},
): Device =>
  ({
    id: 'container-1',
    type: 'bitmain-hydro',
    last: {
      snap: {
        stats: {
          status: 'running',
          container_specific: containerSpecific,
          ...stats,
        },
      },
    },
  }) as Device

const defaultStats = {
  supply_liquid_temp: 35,
  supply_liquid_set_temp: 32,
  supply_liquid_pressure: 2.5,
}

const renderRoot = (props: SupplyLiquidBoxProps = {}) => {
  const { container } = render(<SupplyLiquidBox data={buildDevice(defaultStats)} {...props} />)

  return container.querySelector('.mdk-supply-liquid-box') as HTMLElement
}

describe('SupplyLiquidBox', () => {
  describe('rendering', () => {
    it('should return null when data is undefined', () => {
      const { container } = render(<SupplyLiquidBox />)

      expect(container.firstChild).toBeNull()
    })

    it('should render root and stat grid', () => {
      const root = renderRoot()

      expect(root).toBeInTheDocument()
      expect(root.querySelector('.mdk-supply-liquid-box__stats')).toBeInTheDocument()
      const titles = within(root).getAllByText('Supply Liquid')

      expect(titles).toHaveLength(3)
      expect(within(root).getByText('Temp')).toBeInTheDocument()
      expect(within(root).getByText('Set Temp')).toBeInTheDocument()
      expect(within(root).getByText('Pressure')).toBeInTheDocument()
    })

    it('should render temperature and pressure values with units', () => {
      const root = renderRoot()

      expect(root.textContent).toContain('35°C')
      expect(root.textContent).toContain('32°C')
      expect(root.textContent).toContain('2.5bar')
    })

    it('should resolve supply liquid temp from water_temperature when supply_liquid_temp is absent', () => {
      const root = renderRoot({
        data: buildDevice({
          water_temperature: 40,
          supply_liquid_set_temp: 30,
          supply_liquid_pressure: 2.1,
        }),
      })

      expect(root.textContent).toContain('40°C')
    })

    it('should prefer snap stats over container_specific when both define a field', () => {
      const root = renderRoot({
        data: buildDevice(
          {
            supply_liquid_temp: 22,
            supply_liquid_set_temp: 20,
            supply_liquid_pressure: 2.5,
          },
          {
            supply_liquid_temp: 99,
            supply_liquid_set_temp: 99,
            supply_liquid_pressure: 9.9,
          },
        ),
      })

      expect(root.textContent).toContain('22°C')
      expect(root.textContent).toContain('20°C')
      expect(root.textContent).toContain('2.5bar')
    })

    it('should read values from container_specific when missing from stats', () => {
      const root = renderRoot({
        data: buildDevice(
          {},
          {
            supply_liquid_temp: 28,
            supply_liquid_set_temp: 27,
            supply_liquid_pressure: 2.2,
          },
        ),
      })

      expect(root.textContent).toContain('28°C')
      expect(root.textContent).toContain('27°C')
      expect(root.textContent).toContain('2.2bar')
    })
  })

  describe('antspace hydro helpers', () => {
    it('should call temperature helpers for supply and set temps and pressure helpers for pressure', () => {
      vi.clearAllMocks()

      renderRoot({
        data: buildDevice({
          supply_liquid_temp: 35,
          supply_liquid_set_temp: 32,
          supply_liquid_pressure: 2.5,
        }),
      })

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
        35,
        'running',
        expect.any(Object),
        null,
      )
      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
        32,
        'running',
        expect.any(Object),
        null,
      )
      expect(shouldAntspaceSupplyLiquidTempFlash).toHaveBeenCalledWith(
        35,
        'running',
        expect.any(Object),
        null,
      )
      expect(shouldAntspaceSupplyLiquidTempFlash).toHaveBeenCalledWith(
        32,
        'running',
        expect.any(Object),
        null,
      )
      expect(shouldAntspaceSupplyLiquidTempSuperflash).toHaveBeenCalledWith(
        35,
        'running',
        expect.any(Object),
        null,
      )
      expect(shouldAntspaceSupplyLiquidTempSuperflash).toHaveBeenCalledWith(
        32,
        'running',
        expect.any(Object),
        null,
      )
      expect(getAntspaceSupplyLiquidPressureColor).toHaveBeenCalledWith(
        2.5,
        'running',
        expect.any(Object),
        null,
      )
      expect(shouldAntspacePressureFlash).toHaveBeenCalledWith(
        2.5,
        'running',
        expect.any(Object),
        null,
      )
      expect(shouldAntspacePressureSuperflash).toHaveBeenCalledWith(
        2.5,
        'running',
        expect.any(Object),
        null,
      )
    })

    it('should use stats.status from snap when present', () => {
      vi.clearAllMocks()

      renderRoot({
        data: buildDevice({
          ...defaultStats,
          status: 'stopped',
        }),
      })

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
        35,
        'stopped',
        expect.any(Object),
        null,
      )
    })

    it('should pass containerSettings to hydro helpers', () => {
      vi.clearAllMocks()

      const containerSettings = {
        thresholds: {
          waterTemperature: {
            criticalLow: 21,
            alarmLow: 21,
            alert: 25,
            normal: 30,
            alarmHigh: 37,
            criticalHigh: 40,
          },
        },
      }

      renderRoot({ containerSettings })

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
        35,
        'running',
        expect.any(Object),
        containerSettings,
      )
    })

    it('should pass undefined metric values through to helpers when fields are absent', () => {
      vi.clearAllMocks()

      renderRoot({
        data: buildDevice({ status: 'running' }),
      })

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
        undefined,
        'running',
        expect.any(Object),
        null,
      )
      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledTimes(2)
      expect(getAntspaceSupplyLiquidPressureColor).toHaveBeenCalledWith(
        undefined,
        'running',
        expect.any(Object),
        null,
      )
    })
  })

  describe('CSS structure', () => {
    it('should apply stats grid with full-width first card', () => {
      const root = renderRoot()

      expect(root.querySelector('.mdk-supply-liquid-box__stats')).toBeInTheDocument()
    })
  })
})
