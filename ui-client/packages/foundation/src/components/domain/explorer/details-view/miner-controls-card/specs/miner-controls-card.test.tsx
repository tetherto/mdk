import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { useSelector } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTION_TYPES } from '../../../../../../constants/actions'
import { MAINTENANCE_CONTAINER } from '../../../../../../constants/container-constants'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../../constants/dialog'
import { actionsSlice } from '../../../../../../state'
import { MinerControlsCard } from '../miner-controls-card'

const mockDispatch = vi.fn()
const mockNotifyInfo = vi.fn()
const mockUpdateExistedActions = vi.fn()

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn((selector) =>
    selector({
      actions: { pendingSubmissions: [] },
      selectedDevices: [],
    }),
  ),
}))

vi.mock('../../../../../../hooks', () => ({
  useNotification: () => ({ notifyInfo: mockNotifyInfo }),
}))

vi.mock('../../../../../../hooks/use-update-existed-actions', () => ({
  useUpdateExistedActions: () => ({ updateExistedActions: mockUpdateExistedActions }),
}))

vi.mock('../../../../../../state', () => ({
  actionsSlice: {
    actions: {
      setAddPendingSubmissionAction: vi.fn((payload) => ({ type: 'SET_PENDING', payload })),
    },
    selectors: {
      selectPendingSubmissions: (state: any) => state.actions?.pendingSubmissions ?? [],
    },
  },
  selectSelectedDevices: (state: any) => state.selectedDevices ?? [],
}))

vi.mock('../../../../../../utils/action-utils', () => ({
  getSelectedDevicesTags: vi.fn(() => ['tag-1']),
}))

vi.mock('../../../../../../utils/device-utils', () => ({
  isMiner: vi.fn(() => true),
  appendIdToTag: vi.fn((id: string) => `tag:${id}`),
  getOnOffText: vi.fn((isOn: boolean) => (isOn ? 'on' : 'off')),
  getMinerShortCode: vi.fn(() => 'M-SNOW-01'),
}))

vi.mock('../miner-controls-utils', () => ({
  getLedButtonsStatus: vi.fn(() => ({
    isLedOnButtonEnabled: true,
    isLedOffButtonEnabled: true,
  })),
}))

vi.mock('../../miner-power-mode-selection-buttons/miner-power-mode-selection-buttons', () => ({
  MinerPowerModeSelectionButtons: ({ setPowerMode }: any) => (
    <div data-testid="power-mode-buttons">
      <button onClick={() => setPowerMode([], 'low')} data-testid="power-mode-btn">
        set power mode
      </button>
    </div>
  ),
}))

vi.mock('../../miner-setup-frequency-dropdown/miner-setup-frequency-dropdown', () => ({
  MinerSetupFrequencyDropdown: ({ onFrequencyToggle }: any) => (
    <div data-testid="freq-dropdown">
      <button onClick={() => onFrequencyToggle('550')} data-testid="freq-btn">
        set frequency
      </button>
    </div>
  ),
}))

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    // SimpleTooltip uses Radix Tooltip (portals + 300ms animation timers) — not under test here
    SimpleTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

vi.mock('../../../dialogs', () => ({
  ContainerSelectionDialog: ({ open, onClose }: any) =>
    open ? (
      <div data-testid="container-selection-dialog">
        <button onClick={onClose}>close container</button>
      </div>
    ) : null,
  RemoveMinerDialog: ({ isRemoveMinerFlow, onCancel }: any) =>
    isRemoveMinerFlow ? (
      <div data-testid="remove-miner-dialog">
        <button onClick={onCancel}>close remove</button>
      </div>
    ) : null,
  AddReplaceMinerDialog: ({ open, onClose }: any) =>
    open ? (
      <div data-testid="add-replace-dialog">
        <button onClick={onClose}>close add-replace</button>
      </div>
    ) : null,
  PositionChangeDialog: ({
    open,
    onClose,
    dialogFlow,
    selectedSocketToReplace,
    selectedEditSocket,
  }: any) =>
    open ? (
      <div data-testid="position-change-dialog">
        <span data-testid="position-dialog-flow">{dialogFlow}</span>
        <span data-testid="has-socket-to-replace">{String(!!selectedSocketToReplace)}</span>
        <span data-testid="has-edit-socket">{String(!!selectedEditSocket)}</span>
        <button onClick={onClose}>close position</button>
      </div>
    ) : null,
}))

const { setAddPendingSubmissionAction } = actionsSlice.actions

const normalMiner = {
  id: 'miner-1',
  type: 'miner',
  rack: 'rack-001',
  code: 'M-SNOW-01',
  tags: [],
  info: { pos: 'A1', container: 'CON-BBR-01', macAddress: 'aa:bb:cc:dd:ee:ff' },
  last: {
    snap: { config: { led_status: false }, stats: { miner_specific: { upfreq_speed: 100 } } },
  },
}

const maintenanceMiner = {
  ...normalMiner,
  id: 'miner-maintenance',
  info: { ...normalMiner.info, container: MAINTENANCE_CONTAINER },
}

const maintenanceMinerNoMac = {
  ...maintenanceMiner,
  info: { ...maintenanceMiner.info, macAddress: undefined },
}

const setSelectedDevices = (devices: any[]) => {
  vi.mocked(useSelector).mockImplementation((selector: any) =>
    selector({
      actions: { pendingSubmissions: [] },
      selectedDevices: devices,
    }),
  )
}

const defaultProps = {
  buttonsStates: { isSetUpFrequencyButtonDisabled: false },
  isLoading: false,
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<MinerControlsCard {...defaultProps} {...overrides} />)

describe('MinerControlsCard', () => {
  beforeEach(() => {
    setSelectedDevices([normalMiner])
  })

  describe('null render guard', () => {
    it('returns null when multiple miners are all in maintenance', () => {
      setSelectedDevices([maintenanceMiner, { ...maintenanceMiner, id: 'miner-2' }])
      const { container } = renderComponent()
      expect(container.firstChild).toBeNull()
    })

    it('renders when only some miners are in maintenance', () => {
      setSelectedDevices([maintenanceMiner, normalMiner])
      renderComponent()
      expect(screen.getByText('Miner Controls')).toBeInTheDocument()
    })
  })

  describe('normal mode (non-maintenance)', () => {
    beforeEach(() => {
      renderComponent()
    })

    it('renders the Miner Controls label', () => {
      expect(screen.getByText('Miner Controls')).toBeInTheDocument()
    })

    it('renders Reboot button', () => {
      expect(screen.getByRole('button', { name: /reboot/i })).toBeInTheDocument()
    })

    it('renders LEDs on button', () => {
      expect(screen.getByRole('button', { name: /leds on/i })).toBeInTheDocument()
    })

    it('renders LEDs off button', () => {
      expect(screen.getByRole('button', { name: /leds off/i })).toBeInTheDocument()
    })

    it('renders power mode selector by default', () => {
      expect(screen.getByTestId('power-mode-buttons')).toBeInTheDocument()
    })

    it('renders frequency dropdown', () => {
      expect(screen.getByTestId('freq-dropdown')).toBeInTheDocument()
    })

    it('single device: renders Move to Maintenance button', () => {
      expect(screen.getByRole('button', { name: /move to maintenance/i })).toBeInTheDocument()
    })

    it('single device: renders Change miner info button', () => {
      expect(screen.getByRole('button', { name: /change miner info/i })).toBeInTheDocument()
    })

    it('single device: renders Change position button', () => {
      expect(screen.getByRole('button', { name: /change position/i })).toBeInTheDocument()
    })
  })

  // Outlier cases that need a different initial render than the shared beforeEach above
  it('hides power mode selector when showPowerModeSelector is false', () => {
    renderComponent({ ...defaultProps, showPowerModeSelector: false } as any)
    expect(screen.queryByTestId('power-mode-buttons')).not.toBeInTheDocument()
  })

  it('multiple devices: hides single-device-only buttons', () => {
    setSelectedDevices([normalMiner, { ...normalMiner, id: 'miner-2' }])
    renderComponent()
    expect(screen.queryByRole('button', { name: /move to maintenance/i })).not.toBeInTheDocument()
  })

  describe('maintenance mode (single miner in maintenance)', () => {
    beforeEach(() => {
      setSelectedDevices([maintenanceMiner])
      renderComponent()
    })

    it('renders Change Miner Info button', () => {
      expect(screen.getByRole('button', { name: /change miner info/i })).toBeInTheDocument()
    })

    it('renders Back from Maintenance button', () => {
      expect(screen.getByRole('button', { name: /back from maintenance/i })).toBeInTheDocument()
    })

    it('renders Remove Miner button', () => {
      expect(screen.getByRole('button', { name: /remove miner/i })).toBeInTheDocument()
    })

    it('does not render Reboot button in maintenance mode', () => {
      expect(screen.queryByRole('button', { name: /reboot/i })).not.toBeInTheDocument()
    })

    it('enables Back from Maintenance when miner has a MAC address', () => {
      expect(screen.getByRole('button', { name: /back from maintenance/i })).not.toBeDisabled()
    })
  })

  it('disables Back from Maintenance when miner has no MAC address', () => {
    setSelectedDevices([maintenanceMinerNoMac])
    renderComponent()
    expect(screen.getByRole('button', { name: /back from maintenance/i })).toBeDisabled()
  })

  describe('reboot action', () => {
    it('dispatches reboot action when Reboot is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /reboot/i }))
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_PENDING' }))
    })

    it('calls updateExistedActions for reboot', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /reboot/i }))
      expect(mockUpdateExistedActions).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ACTION_TYPES.REBOOT }),
      )
    })

    it('calls notifyInfo after reboot', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /reboot/i }))
      expect(mockNotifyInfo).toHaveBeenCalledWith('Action added', expect.stringContaining('Reboot'))
    })

    it('dispatches with REBOOT action type', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /reboot/i }))
      expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: ACTION_TYPES.REBOOT }),
      )
    })
  })

  describe('frequency settings action', () => {
    it('dispatches SETUP_FREQUENCY_SPEED when frequency is toggled', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('freq-btn'))
      expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: ACTION_TYPES.SETUP_FREQUENCY_SPEED, params: [550] }),
      )
    })

    it('calls updateExistedActions for frequency', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('freq-btn'))
      expect(mockUpdateExistedActions).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ACTION_TYPES.SETUP_FREQUENCY_SPEED }),
      )
    })

    it('calls notifyInfo after frequency toggle', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('freq-btn'))
      expect(mockNotifyInfo).toHaveBeenCalledWith(
        'Action added',
        expect.stringContaining('Set Up Frequency Settings 550'),
      )
    })

    it('includes crossThing with CONTAINER type in dispatch', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('freq-btn'))
      expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
        expect.objectContaining({
          crossThing: expect.objectContaining({ type: expect.any(String) }),
        }),
      )
    })
  })

  describe('power mode action', () => {
    it('calls notifyInfo with no-op message when power mode is unchanged', () => {
      setSelectedDevices([{ ...normalMiner, last: { snap: { config: { power_mode: 'low' } } } }])
      renderComponent()
      fireEvent.click(screen.getByTestId('power-mode-btn'))
      expect(mockNotifyInfo).toHaveBeenCalledWith(
        'No actions added',
        'No devices power mode affected by the action',
      )
    })

    it('does not dispatch when power mode is unchanged', () => {
      setSelectedDevices([{ ...normalMiner, last: { snap: { config: { power_mode: 'low' } } } }])
      renderComponent()
      fireEvent.click(screen.getByTestId('power-mode-btn'))
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('LED actions', () => {
    it('dispatches SET_LED on when LEDs on is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /leds on/i }))
      expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: ACTION_TYPES.SET_LED, params: [true] }),
      )
    })

    it('notifies when no devices LED is affected', () => {
      setSelectedDevices([{ ...normalMiner, last: { snap: { config: { led_status: true } } } }])
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /leds on/i }))
      expect(mockNotifyInfo).toHaveBeenCalledWith('No actions added', 'No devices LEDs affected')
    })

    it('does not dispatch when no LEDs are affected', () => {
      setSelectedDevices([{ ...normalMiner, last: { snap: { config: { led_status: true } } } }])
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /leds on/i }))
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('dialog opening', () => {
    it('opens ContainerSelectionDialog when Back from Maintenance is clicked', () => {
      setSelectedDevices([maintenanceMiner])
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /back from maintenance/i }))
      expect(screen.getByTestId('container-selection-dialog')).toBeInTheDocument()
    })

    it('closes ContainerSelectionDialog when its onClose is called', () => {
      setSelectedDevices([maintenanceMiner])
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /back from maintenance/i }))
      fireEvent.click(screen.getByText('close container'))
      expect(screen.queryByTestId('container-selection-dialog')).not.toBeInTheDocument()
    })

    it('opens RemoveMinerDialog when Remove Miner is clicked', () => {
      setSelectedDevices([maintenanceMiner])
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))
      expect(screen.getByTestId('remove-miner-dialog')).toBeInTheDocument()
    })

    it('closes RemoveMinerDialog when its onCancel is called', () => {
      setSelectedDevices([maintenanceMiner])
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))
      fireEvent.click(screen.getByText('close remove'))
      expect(screen.queryByTestId('remove-miner-dialog')).not.toBeInTheDocument()
    })

    it('opens AddReplaceMinerDialog when Change Miner Info is clicked (maintenance mode)', () => {
      setSelectedDevices([maintenanceMiner])
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /change miner info/i }))
      expect(screen.getByTestId('add-replace-dialog')).toBeInTheDocument()
    })

    it('closes AddReplaceMinerDialog when its onClose is called', () => {
      setSelectedDevices([maintenanceMiner])
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /change miner info/i }))
      fireEvent.click(screen.getByText('close add-replace'))
      expect(screen.queryByTestId('add-replace-dialog')).not.toBeInTheDocument()
    })

    it('opens PositionChangeDialog with MAINTENANCE flow when Move to Maintenance is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /move to maintenance/i }))
      expect(screen.getByTestId('position-change-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('position-dialog-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE,
      )
    })

    it('opens PositionChangeDialog with CHANGE_INFO flow when Change miner info is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /change miner info/i }))
      expect(screen.getByTestId('position-change-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('position-dialog-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO,
      )
    })

    it('opens PositionChangeDialog with CONTAINER_SELECTION flow when Change position is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /change position/i }))
      expect(screen.getByTestId('position-change-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('position-dialog-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION,
      )
    })

    it('passes selectedSocketToReplace (not selectedEditSocket) for CONTAINER_SELECTION flow', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /change position/i }))
      expect(screen.getByTestId('has-socket-to-replace').textContent).toBe('true')
      expect(screen.getByTestId('has-edit-socket').textContent).toBe('false')
    })

    it('passes selectedEditSocket (not selectedSocketToReplace) for non-CONTAINER_SELECTION flows', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /move to maintenance/i }))
      expect(screen.getByTestId('has-edit-socket').textContent).toBe('true')
      expect(screen.getByTestId('has-socket-to-replace').textContent).toBe('false')
    })

    it('closes PositionChangeDialog when its onClose is called', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /move to maintenance/i }))
      fireEvent.click(screen.getByText('close position'))
      expect(screen.queryByTestId('position-change-dialog')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    beforeEach(() => {
      renderComponent({ isLoading: true })
    })

    it('renders Spinner when isLoading is true', () => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('disables Reboot when isLoading is true', () => {
      expect(screen.getByRole('button', { name: /reboot/i })).toBeDisabled()
    })

    it('disables LEDs on when isLoading is true', () => {
      expect(screen.getByRole('button', { name: /leds on/i })).toBeDisabled()
    })

    it('disables LEDs off when isLoading is true', () => {
      expect(screen.getByRole('button', { name: /leds off/i })).toBeDisabled()
    })

    it('disables Move to Maintenance when isLoading is true', () => {
      expect(screen.getByRole('button', { name: /move to maintenance/i })).toBeDisabled()
    })

    it('disables Change miner info when isLoading is true', () => {
      expect(screen.getByRole('button', { name: /change miner info/i })).toBeDisabled()
    })

    it('disables Change position when isLoading is true', () => {
      expect(screen.getByRole('button', { name: /change position/i })).toBeDisabled()
    })
  })

  it('disables Back from Maintenance when isLoading is true', () => {
    setSelectedDevices([maintenanceMiner])
    renderComponent({ isLoading: true })
    expect(screen.getByRole('button', { name: /back from maintenance/i })).toBeDisabled()
  })
})
