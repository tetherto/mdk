import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BaseThresholdForm } from '../base-threshold-form'
import { HydroEditableThresholdForm } from '../hydro-editable-threshold-form'

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

describe('hydroEditableThresholdForm', () => {
  const mockData = {
    id: 'device-1',
    type: 'bitmain-hydro',
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

  it('renders without crashing', () => {
    render(<HydroEditableThresholdForm data={mockData} />)
    expect(screen.getByTestId('base-threshold-form')).toBeInTheDocument()
  })

  it('renders water temperature configuration', () => {
    render(<HydroEditableThresholdForm data={mockData} />)
    expect(screen.getByText('Water Temperature (°C)')).toBeInTheDocument()
  })

  it('renders supply liquid pressure configuration', () => {
    render(<HydroEditableThresholdForm data={mockData} />)
    expect(screen.getByText('Supply Liquid Pressure (bar)')).toBeInTheDocument()
  })

  it('passes data to BaseThresholdForm', () => {
    render(<HydroEditableThresholdForm data={mockData} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockData,
      }),
      expect.anything(),
    )
  })

  it('passes threshold configs to BaseThresholdForm', () => {
    render(<HydroEditableThresholdForm data={mockData} />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholdConfigs: expect.arrayContaining([
          expect.objectContaining({ type: 'waterTemperature' }),
          expect.objectContaining({ type: 'supplyLiquidPressure' }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('passes water temperature functions to config', () => {
    const waterTempColorFunc = vi.fn()
    const waterTempFlashFunc = vi.fn()
    const waterTempSuperflashFunc = vi.fn()

    render(
      <HydroEditableThresholdForm
        data={mockData}
        waterTempColorFunc={waterTempColorFunc}
        waterTempFlashFunc={waterTempFlashFunc}
        waterTempSuperflashFunc={waterTempSuperflashFunc}
      />,
    )

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const waterTempConfig = call.thresholdConfigs.find((c: any) => c.type === 'waterTemperature')

    expect(waterTempConfig.colorFunc).toBe(waterTempColorFunc)
    expect(waterTempConfig.flashFunc).toBe(waterTempFlashFunc)
    expect(waterTempConfig.superflashFunc).toBe(waterTempSuperflashFunc)
  })

  it('passes supply liquid pressure functions to config', () => {
    const pressureColorFunc = vi.fn()
    const pressureFlashFunc = vi.fn()
    const pressureSuperflashFunc = vi.fn()

    render(
      <HydroEditableThresholdForm
        data={mockData}
        pressureColorFunc={pressureColorFunc}
        pressureFlashFunc={pressureFlashFunc}
        pressureSuperflashFunc={pressureSuperflashFunc}
      />,
    )

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const pressureConfig = call.thresholdConfigs.find((c: any) => c.type === 'supplyLiquidPressure')

    expect(pressureConfig.colorFunc).toBe(pressureColorFunc)
    expect(pressureConfig.flashFunc).toBe(pressureFlashFunc)
    expect(pressureConfig.superflashFunc).toBe(pressureSuperflashFunc)
  })

  it('renders without data prop', () => {
    render(<HydroEditableThresholdForm />)

    expect(BaseThresholdForm).toHaveBeenCalledWith(
      expect.objectContaining({
        data: undefined,
      }),
      expect.anything(),
    )
  })

  it('has correct unit for water temperature', () => {
    render(<HydroEditableThresholdForm data={mockData} />)

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const waterTempConfig = call.thresholdConfigs.find((c: any) => c.type === 'waterTemperature')

    expect(waterTempConfig.unit).toBe('°C')
  })

  it('has correct unit for supply liquid pressure', () => {
    render(<HydroEditableThresholdForm data={mockData} />)

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const pressureConfig = call.thresholdConfigs.find((c: any) => c.type === 'supplyLiquidPressure')

    expect(pressureConfig.unit).toBe('bar')
  })

  it('has correct title for water temperature', () => {
    render(<HydroEditableThresholdForm data={mockData} />)

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const waterTempConfig = call.thresholdConfigs.find((c: any) => c.type === 'waterTemperature')

    expect(waterTempConfig.title).toBe('Water Temperature (°C)')
  })

  it('has correct title for supply liquid pressure', () => {
    render(<HydroEditableThresholdForm data={mockData} />)

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const pressureConfig = call.thresholdConfigs.find((c: any) => c.type === 'supplyLiquidPressure')

    expect(pressureConfig.title).toBe('Supply Liquid Pressure (bar)')
  })

  it('renders both configurations in correct order', () => {
    render(<HydroEditableThresholdForm data={mockData} />)

    const waterTempElement = screen.getByTestId('config-waterTemperature')
    const pressureElement = screen.getByTestId('config-supplyLiquidPressure')

    expect(waterTempElement).toBeInTheDocument()
    expect(pressureElement).toBeInTheDocument()
  })

  it('has correct wrapper class', () => {
    const { container } = render(<HydroEditableThresholdForm data={mockData} />)

    expect(container.querySelector('.mdk-hydro-threshold-form')).toBeInTheDocument()
  })

  it('passes all water temperature props correctly', () => {
    const waterTempColorFunc = vi.fn((value) => (value > 50 ? 'red' : 'green'))
    const waterTempFlashFunc = vi.fn((value) => value > 55)
    const waterTempSuperflashFunc = vi.fn((value) => value > 60)

    render(
      <HydroEditableThresholdForm
        data={mockData}
        waterTempColorFunc={waterTempColorFunc}
        waterTempFlashFunc={waterTempFlashFunc}
        waterTempSuperflashFunc={waterTempSuperflashFunc}
      />,
    )

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const waterTempConfig = call.thresholdConfigs.find((c: any) => c.type === 'waterTemperature')

    expect(waterTempConfig).toEqual({
      type: 'waterTemperature',
      title: 'Water Temperature (°C)',
      unit: '°C',
      colorFunc: waterTempColorFunc,
      flashFunc: waterTempFlashFunc,
      superflashFunc: waterTempSuperflashFunc,
    })
  })

  it('passes all pressure props correctly', () => {
    const pressureColorFunc = vi.fn((value) => (value > 2 ? 'red' : 'green'))
    const pressureFlashFunc = vi.fn((value) => value > 2.5)
    const pressureSuperflashFunc = vi.fn((value) => value > 3)

    render(
      <HydroEditableThresholdForm
        data={mockData}
        pressureColorFunc={pressureColorFunc}
        pressureFlashFunc={pressureFlashFunc}
        pressureSuperflashFunc={pressureSuperflashFunc}
      />,
    )

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const pressureConfig = call.thresholdConfigs.find((c: any) => c.type === 'supplyLiquidPressure')

    expect(pressureConfig).toEqual({
      type: 'supplyLiquidPressure',
      title: 'Supply Liquid Pressure (bar)',
      unit: 'bar',
      colorFunc: pressureColorFunc,
      flashFunc: pressureFlashFunc,
      superflashFunc: pressureSuperflashFunc,
    })
  })

  it('renders with undefined function props', () => {
    render(<HydroEditableThresholdForm data={mockData} />)

    // @ts-expect-error - Access the props passed to BaseThresholdForm
    const call = BaseThresholdForm.mock.calls[0][0]
    const waterTempConfig = call.thresholdConfigs.find((c: any) => c.type === 'waterTemperature')
    const pressureConfig = call.thresholdConfigs.find((c: any) => c.type === 'supplyLiquidPressure')

    expect(waterTempConfig.colorFunc).toBeUndefined()
    expect(waterTempConfig.flashFunc).toBeUndefined()
    expect(waterTempConfig.superflashFunc).toBeUndefined()
    expect(pressureConfig.colorFunc).toBeUndefined()
    expect(pressureConfig.flashFunc).toBeUndefined()
    expect(pressureConfig.superflashFunc).toBeUndefined()
  })
})
