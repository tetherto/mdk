import { UNITS } from '@mdk/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useContainerThresholds } from '../../../../hooks/use-container-thresholds'
import { BaseThresholdForm } from '../base-threshold-form'

// Mock dependencies
vi.mock('../../../../hooks/use-container-thresholds', () => ({
  useContainerThresholds: vi.fn(() => ({
    thresholds: {
      oilTemperature: {
        criticalLow: 33,
        alert: 39,
        normal: 42,
        alarm: 46,
        criticalHigh: 48,
      },
    },
    isEditing: false,
    isSaving: false,
    isSiteLoading: false,
    isSettingsLoading: false,
    handleThresholdChange: vi.fn(),
    handleThresholdBlur: vi.fn(),
    handleSave: vi.fn(),
    handleReset: vi.fn(),
    parameters: {},
    setParameters: vi.fn(),
    setIsEditing: vi.fn(),
  })),
}))

vi.mock('@mdk/core', async () => {
  const actual = await vi.importActual('@mdk/core')
  return {
    ...actual,
    DataTable: vi.fn(({ data, columns }) => (
      <table data-testid="data-table">
        <thead>
          <tr>
            {columns.map((col: any, i: number) => (
              <th key={i}>{typeof col.header === 'function' ? col.header() : col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any) => (
            <tr key={row.key}>
              <td>{row.state}</td>
              <td>{row.range}</td>
              <td>{row.color}</td>
              <td>{row.flash}</td>
              <td>{row.sound}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )),
    Spinner: vi.fn(() => <div data-testid="spinner">Loading...</div>),
    Input: vi.fn(
      ({ value, onChange, onBlur, onWheel, suffix, placeholder, id, type, step, ...props }) => (
        <input
          data-testid="threshold-input"
          id={id}
          type={type}
          step={step}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onWheel={onWheel}
          placeholder={placeholder}
          data-suffix={suffix}
          {...props}
        />
      ),
    ),
    Indicator: vi.fn(({ color, children, className }) => (
      <div data-testid="indicator" data-color={color} className={className}>
        {children}
      </div>
    )),
  }
})

vi.mock('../status-indicator', () => ({
  FlashStatusIndicator: vi.fn(({ isFlashing, color }) => (
    <div data-testid="flash-indicator" data-flashing={isFlashing} data-color={color}>
      {isFlashing ? 'Flashing' : 'Not Flashing'}
    </div>
  )),
  SoundStatusIndicator: vi.fn(({ isSuperflashing, color }) => (
    <div data-testid="sound-indicator" data-superflashing={isSuperflashing} data-color={color}>
      {isSuperflashing ? 'Sound On' : 'Sound Off'}
    </div>
  )),
}))

describe('BaseThresholdForm', () => {
  const mockThresholdConfigs = [
    {
      type: 'oilTemperature',
      title: 'Oil Temperature',
      unit: UNITS.TEMPERATURE_C,
    },
  ]

  const mockData = {
    type: 'container-bd-d40',
    status: 'online',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)
      expect(screen.getByText('Oil Temperature')).toBeInTheDocument()
    })

    it('renders with default empty props', () => {
      render(<BaseThresholdForm />)
      expect(screen.queryByText('Oil Temperature')).not.toBeInTheDocument()
    })

    it('renders loading spinner when settings are loading', () => {
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {},
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: true,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })

    it('does not render threshold sections when loading', () => {
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {},
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: true,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)
      expect(screen.queryByText('Oil Temperature')).not.toBeInTheDocument()
    })

    it('renders children when provided', () => {
      render(
        <BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs}>
          <div data-testid="custom-child">Custom Content</div>
        </BaseThresholdForm>,
      )

      expect(screen.getByTestId('custom-child')).toBeInTheDocument()
    })
  })

  describe('threshold inputs', () => {
    it('renders threshold inputs', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText(/Critical Low starts at:/i)).toBeInTheDocument()
      expect(screen.getByText(/Alert starts at:/i)).toBeInTheDocument()
      expect(screen.getByText(/Normal starts at:/i)).toBeInTheDocument()
      expect(screen.getByText(/Alarm starts at:/i)).toBeInTheDocument()
      expect(screen.getByText(/Critical High starts at:/i)).toBeInTheDocument()
    })

    it('renders inputs with correct values', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const inputs = screen.getAllByTestId('threshold-input')
      expect(inputs).toHaveLength(5)
      expect(inputs[0]).toHaveValue(33)
      expect(inputs[1]).toHaveValue(39)
      expect(inputs[2]).toHaveValue(42)
    })

    it('renders inputs with correct suffix', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const inputs = screen.getAllByTestId('threshold-input')
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('data-suffix', UNITS.TEMPERATURE_C)
      })
    })

    it('calls handleThresholdChange on input change', () => {
      const mockHandleChange = vi.fn()
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: { oilTemperature: { criticalLow: 33 } },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: mockHandleChange,
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const input = screen.getAllByTestId('threshold-input')[0]
      fireEvent.change(input, { target: { value: '35' } })

      expect(mockHandleChange).toHaveBeenCalledWith('oilTemperature', 'criticalLow', '35')
    })

    it('calls handleThresholdBlur on input blur', () => {
      const mockHandleBlur = vi.fn()
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: { oilTemperature: { criticalLow: 33 } },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: mockHandleBlur,
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const input = screen.getAllByTestId('threshold-input')[0]
      fireEvent.blur(input, { target: { value: '35' } })

      expect(mockHandleBlur).toHaveBeenCalledWith('oilTemperature', 'criticalLow', '35')
    })

    it('handles wheel event to prevent scroll', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const input = screen.getAllByTestId('threshold-input')[0]
      const blurSpy = vi.spyOn(input, 'blur')

      fireEvent.wheel(input)

      expect(blurSpy).toHaveBeenCalled()
    })

    it('renders correct placeholders for first input', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const firstInput = screen.getAllByTestId('threshold-input')[0]
      expect(firstInput).toHaveAttribute('placeholder', '< 33')
    })

    it('renders correct placeholders for last input', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const inputs = screen.getAllByTestId('threshold-input')
      const lastInput = inputs[inputs.length - 1]
      expect(lastInput).toHaveAttribute('placeholder', '> 48')
    })

    it('renders correct placeholders for middle inputs', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const inputs = screen.getAllByTestId('threshold-input')
      expect(inputs[1]).toHaveAttribute('placeholder', '39 - 42')
    })
  })

  describe('data table', () => {
    it('renders data table', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)
      expect(screen.getByTestId('data-table')).toBeInTheDocument()
    })

    it('renders table with correct headers', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('State')).toBeInTheDocument()
      expect(screen.getByText('Range')).toBeInTheDocument()
      expect(screen.getByText('Color')).toBeInTheDocument()
      expect(screen.getByText('Flash')).toBeInTheDocument()
      expect(screen.getByText('Sound')).toBeInTheDocument()
    })

    it('generates correct table rows', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('Critical Low')).toBeInTheDocument()
      expect(screen.getByText('Alert')).toBeInTheDocument()
      expect(screen.getByText('Normal')).toBeInTheDocument()
      expect(screen.getByText('Alarm')).toBeInTheDocument()
      expect(screen.getByText('Critical High')).toBeInTheDocument()
    })

    it('displays correct ranges', () => {
      const { container } = render(
        <BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />,
      )

      expect(container.textContent).toContain(`< 33${UNITS.TEMPERATURE_C}`)
      expect(container.textContent).toContain(`> 48${UNITS.TEMPERATURE_C}`)
    })

    it('renders indicators for each row', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const indicators = screen.getAllByTestId('indicator')
      expect(indicators).toHaveLength(5)
    })

    it('renders flash indicators', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const flashIndicators = screen.getAllByTestId('flash-indicator')
      expect(flashIndicators).toHaveLength(5)
    })

    it('renders sound indicators', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const soundIndicators = screen.getAllByTestId('sound-indicator')
      expect(soundIndicators).toHaveLength(5)
    })

    it('sets flash state correctly for first row', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const flashIndicators = screen.getAllByTestId('flash-indicator')
      expect(flashIndicators[0]).toHaveAttribute('data-flashing', 'true')
    })

    it('sets superflash state correctly for last row', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const soundIndicators = screen.getAllByTestId('sound-indicator')
      const lastIndicator = soundIndicators[soundIndicators.length - 1]
      expect(lastIndicator).toHaveAttribute('data-superflashing', 'true')
    })
  })

  describe('action buttons', () => {
    it('renders action buttons when editing', () => {
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: { oilTemperature: { criticalLow: 33 } },
        isEditing: true,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Reset Values to Default')).toBeInTheDocument()
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })

    it('does not render action buttons when not editing', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
      expect(screen.queryByText('Save Settings')).not.toBeInTheDocument()
    })

    it('calls handleSave when save button clicked', () => {
      const mockHandleSave = vi.fn()
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: { oilTemperature: { criticalLow: 33 } },
        isEditing: true,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: mockHandleSave,
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      fireEvent.click(screen.getByText('Save Settings'))
      expect(mockHandleSave).toHaveBeenCalled()
    })

    it('calls handleReset when cancel button clicked', () => {
      const mockHandleReset = vi.fn()
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: { oilTemperature: { criticalLow: 33 } },
        isEditing: true,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: mockHandleReset,
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      fireEvent.click(screen.getByText('Cancel'))
      expect(mockHandleReset).toHaveBeenCalled()
    })

    it('calls handleReset when reset button clicked', () => {
      const mockHandleReset = vi.fn()
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: { oilTemperature: { criticalLow: 33 } },
        isEditing: true,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: mockHandleReset,
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      fireEvent.click(screen.getByText('Reset Values to Default'))
      expect(mockHandleReset).toHaveBeenCalled()
    })
  })

  describe('multiple configs', () => {
    it('renders multiple threshold configs', () => {
      const multipleConfigs = [
        { type: 'oilTemperature', title: 'Oil Temperature', unit: UNITS.TEMPERATURE_C },
        { type: 'tankPressure', title: 'Tank Pressure', unit: UNITS.PRESSURE_BAR },
      ]

      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {
          oilTemperature: { low: 30, high: 50 },
          tankPressure: { low: 1.5, high: 3.0 },
        },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={multipleConfigs} />)

      expect(screen.getByText('Oil Temperature')).toBeInTheDocument()
      expect(screen.getByText('Tank Pressure')).toBeInTheDocument()
    })

    it('uses correct unit for temperature config', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      const inputs = screen.getAllByTestId('threshold-input')
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('data-suffix', UNITS.TEMPERATURE_C)
      })
    })

    it('uses correct unit for pressure config', () => {
      const pressureConfig = [
        { type: 'tankPressure', title: 'Tank Pressure', unit: UNITS.PRESSURE_BAR },
      ]

      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {
          tankPressure: { low: 1.5, high: 3.0 },
        },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={pressureConfig} />)

      const inputs = screen.getAllByTestId('threshold-input')
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('data-suffix', UNITS.PRESSURE_BAR)
      })
    })

    it('defaults to temperature unit when type includes Temperature', () => {
      const configWithoutUnit = [{ type: 'waterTemperature', title: 'Water Temperature' }]

      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {
          waterTemperature: { low: 20, high: 40 },
        },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={configWithoutUnit} />)

      const inputs = screen.getAllByTestId('threshold-input')
      expect(inputs[0]).toHaveAttribute('data-suffix', UNITS.TEMPERATURE_C)
    })

    it('defaults to pressure unit when type does not include Temperature', () => {
      const configWithoutUnit = [{ type: 'someOtherType', title: 'Some Other' }]

      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {
          someOtherType: { low: 1, high: 3 },
        },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={configWithoutUnit} />)

      const inputs = screen.getAllByTestId('threshold-input')
      expect(inputs[0]).toHaveAttribute('data-suffix', UNITS.PRESSURE_BAR)
    })
  })

  describe('onSave callback', () => {
    it('wraps onSave callback correctly', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined)

      render(
        <BaseThresholdForm
          data={mockData}
          thresholdConfigs={mockThresholdConfigs}
          onSave={mockOnSave}
        />,
      )

      // Verify useContainerThresholds was called with wrapped onSave
      expect(useContainerThresholds).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockData,
          onSave: expect.any(Function),
        }),
      )
    })

    it('calls original onSave with thresholds data', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined)
      const wrappedOnSave = vi.fn()

      vi.mocked(useContainerThresholds).mockImplementation(({ onSave }) => {
        if (onSave) wrappedOnSave.mockImplementation(onSave)
        return {
          thresholds: { oilTemperature: { low: 30 } },
          isEditing: false,
          isSaving: false,
          isSiteLoading: false,
          isSettingsLoading: false,
          handleThresholdChange: vi.fn(),
          handleThresholdBlur: vi.fn(),
          handleSave: vi.fn(),
          handleReset: vi.fn(),
          parameters: {},
          setParameters: vi.fn(),
          setIsEditing: vi.fn(),
        }
      })

      render(
        <BaseThresholdForm
          data={mockData}
          thresholdConfigs={mockThresholdConfigs}
          onSave={mockOnSave}
        />,
      )

      await wrappedOnSave({ data: { thresholds: { oilTemperature: { low: 30 } } } })

      expect(mockOnSave).toHaveBeenCalledWith({ oilTemperature: { low: 30 } })
    })

    it('does not wrap onSave when not provided', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(useContainerThresholds).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockData,
          onSave: undefined,
        }),
      )
    })
  })

  describe('title case conversion', () => {
    it('converts camelCase to Title Case', () => {
      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('Critical Low')).toBeInTheDocument()
      expect(screen.getByText('Critical High')).toBeInTheDocument()
    })

    it('handles snake_case', () => {
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {
          oilTemperature: { critical_low: 30, critical_high: 50 },
        },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('Critical Low')).toBeInTheDocument()
      expect(screen.getByText('Critical High')).toBeInTheDocument()
    })

    it('handles kebab-case', () => {
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {
          oilTemperature: { 'critical-low': 30, 'critical-high': 50 },
        },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('Critical Low')).toBeInTheDocument()
      expect(screen.getByText('Critical High')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles empty thresholds object', () => {
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {},
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('Oil Temperature')).toBeInTheDocument()
    })

    it('handles missing threshold type in thresholds object', () => {
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: { someOtherType: { low: 1, high: 3 } },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('Oil Temperature')).toBeInTheDocument()
    })

    it('handles single threshold value', () => {
      vi.mocked(useContainerThresholds).mockReturnValueOnce({
        thresholds: {
          oilTemperature: { single: 40 },
        },
        isEditing: false,
        isSaving: false,
        isSiteLoading: false,
        isSettingsLoading: false,
        handleThresholdChange: vi.fn(),
        handleThresholdBlur: vi.fn(),
        handleSave: vi.fn(),
        handleReset: vi.fn(),
        parameters: {},
        setParameters: vi.fn(),
        setIsEditing: vi.fn(),
      })

      render(<BaseThresholdForm data={mockData} thresholdConfigs={mockThresholdConfigs} />)

      expect(screen.getByText('Single')).toBeInTheDocument()
    })
  })
})
