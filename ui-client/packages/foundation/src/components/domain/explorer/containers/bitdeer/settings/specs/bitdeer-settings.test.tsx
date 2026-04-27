import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ContainerParamsSettings,
  EditableThresholdForm,
} from '../../../../../container-params-settings'
import { BitdeerSettings } from '../bitdeer-settings'

// Mock the utility functions
vi.mock('../bitdeer-settings.utils', () => ({
  getBitdeerOilTemperatureColor: vi.fn((_isOn, value) => {
    if (value < 35) return '#ff0000'
    if (value > 45) return '#ff0000'
    return '#00ff00'
  }),
  shouldBitdeerOilTemperatureFlash: vi.fn((_isOn, value) => {
    return value < 35 || value > 45
  }),
  shouldBitdeerOilTemperatureSuperflash: vi.fn((_isOn, value) => {
    return value > 48
  }),
  getBitdeerTankPressureColor: vi.fn((_isOn, value) => {
    if (value < 2) return '#ff0000'
    if (value > 3) return '#ff0000'
    return '#00ff00'
  }),
  shouldBitdeerTankPressureFlash: vi.fn((isOn, value) => {
    return value < 2 || value > 3
  }),
  shouldBitdeerTankPressureSuperflash: vi.fn((isOn, value) => {
    return value < 1.5 || value > 3.5
  }),
}))

vi.mock('../../../../../container-params-settings', () => ({
  ContainerParamsSettings: vi.fn(({ data }) => (
    <div data-testid="container-params-settings">Container Type: {data?.type}</div>
  )),
  EditableThresholdForm: vi.fn(({ data }) => (
    <div data-testid="editable-threshold-form">Threshold Form for {data?.type}</div>
  )),
}))

// Mock hooks
vi.mock('../../../../../hooks/use-container-thresholds', () => ({
  useContainerThresholds: vi.fn(() => ({
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
  })),
}))

const createMockStore = () =>
  configureStore({
    reducer: {
      notifications: (state = []) => state,
    },
  })

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore()
  return render(<Provider store={store}>{component}</Provider>)
}

describe('bitdeerSettings', () => {
  const mockData = {
    type: 'container-bd-d40',
    status: 'online',
    oilTemperature: 42,
    tankPressure: 2.3,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)
      expect(screen.getByTestId('container-params-settings')).toBeInTheDocument()
    })

    it('renders ContainerParamsSettings component', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)
      expect(screen.getByText(/Container Type:/)).toBeInTheDocument()
    })

    it('renders EditableThresholdForm component', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)
      expect(screen.getByTestId('editable-threshold-form')).toBeInTheDocument()
    })

    it('renders with wrapper div', () => {
      const { container } = renderWithProviders(<BitdeerSettings data={mockData} />)
      expect(container.querySelector('.mdk-bitdeer-settings')).toBeInTheDocument()
    })

    it('renders with default empty object when no data provided', () => {
      renderWithProviders(<BitdeerSettings />)
      expect(screen.getByTestId('container-params-settings')).toBeInTheDocument()
      expect(screen.getByTestId('editable-threshold-form')).toBeInTheDocument()
    })
  })

  describe('data Passing', () => {
    it('passes data to EditableThresholdForm', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)
      expect(screen.getByText(/Threshold Form for container-bd-d40/)).toBeInTheDocument()
    })

    it('passes data to both child components', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)

      expect(ContainerParamsSettings).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockData }),
        expect.anything(),
      )

      expect(EditableThresholdForm).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockData }),
        expect.anything(),
      )
    })
  })

  describe('function Props', () => {
    it('passes oil temperature color function to EditableThresholdForm', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)

      const call = vi.mocked(EditableThresholdForm).mock.calls[0][0]
      expect(call.oilTempColorFunc).toBeDefined()
      expect(typeof call.oilTempColorFunc).toBe('function')
    })

    it('passes oil temperature flash function to EditableThresholdForm', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)

      const call = vi.mocked(EditableThresholdForm).mock.calls[0][0]
      expect(call.oilTempFlashFunc).toBeDefined()
      expect(typeof call.oilTempFlashFunc).toBe('function')
    })

    it('passes tank pressure functions to EditableThresholdForm', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)

      const call = vi.mocked(EditableThresholdForm).mock.calls[0][0]
      expect(call.tankPressureColorFunc).toBeDefined()
      expect(call.tankPressureFlashFunc).toBeDefined()
      expect(call.tankPressureSuperflashFunc).toBeDefined()
    })

    it('all function props are functions', () => {
      renderWithProviders(<BitdeerSettings data={mockData} />)

      const call = vi.mocked(EditableThresholdForm).mock.calls[0][0]

      expect(typeof call.oilTempColorFunc).toBe('function')
      expect(typeof call.oilTempFlashFunc).toBe('function')
      expect(typeof call.oilTempSuperflashFunc).toBe('function')
      expect(typeof call.tankPressureColorFunc).toBe('function')
      expect(typeof call.tankPressureFlashFunc).toBe('function')
      expect(typeof call.tankPressureSuperflashFunc).toBe('function')
    })
  })
})
