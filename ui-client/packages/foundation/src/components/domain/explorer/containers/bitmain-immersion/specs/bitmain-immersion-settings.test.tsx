import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types'
import { ImmersionEditableThresholdForm } from '../../../../container-params-settings/immersion-editable-threshold-form'
import { BitMainImmersionSettings } from '../bitmain-immersion-settings'
import {
  getImmersionTemperatureColor,
  shouldImmersionTemperatureFlash,
  shouldImmersionTemperatureSuperflash,
} from '../bitmain-immersion-utils'

vi.mock('../../../../container-params-settings/immersion-editable-threshold-form', () => ({
  ImmersionEditableThresholdForm: vi.fn(
    ({ data, oilTempColorFunc, oilTempFlashFunc, oilTempSuperflashFunc }) => (
      <div data-testid="immersion-form">
        <div data-testid="device-id">{data?.id}</div>
        <div data-testid="color-result">{oilTempColorFunc?.(45)}</div>
        <div data-testid="flash-result">{String(oilTempFlashFunc?.(45))}</div>
        <div data-testid="superflash-result">{String(oilTempSuperflashFunc?.(45))}</div>
      </div>
    ),
  ),
}))

vi.mock('../bitmain-immersion-utils', () => ({
  getImmersionTemperatureColor: vi.fn((value) => {
    if (value < 40) return 'green'
    if (value < 50) return 'yellow'
    return 'red'
  }),
  shouldImmersionTemperatureFlash: vi.fn((value) => {
    return value >= 50
  }),
  shouldImmersionTemperatureSuperflash: vi.fn((value) => {
    return value >= 60
  }),
}))

describe('BitMainImmersionSettings', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'bitmain-immersion',
    status: 'active',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders ImmersionEditableThresholdForm', () => {
      render(<BitMainImmersionSettings data={mockDevice} />)

      expect(screen.getByTestId('immersion-form')).toBeInTheDocument()
    })

    it('passes device data to form', () => {
      render(<BitMainImmersionSettings data={mockDevice} />)

      expect(screen.getByTestId('device-id')).toHaveTextContent('device-1')
    })

    it('renders without device data', () => {
      render(<BitMainImmersionSettings />)

      expect(screen.getByTestId('immersion-form')).toBeInTheDocument()
    })

    it('renders with custom container settings', () => {
      const containerSettings = {
        thresholds: {
          oilTemperature: {
            COLD: 30,
            WARM: 40,
            HOT: 50,
          },
        },
      }

      render(<BitMainImmersionSettings data={mockDevice} containerSettings={containerSettings} />)

      expect(screen.getByTestId('immersion-form')).toBeInTheDocument()
    })
  })

  describe('color function', () => {
    it('passes oilTempColorFunc that calls getImmersionTemperatureColor', () => {
      render(<BitMainImmersionSettings data={mockDevice} />)

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', null)
      expect(screen.getByTestId('color-result')).toHaveTextContent('yellow')
    })

    it('uses device status in color function', () => {
      const stoppedDevice = { ...mockDevice, status: 'stopped' }
      render(<BitMainImmersionSettings data={stoppedDevice} />)

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'stopped', null)
    })

    it('uses container settings in color function', () => {
      const containerSettings = { thresholds: { test: 'value' } }
      render(<BitMainImmersionSettings data={mockDevice} containerSettings={containerSettings} />)

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', containerSettings)
    })

    it('defaults to active status when device status is missing', () => {
      const deviceWithoutStatus = { ...mockDevice, status: undefined }
      render(<BitMainImmersionSettings data={deviceWithoutStatus} />)

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', null)
    })
  })

  describe('flash function', () => {
    it('passes oilTempFlashFunc that calls shouldImmersionTemperatureFlash', () => {
      render(<BitMainImmersionSettings data={mockDevice} />)

      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledWith(45, 'active', null)
      expect(screen.getByTestId('flash-result')).toHaveTextContent('false')
    })

    it('uses device status in flash function', () => {
      const offlineDevice = { ...mockDevice, status: 'offline' }
      render(<BitMainImmersionSettings data={offlineDevice} />)

      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledWith(45, 'offline', null)
    })

    it('uses container settings in flash function', () => {
      const containerSettings = { thresholds: { test: 'value' } }
      render(<BitMainImmersionSettings data={mockDevice} containerSettings={containerSettings} />)

      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledWith(45, 'active', containerSettings)
    })
  })

  describe('superflash function', () => {
    it('passes oilTempSuperflashFunc that calls shouldImmersionTemperatureSuperflash', () => {
      render(<BitMainImmersionSettings data={mockDevice} />)

      expect(shouldImmersionTemperatureSuperflash).toHaveBeenCalledWith(45, 'active', null)
      expect(screen.getByTestId('superflash-result')).toHaveTextContent('false')
    })

    it('uses device status in superflash function', () => {
      const errorDevice = { ...mockDevice, status: 'error' }
      render(<BitMainImmersionSettings data={errorDevice} />)

      expect(shouldImmersionTemperatureSuperflash).toHaveBeenCalledWith(45, 'error', null)
    })

    it('uses container settings in superflash function', () => {
      const containerSettings = { thresholds: { test: 'value' } }
      render(<BitMainImmersionSettings data={mockDevice} containerSettings={containerSettings} />)

      expect(shouldImmersionTemperatureSuperflash).toHaveBeenCalledWith(
        45,
        'active',
        containerSettings,
      )
    })
  })

  describe('prop passing', () => {
    it('passes all props correctly to ImmersionEditableThresholdForm', () => {
      const containerSettings = {
        thresholds: {
          oilTemperature: { COLD: 30, WARM: 40, HOT: 50 },
        },
      }

      render(<BitMainImmersionSettings data={mockDevice} containerSettings={containerSettings} />)

      expect(ImmersionEditableThresholdForm).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockDevice,
          oilTempColorFunc: expect.any(Function),
          oilTempFlashFunc: expect.any(Function),
          oilTempSuperflashFunc: expect.any(Function),
        }),
        expect.anything(),
      )
    })

    it('passes null as default for containerSettings', () => {
      render(<BitMainImmersionSettings data={mockDevice} />)

      const calls = vi.mocked(ImmersionEditableThresholdForm).mock.calls
      const props = calls[0][0]

      // Test that functions are called with null settings
      props.oilTempColorFunc(45)
      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', null)
    })
  })

  describe('function behavior with different values', () => {
    it('color function works with low temperature', () => {
      vi.mocked(getImmersionTemperatureColor).mockReturnValueOnce('green')

      render(<BitMainImmersionSettings data={mockDevice} />)

      expect(screen.getByTestId('color-result')).toHaveTextContent('green')
    })

    it('color function works with high temperature', () => {
      vi.mocked(getImmersionTemperatureColor).mockReturnValueOnce('red')

      render(<BitMainImmersionSettings data={mockDevice} />)
      expect(screen.getByTestId('color-result')).toHaveTextContent('red')
    })

    it('flash function returns true for high values', () => {
      vi.mocked(shouldImmersionTemperatureFlash).mockReturnValueOnce(true)

      render(<BitMainImmersionSettings data={mockDevice} />)
      expect(screen.getByTestId('flash-result')).toHaveTextContent('true')
    })

    it('superflash function returns true for critical values', () => {
      vi.mocked(shouldImmersionTemperatureSuperflash).mockReturnValueOnce(true)

      render(<BitMainImmersionSettings data={mockDevice} />)
      expect(screen.getByTestId('superflash-result')).toHaveTextContent('true')
    })
  })

  describe('edge cases', () => {
    it('handles undefined device', () => {
      render(<BitMainImmersionSettings data={undefined} />)

      expect(screen.getByTestId('immersion-form')).toBeInTheDocument()
      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', null)
    })

    it('handles empty device object', () => {
      const emptyDevice = {} as Device
      render(<BitMainImmersionSettings data={emptyDevice} />)

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', null)
    })

    it('handles null containerSettings explicitly', () => {
      render(<BitMainImmersionSettings data={mockDevice} containerSettings={null} />)

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', null)
    })

    it('handles empty containerSettings object', () => {
      render(<BitMainImmersionSettings data={mockDevice} containerSettings={{}} />)

      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', {})
    })

    it('handles different device status values', () => {
      const statuses = ['active', 'stopped', 'offline', 'error', 'maintenance']

      statuses.forEach((status) => {
        vi.clearAllMocks()
        const deviceWithStatus = { ...mockDevice, status }
        render(<BitMainImmersionSettings data={deviceWithStatus} />)

        expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, status, null)
      })
    })
  })

  describe('integration with utility functions', () => {
    it('all utility functions receive consistent parameters', () => {
      const containerSettings = { thresholds: { test: 'value' } }
      render(<BitMainImmersionSettings data={mockDevice} containerSettings={containerSettings} />)

      // All three functions should be called with same status and settings
      expect(getImmersionTemperatureColor).toHaveBeenCalledWith(45, 'active', containerSettings)
      expect(shouldImmersionTemperatureFlash).toHaveBeenCalledWith(45, 'active', containerSettings)
      expect(shouldImmersionTemperatureSuperflash).toHaveBeenCalledWith(
        45,
        'active',
        containerSettings,
      )
    })

    it('functions are called when form component renders', () => {
      render(<BitMainImmersionSettings data={mockDevice} />)

      expect(getImmersionTemperatureColor).toHaveBeenCalled()
      expect(shouldImmersionTemperatureFlash).toHaveBeenCalled()
      expect(shouldImmersionTemperatureSuperflash).toHaveBeenCalled()
    })
  })
})
