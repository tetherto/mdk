import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BaseThresholdForm } from '../base-threshold-form'
import { EditableThresholdForm } from '../editable-threshold-form'

// Mock BaseThresholdForm
vi.mock('../base-threshold-form', () => ({
  BaseThresholdForm: vi.fn(({ thresholdConfigs }) => (
    <div data-testid="base-threshold-form">
      {thresholdConfigs.map((config: any) => (
        <div key={config.type} data-testid={`config-${config.type}`}>
          {config.title}
        </div>
      ))}
    </div>
  )),
}))

describe('editableThresholdForm', () => {
  const mockData = {
    type: 'container-bd-d40',
    thresholds: {
      oilTemperature: { criticalLow: 33, normal: 42 },
      tankPressure: { criticalLow: 2, normal: 2.3 },
    },
  }

  it('renders without crashing', () => {
    render(<EditableThresholdForm data={mockData} />)
    expect(screen.getByTestId('base-threshold-form')).toBeInTheDocument()
  })

  it('renders oil temperature configuration', () => {
    render(<EditableThresholdForm data={mockData} />)
    expect(screen.getByText('Oil Temperature (°C)')).toBeInTheDocument()
  })

  it('renders tank pressure configuration', () => {
    render(<EditableThresholdForm data={mockData} />)
    expect(screen.getByText('Oil Pressure (bar)')).toBeInTheDocument()
  })

  it('passes data to BaseThresholdForm', () => {
    render(<EditableThresholdForm data={mockData} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockData,
      }),
      expect.anything(),
    )
  })

  it('passes threshold configs to BaseThresholdForm', () => {
    render(<EditableThresholdForm data={mockData} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({ type: 'oilTemperature' }),
          expect.objectContaining({ type: 'tankPressure' }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('passes oil temperature functions to config', () => {
    const oilTempColorFunc = vi.fn()
    const oilTempFlashFunc = vi.fn()
    const oilTempSuperflashFunc = vi.fn()

    render(
      <EditableThresholdForm
        data={mockData}
        oilTempColorFunc={oilTempColorFunc}
        oilTempFlashFunc={oilTempFlashFunc}
        oilTempSuperflashFunc={oilTempSuperflashFunc}
      />,
    )

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const oilTempConfig = call.thresholdConfigs.find((c: any) => c.type === 'oilTemperature')

    expect(oilTempConfig.colorFunc).toBe(oilTempColorFunc)
    expect(oilTempConfig.flashFunc).toBe(oilTempFlashFunc)
    expect(oilTempConfig.superflashFunc).toBe(oilTempSuperflashFunc)
  })

  it('passes tank pressure functions to config', () => {
    const tankPressureColorFunc = vi.fn()
    const tankPressureFlashFunc = vi.fn()
    const tankPressureSuperflashFunc = vi.fn()

    render(
      <EditableThresholdForm
        data={mockData}
        tankPressureColorFunc={tankPressureColorFunc}
        tankPressureFlashFunc={tankPressureFlashFunc}
        tankPressureSuperflashFunc={tankPressureSuperflashFunc}
      />,
    )

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const tankPressureConfig = call.thresholdConfigs.find((c: any) => c.type === 'tankPressure')

    expect(tankPressureConfig.colorFunc).toBe(tankPressureColorFunc)
    expect(tankPressureConfig.flashFunc).toBe(tankPressureFlashFunc)
    expect(tankPressureConfig.superflashFunc).toBe(tankPressureSuperflashFunc)
  })

  it('uses default empty object for data when not provided', () => {
    render(<EditableThresholdForm />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {},
      }),
      expect.anything(),
    )
  })

  it('has correct unit for oil temperature', () => {
    render(<EditableThresholdForm data={mockData} />)

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const oilTempConfig = call.thresholdConfigs.find((c: any) => c.type === 'oilTemperature')

    expect(oilTempConfig.unit).toBe('°C')
  })

  it('has correct unit for tank pressure', () => {
    render(<EditableThresholdForm data={mockData} />)

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const tankPressureConfig = call.thresholdConfigs.find((c: any) => c.type === 'tankPressure')

    expect(tankPressureConfig.unit).toBe('bar')
  })
})
