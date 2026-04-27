import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../types/device'
import { BaseThresholdForm } from '../base-threshold-form'
import { ImmersionEditableThresholdForm } from '../immersion-editable-threshold-form'

vi.mock('../base-threshold-form', () => ({
  BaseThresholdForm: vi.fn(({ thresholdConfigs }) => (
    <div data-testid="base-threshold-form">
      {thresholdConfigs.map((config: any) => (
        <div key={config.type} data-testid={`config-${config.type}`}>
          {config.title}
          {config.unit && <span>{config.unit}</span>}
        </div>
      ))}
    </div>
  )),
}))

describe('ImmersionEditableThresholdForm', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {},
        config: {},
      },
    },
  }

  it('renders without crashing', () => {
    render(<ImmersionEditableThresholdForm />)
    expect(screen.getByTestId('base-threshold-form')).toBeInTheDocument()
  })

  it('passes data to BaseThresholdForm', () => {
    render(<ImmersionEditableThresholdForm data={mockDevice} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockDevice,
      }),
      expect.anything(),
    )
  })

  it('configures oil temperature threshold', () => {
    render(<ImmersionEditableThresholdForm />)

    expect(screen.getByText('Oil Temperature (°C)')).toBeInTheDocument()
    expect(screen.getByText('°C')).toBeInTheDocument()
  })

  it('passes threshold configuration to BaseThresholdForm', () => {
    render(<ImmersionEditableThresholdForm />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            type: 'oilTemperature',
            title: 'Oil Temperature (°C)',
            unit: '°C',
          }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('passes color function when provided', () => {
    const colorFunc = vi.fn(() => 'red')
    render(<ImmersionEditableThresholdForm oilTempColorFunc={colorFunc} />)

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
    render(<ImmersionEditableThresholdForm oilTempFlashFunc={flashFunc} />)

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
    render(<ImmersionEditableThresholdForm oilTempSuperflashFunc={superflashFunc} />)

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
      <ImmersionEditableThresholdForm
        data={mockDevice}
        oilTempColorFunc={colorFunc}
        oilTempFlashFunc={flashFunc}
        oilTempSuperflashFunc={superflashFunc}
      />,
    )

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockDevice,
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            type: 'oilTemperature',
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
    render(<ImmersionEditableThresholdForm data={mockDevice} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockDevice,
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({
            type: 'oilTemperature',
            title: 'Oil Temperature (°C)',
          }),
        ]),
      }),
      expect.anything(),
    )
  })
})
