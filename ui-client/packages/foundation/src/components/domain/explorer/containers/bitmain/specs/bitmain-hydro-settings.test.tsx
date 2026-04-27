import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types/device'
import { HydroEditableThresholdForm } from '../../../../container-params-settings/hydro-editable-threshold-form'
import { BitMainHydroSettings } from '../bitmain-hydro-settings'
import {
  getAntspaceSupplyLiquidPressureColor,
  getAntspaceSupplyLiquidTemperatureColor,
  shouldAntspacePressureFlash,
  shouldAntspacePressureSuperflash,
  shouldAntspaceSupplyLiquidTempFlash,
  shouldAntspaceSupplyLiquidTempSuperflash,
} from '../bitmain-hydro-utils'
import { BitMainBasicSettings } from '../status-item'

// Mock child components
vi.mock('../status-item', () => ({
  BitMainBasicSettings: vi.fn(({ data }) => (
    <div data-testid="basic-settings">Basic Settings - {data?.id || 'no-data'}</div>
  )),
}))

vi.mock('../../../../container-params-settings/hydro-editable-threshold-form', () => ({
  HydroEditableThresholdForm: vi.fn(
    ({
      data,
      waterTempColorFunc,
      waterTempFlashFunc,
      waterTempSuperflashFunc,
      pressureColorFunc,
      pressureFlashFunc,
      pressureSuperflashFunc,
    }) => (
      <div data-testid="threshold-form">
        <div data-testid="device-id">{data?.id || 'no-data'}</div>
        <div data-testid="water-temp-color">{waterTempColorFunc?.(45)}</div>
        <div data-testid="water-temp-flash">{String(waterTempFlashFunc?.(45))}</div>
        <div data-testid="water-temp-superflash">{String(waterTempSuperflashFunc?.(45))}</div>
        <div data-testid="pressure-color">{pressureColorFunc?.(1.8)}</div>
        <div data-testid="pressure-flash">{String(pressureFlashFunc?.(1.8))}</div>
        <div data-testid="pressure-superflash">{String(pressureSuperflashFunc?.(1.8))}</div>
      </div>
    ),
  ),
}))

// Mock utils
vi.mock('../bitmain-hydro-utils', () => ({
  getAntspaceSupplyLiquidTemperatureColor: vi.fn((value) => {
    if (value < 40) return 'green'
    if (value < 50) return 'yellow'
    return 'red'
  }),
  getAntspaceSupplyLiquidPressureColor: vi.fn((value) => {
    if (value < 1.5) return 'blue'
    if (value < 2.0) return 'green'
    return 'orange'
  }),
  shouldAntspaceSupplyLiquidTempFlash: vi.fn((value) => value >= 50),
  shouldAntspaceSupplyLiquidTempSuperflash: vi.fn((value) => value >= 60),
  shouldAntspacePressureFlash: vi.fn((value) => value >= 2.0),
  shouldAntspacePressureSuperflash: vi.fn((value) => value >= 2.5),
}))

describe('BitMainHydroSettings', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'bitmain-hydro',
    status: 'active',
    last: {
      snap: {
        stats: {
          water_temperature: 45,
          supply_liquid_pressure: 1.8,
        },
        config: {},
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<BitMainHydroSettings data={mockDevice} />)
      expect(screen.getByTestId('basic-settings')).toBeInTheDocument()
      expect(screen.getByTestId('threshold-form')).toBeInTheDocument()
    })

    it('renders BitMainBasicSettings component', () => {
      render(<BitMainHydroSettings data={mockDevice} />)
      expect(screen.getByText(/Basic Settings/)).toBeInTheDocument()
    })

    it('renders HydroEditableThresholdForm component', () => {
      render(<BitMainHydroSettings data={mockDevice} />)
      expect(screen.getByTestId('threshold-form')).toBeInTheDocument()
    })

    it('renders without data', () => {
      render(<BitMainHydroSettings />)

      expect(screen.getByTestId('basic-settings')).toBeInTheDocument()
      expect(screen.getByTestId('threshold-form')).toBeInTheDocument()
    })
  })

  describe('structure', () => {
    it('has correct wrapper class', () => {
      const { container } = render(<BitMainHydroSettings data={mockDevice} />)

      expect(container.querySelector('.mdk-bitmain-hydro-settings')).toBeInTheDocument()
    })

    it('has params section', () => {
      const { container } = render(<BitMainHydroSettings data={mockDevice} />)

      expect(container.querySelector('.mdk-bitmain-hydro-settings__params')).toBeInTheDocument()
    })

    it('has thresholds section', () => {
      const { container } = render(<BitMainHydroSettings data={mockDevice} />)

      expect(container.querySelector('.mdk-bitmain-hydro-settings__thresholds')).toBeInTheDocument()
    })

    it('renders two sections', () => {
      const { container } = render(<BitMainHydroSettings data={mockDevice} />)

      const sections = container.querySelectorAll('section')
      expect(sections).toHaveLength(2)
    })
  })

  describe('data passing', () => {
    it('passes data to BitMainBasicSettings', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(BitMainBasicSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockDevice,
        }),
        expect.anything(),
      )
    })

    it('passes data to HydroEditableThresholdForm', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(HydroEditableThresholdForm).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockDevice,
        }),
        expect.anything(),
      )
    })

    it('passes undefined data correctly', () => {
      render(<BitMainHydroSettings data={undefined} />)

      expect(BitMainBasicSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          data: undefined,
        }),
        expect.anything(),
      )
    })
  })

  describe('function passing', () => {
    it('passes all threshold functions to HydroEditableThresholdForm', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(HydroEditableThresholdForm).toHaveBeenCalledWith(
        expect.objectContaining({
          waterTempColorFunc: expect.any(Function),
          waterTempFlashFunc: expect.any(Function),
          waterTempSuperflashFunc: expect.any(Function),
          pressureColorFunc: expect.any(Function),
          pressureFlashFunc: expect.any(Function),
          pressureSuperflashFunc: expect.any(Function),
        }),
        expect.anything(),
      )
    })

    it('waterTempColorFunc calls getAntspaceSupplyLiquidTemperatureColor', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(45, 'active', mockDevice)
      expect(screen.getByTestId('water-temp-color')).toHaveTextContent('yellow')
    })

    it('waterTempFlashFunc calls shouldAntspaceSupplyLiquidTempFlash', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(shouldAntspaceSupplyLiquidTempFlash).toHaveBeenCalledWith(45, 'active', mockDevice)
      expect(screen.getByTestId('water-temp-flash')).toHaveTextContent('false')
    })

    it('waterTempSuperflashFunc calls shouldAntspaceSupplyLiquidTempSuperflash', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(shouldAntspaceSupplyLiquidTempSuperflash).toHaveBeenCalledWith(
        45,
        'active',
        mockDevice,
      )
      expect(screen.getByTestId('water-temp-superflash')).toHaveTextContent('false')
    })

    it('pressureColorFunc calls getAntspaceSupplyLiquidPressureColor', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(getAntspaceSupplyLiquidPressureColor).toHaveBeenCalledWith(1.8, 'active', mockDevice)
      expect(screen.getByTestId('pressure-color')).toHaveTextContent('green')
    })

    it('pressureFlashFunc calls shouldAntspacePressureFlash', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(shouldAntspacePressureFlash).toHaveBeenCalledWith(1.8, 'active', mockDevice)
      expect(screen.getByTestId('pressure-flash')).toHaveTextContent('false')
    })

    it('pressureSuperflashFunc calls shouldAntspacePressureSuperflash', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(shouldAntspacePressureSuperflash).toHaveBeenCalledWith(1.8, 'active', mockDevice)
      expect(screen.getByTestId('pressure-superflash')).toHaveTextContent('false')
    })
  })

  describe('device status handling', () => {
    it('extracts and uses device status', () => {
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(45, 'active', mockDevice)
    })

    it('handles undefined status', () => {
      const deviceWithoutStatus = { ...mockDevice, status: undefined }
      render(<BitMainHydroSettings data={deviceWithoutStatus} />)

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
        45,
        undefined,
        deviceWithoutStatus,
      )
    })

    it('handles different status values', () => {
      const statuses = ['active', 'stopped', 'offline', 'error', 'maintenance']

      statuses.forEach((status) => {
        vi.clearAllMocks()
        const deviceWithStatus = { ...mockDevice, status }
        render(<BitMainHydroSettings data={deviceWithStatus} />)

        expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
          45,
          status,
          deviceWithStatus,
        )
      })
    })

    it('passes status to all utility functions', () => {
      const stoppedDevice = { ...mockDevice, status: 'stopped' }
      render(<BitMainHydroSettings data={stoppedDevice} />)

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
        45,
        'stopped',
        stoppedDevice,
      )
      expect(shouldAntspaceSupplyLiquidTempFlash).toHaveBeenCalledWith(45, 'stopped', stoppedDevice)
      expect(shouldAntspaceSupplyLiquidTempSuperflash).toHaveBeenCalledWith(
        45,
        'stopped',
        stoppedDevice,
      )
      expect(getAntspaceSupplyLiquidPressureColor).toHaveBeenCalledWith(
        1.8,
        'stopped',
        stoppedDevice,
      )
      expect(shouldAntspacePressureFlash).toHaveBeenCalledWith(1.8, 'stopped', stoppedDevice)
      expect(shouldAntspacePressureSuperflash).toHaveBeenCalledWith(1.8, 'stopped', stoppedDevice)
    })
  })

  describe('function return values', () => {
    it('returns correct color for different temperatures', () => {
      const { rerender } = render(<BitMainHydroSettings data={mockDevice} />)

      // Test with different mock return values
      vi.mocked(getAntspaceSupplyLiquidTemperatureColor).mockReturnValueOnce('green')
      rerender(<BitMainHydroSettings data={mockDevice} />)
      expect(screen.getByTestId('water-temp-color')).toHaveTextContent('green')

      vi.mocked(getAntspaceSupplyLiquidTemperatureColor).mockReturnValueOnce('red')
      rerender(<BitMainHydroSettings data={mockDevice} />)
      expect(screen.getByTestId('water-temp-color')).toHaveTextContent('red')
    })

    it('returns correct flash states', () => {
      vi.mocked(shouldAntspaceSupplyLiquidTempFlash).mockReturnValueOnce(true)
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(screen.getByTestId('water-temp-flash')).toHaveTextContent('true')
    })

    it('returns correct superflash states', () => {
      vi.mocked(shouldAntspaceSupplyLiquidTempSuperflash).mockReturnValueOnce(true)
      render(<BitMainHydroSettings data={mockDevice} />)

      expect(screen.getByTestId('water-temp-superflash')).toHaveTextContent('true')
    })
  })

  describe('edge cases', () => {
    it('handles empty device object', () => {
      const emptyDevice = {} as Device
      render(<BitMainHydroSettings data={emptyDevice} />)

      expect(screen.getByTestId('basic-settings')).toBeInTheDocument()
      expect(screen.getByTestId('threshold-form')).toBeInTheDocument()
    })

    it('handles device without last property', () => {
      const deviceWithoutLast = { id: 'test', type: 'bitmain-hydro' } as Device
      render(<BitMainHydroSettings data={deviceWithoutLast} />)

      expect(screen.getByTestId('basic-settings')).toBeInTheDocument()
    })

    it('handles null status', () => {
      const deviceWithNullStatus = { ...mockDevice, status: null as any }
      render(<BitMainHydroSettings data={deviceWithNullStatus} />)

      expect(getAntspaceSupplyLiquidTemperatureColor).toHaveBeenCalledWith(
        45,
        null,
        deviceWithNullStatus,
      )
    })
  })

  describe('component composition', () => {
    it('renders basic settings before threshold form', () => {
      const { container } = render(<BitMainHydroSettings data={mockDevice} />)

      const sections = container.querySelectorAll('section')
      const basicSettings = sections[0].querySelector('[data-testid="basic-settings"]')
      const thresholdForm = sections[1].querySelector('[data-testid="threshold-form"]')

      expect(basicSettings).toBeInTheDocument()
      expect(thresholdForm).toBeInTheDocument()
    })

    it('maintains correct section structure', () => {
      const { container } = render(<BitMainHydroSettings data={mockDevice} />)

      const paramsSection = container.querySelector('.mdk-bitmain-hydro-settings__params')
      const thresholdsSection = container.querySelector('.mdk-bitmain-hydro-settings__thresholds')

      expect(paramsSection?.querySelector('[data-testid="basic-settings"]')).toBeInTheDocument()
      expect(thresholdsSection?.querySelector('[data-testid="threshold-form"]')).toBeInTheDocument()
    })
  })
})
