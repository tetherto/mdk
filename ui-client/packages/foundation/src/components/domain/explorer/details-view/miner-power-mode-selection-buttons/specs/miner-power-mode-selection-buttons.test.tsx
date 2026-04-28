import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MinerPowerModeSelectionButtons } from '../miner-power-mode-selection-buttons'

import { getCurrentPowerModes } from '../../miner-controls-card/miner-controls-utils'

vi.mock('../../../../../../utils/power-mode-utils', () => ({
  getDeviceModel: vi.fn((device) => device.model), // Simple mock returning device.model
}))

vi.mock('../../miner-controls-card/miner-controls-utils', () => ({
  getCurrentPowerModes: vi.fn(() => ({ Normal: 3 })),
}))

vi.mock('@tetherto/core', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

vi.mock('../power-mode-selection-dropdown', () => ({
  PowerModeSelectionDropdown: vi.fn(
    ({ model, currentPowerModes, buttonText, disabled, onPowerModeToggle }) => (
      <div
        data-testid="mock-dropdown"
        data-model={model}
        data-disabled={String(disabled)}
        data-modes={JSON.stringify(currentPowerModes)}
      >
        <div data-testid="dropdown-text">{buttonText}</div>
        <button data-testid="dropdown-toggle-btn" onClick={() => onPowerModeToggle?.('Normal')}>
          Toggle Normal
        </button>
      </div>
    ),
  ),
}))

describe('MinerPowerModeSelectionButtons', () => {
  const mockDevices = [
    { id: '1', model: 'M50' },
    { id: '2', model: 'M50' },
    { id: '3', model: 'M30S' },
  ]

  describe('rendering and grouping', () => {
    it('renders empty without crashing if no devices are provided', () => {
      render(<MinerPowerModeSelectionButtons selectedDevices={[]} />)
      expect(screen.queryByTestId('mock-dropdown')).not.toBeInTheDocument()
    })

    it('groups devices by model and renders one dropdown per unique model', () => {
      render(<MinerPowerModeSelectionButtons selectedDevices={mockDevices} />)

      const dropdowns = screen.getAllByTestId('mock-dropdown')
      expect(dropdowns).toHaveLength(2) // One for M50, one for M30S
    })

    it('applies the margin CSS class when hasMargin is true', () => {
      const { container } = render(
        <MinerPowerModeSelectionButtons selectedDevices={mockDevices} hasMargin={true} />,
      )

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('mdk-miner-power-mode-selection-buttons--with-margin')
    })
  })

  describe('buttonText labels', () => {
    it('uses "Set Power Mode" if only one model is present', () => {
      const singleTypeDevices = [{ id: '1', model: 'M50' }]
      render(<MinerPowerModeSelectionButtons selectedDevices={singleTypeDevices} />)

      expect(screen.getByTestId('dropdown-text')).toHaveTextContent('Set Power Mode')
    })

    it('uses "Set Power Mode (MODEL)" if multiple models are present', () => {
      render(<MinerPowerModeSelectionButtons selectedDevices={mockDevices} />)

      const labels = screen.getAllByTestId('dropdown-text')
      expect(labels[0]).toHaveTextContent('Set Power Mode (M50)')
      expect(labels[1]).toHaveTextContent('Set Power Mode (M30S)')
    })
  })

  describe('disabled state', () => {
    it('passes the disabled prop down to the dropdowns', () => {
      render(<MinerPowerModeSelectionButtons selectedDevices={mockDevices} disabled={true} />)

      screen.getAllByTestId('mock-dropdown').forEach((dropdown) => {
        expect(dropdown).toHaveAttribute('data-disabled', 'true')
      })
    })
  })

  describe('resolving power modes (getPowerModesByKey)', () => {
    it('uses powerModesLog if the key contains a valid object', () => {
      const powerModesLog = {
        M50: { Normal: 10, Eco: 2 },
      }

      render(
        <MinerPowerModeSelectionButtons
          selectedDevices={mockDevices}
          powerModesLog={powerModesLog}
        />,
      )

      const m50Dropdown = screen.getAllByTestId('mock-dropdown')[0]
      expect(m50Dropdown).toHaveAttribute('data-modes', JSON.stringify({ Normal: 10, Eco: 2 }))
    })

    it('falls back to getCurrentPowerModes utility if powerModesLog is not provided', () => {
      render(<MinerPowerModeSelectionButtons selectedDevices={mockDevices} />)

      const dropdown = screen.getAllByTestId('mock-dropdown')[0]
      expect(getCurrentPowerModes).toHaveBeenCalled()
      expect(dropdown).toHaveAttribute('data-modes', JSON.stringify({ Normal: 3 }))
    })
  })

  describe('callbacks (setPowerMode)', () => {
    it('calls setPowerMode with ONLY the devices subset corresponding to that key group', () => {
      const setPowerModeSpy = vi.fn()
      render(
        <MinerPowerModeSelectionButtons
          selectedDevices={mockDevices}
          setPowerMode={setPowerModeSpy}
        />,
      )

      const toggleButtons = screen.getAllByTestId('dropdown-toggle-btn')

      fireEvent.click(toggleButtons[0])

      expect(setPowerModeSpy).toHaveBeenCalledWith(
        [
          { id: '1', model: 'M50' },
          { id: '2', model: 'M50' },
        ],
        'Normal',
      )
    })
  })
})
