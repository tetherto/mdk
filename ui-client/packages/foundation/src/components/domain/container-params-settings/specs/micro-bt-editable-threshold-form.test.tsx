import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../types/device'
import { BaseThresholdForm } from '../base-threshold-form'
import { MicroBTEditableThresholdForm } from '../micro-bt-editable-threshold-form'

vi.mock('../base-threshold-form', () => ({
  BaseThresholdForm: vi.fn(({ thresholdConfigs }) => (
    <div data-testid="base-threshold-form">
      {thresholdConfigs.map((config: any) => (
        <div key={config.type} data-testid={`config-${config.type}`}>
          <span>{config.title}</span>
          {config.unit && <span>{config.unit}</span>}
        </div>
      ))}
    </div>
  )),
}))

describe('MicroBTEditableThresholdForm', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'microbt',
    status: 'active',
    last: {
      snap: {
        stats: {},
        config: {},
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<MicroBTEditableThresholdForm />)
    expect(screen.getByTestId('base-threshold-form')).toBeInTheDocument()
  })

  it('passes data to BaseThresholdForm', () => {
    render(<MicroBTEditableThresholdForm data={mockDevice} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockDevice,
      }),
      expect.anything(),
    )
  })

  it('configures water temperature threshold', () => {
    render(<MicroBTEditableThresholdForm />)

    expect(screen.getByText('Water Temperature (°C)')).toBeInTheDocument()
    expect(screen.getByText('°C')).toBeInTheDocument()
  })

  it('passes threshold configuration to BaseThresholdForm', () => {
    render(<MicroBTEditableThresholdForm />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            type: 'waterTemperature',
            title: 'Water Temperature (°C)',
            unit: '°C',
          }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('passes color function when provided', () => {
    const colorFunc = vi.fn(() => 'red')
    render(<MicroBTEditableThresholdForm waterTempColorFunc={colorFunc} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            colorFunc,
          }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('passes flash function when provided', () => {
    const flashFunc = vi.fn(() => true)
    render(<MicroBTEditableThresholdForm waterTempFlashFunc={flashFunc} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            flashFunc,
          }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('passes superflash function when provided', () => {
    const superflashFunc = vi.fn(() => false)
    render(<MicroBTEditableThresholdForm waterTempSuperflashFunc={superflashFunc} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            superflashFunc,
          }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('passes all functions when provided', () => {
    const colorFunc = vi.fn()
    const flashFunc = vi.fn()
    const superflashFunc = vi.fn()

    render(
      <MicroBTEditableThresholdForm
        data={mockDevice}
        waterTempColorFunc={colorFunc}
        waterTempFlashFunc={flashFunc}
        waterTempSuperflashFunc={superflashFunc}
      />,
    )

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockDevice,
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            type: 'waterTemperature',
            colorFunc,
            flashFunc,
            superflashFunc,
          }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('renders without optional functions', () => {
    render(<MicroBTEditableThresholdForm data={mockDevice} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockDevice,
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            type: 'waterTemperature',
            title: 'Water Temperature (°C)',
          }),
        ]),
      }),
      expect.anything(),
    )
  })
})
