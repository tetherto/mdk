import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContainerControlsBoxProps } from '../container-controls-box'
import { ContainerControlsBox } from '../container-controls-box'

import { useDispatch } from 'react-redux'
import type { Device } from '../../../../../types'
import {
  getAntspaceContainerControlsBoxData,
  getBitdeerContainerControlsBoxData,
  isAntspaceHydro,
  isAntspaceImmersion,
  isBitdeer,
  isMicroBT,
} from '../../../../../utils/container-utils'
import { getButtonsStates } from '../../../explorer/details-view/details-view-utils'
import { groupTailLogByMinersByType } from '../../../explorer/details-view/miner-controls-card/miner-controls-utils'
import { getContainerState } from '../../helper'
import {
  resetAlarm,
  setAirExhaustEnabled,
  setPowerMode,
  setTankEnabled,
  switchAllSockets,
  switchContainer,
  switchCoolingSystem,
} from '../container-controls-box-helpers'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()

  return {
    ...actual,
    Button: vi.fn(({ children, disabled, onClick, variant }) => (
      <button
        data-testid={`button-${variant}`}
        data-variant={variant}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    )),
    Switch: vi.fn(({ checked, disabled }) => (
      <input
        type="checkbox"
        data-testid="switch"
        checked={checked ?? false}
        disabled={disabled}
        readOnly
      />
    )),
    SimpleTooltip: vi.fn(({ children, content }) => (
      <div data-testid="tooltip" data-content={content ?? ''}>
        {children}
      </div>
    )),
    ActionButton: vi.fn(({ label, disabled, confirmation }) => (
      <div data-testid="action-button" data-label={label} data-disabled={String(disabled)}>
        <button onClick={confirmation?.onConfirm}>{label}</button>
      </div>
    )),
  }
})

vi.mock('react-redux', () => ({
  useDispatch: vi.fn(() => vi.fn()),
}))

vi.mock('../../../../../state', () => ({
  actionsSlice: {
    actions: {
      setAddPendingSubmissionAction: vi.fn((p) => ({ type: 'ADD_PENDING', payload: p })),
    },
  },
  devicesSlice: {
    actions: {
      setResetSelections: vi.fn(() => ({ type: 'RESET_SELECTIONS' })),
    },
  },
}))

vi.mock('../../../../../hooks/use-update-existed-actions', () => ({
  useUpdateExistedActions: vi.fn(() => ({
    updateExistedActions: vi.fn(),
  })),
}))

vi.mock('../../../../../utils/container-utils', () => ({
  isBitdeer: vi.fn(() => false),
  isAntspaceHydro: vi.fn(() => false),
  isAntspaceImmersion: vi.fn(() => false),
  isMicroBT: vi.fn(() => false),
  getBitdeerContainerControlsBoxData: vi.fn(() => ({
    id: 'device-001',
    tank1Enabled: true,
    tank2Enabled: false,
    exhaustFanEnabled: true,
    pidModeEnabled: false,
    runningModeEnabled: false,
  })),
  getAntspaceContainerControlsBoxData: vi.fn(() => ({
    id: 'device-001',
    pidModeEnabled: true,
    runningModeEnabled: true,
    tank1Enabled: false,
    tank2Enabled: false,
    exhaustFanEnabled: false,
  })),
}))

vi.mock('../../../../../utils/status-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../utils/status-utils')>()
  return {
    ...actual,
    CONTAINER_STATUS: {
      OFFLINE: 'offline',
      RUNNING: 'running',
    },
  }
})

vi.mock('../../../explorer/details-view/details-view-utils', () => ({
  getButtonsStates: vi.fn(() => ({
    isSwitchContainerButtonDisabled: false,
    isSwitchCoolingSystemButtonDisabled: false,
    isResetAlarmButtonDisabled: false,
    isSetTank1EnabledButtonDisabled: false,
    isSetTank2EnabledButtonDisabled: false,
    isSetAirExhaustEnabledButtonDisabled: false,
    isSwitchSocketButtonDisabled: false,
  })),
}))

vi.mock('../../helper', () => ({
  getContainerState: vi.fn(() => ({
    isStarted: false,
    isAllSocketsOn: false,
  })),
}))

vi.mock('../../../explorer/details-view/miner-controls-card/miner-controls-utils', () => ({
  groupTailLogByMinersByType: vi.fn(() => ({ mode: 'eco' })),
}))

vi.mock(
  '../../../explorer/details-view/miner-power-mode-selection-buttons/miner-power-mode-selection-buttons',
  () => ({
    MinerPowerModeSelectionButtons: vi.fn(({ disabled, setPowerMode }) => (
      <div data-testid="power-mode-buttons" data-disabled={String(disabled)}>
        <button onClick={() => setPowerMode([], 'eco')}>Set Eco Mode</button>
      </div>
    )),
  }),
)

vi.mock('../../content-box/content-box', () => ({
  ContentBox: vi.fn(({ children, title }) => (
    <div data-testid="content-box" data-title={title}>
      {children}
    </div>
  )),
}))

vi.mock('../../../alarm/alarm-contents/alarm-contents', () => ({
  AlarmContents: vi.fn(({ alarmsData }) => (
    <div data-testid="alarm-contents" data-count={alarmsData?.length ?? 0} />
  )),
}))

vi.mock('../../enabled-disable-toggle/enabled-disable-toggle', () => ({
  EnabledDisableToggle: vi.fn(({ tankNumber, isOffline, isButtonDisabled, value, onToggle }) => (
    <div
      data-testid={`toggle-tank-${tankNumber}`}
      data-offline={String(isOffline)}
      data-disabled={String(isButtonDisabled)}
      data-value={String(value)}
    >
      <button onClick={() => onToggle({ isOn: true, tankNumber })}>Toggle {tankNumber}</button>
    </div>
  )),
}))

vi.mock('../../system-status-control-box/system-status-control-box', () => ({
  SystemStatusControlBox: vi.fn(({ data }) => (
    <div data-testid="bitmain-immersion-status" data-id={data?.id} />
  )),
}))

vi.mock('../container-controls-box-helpers', () => ({
  switchContainer: vi.fn(),
  switchCoolingSystem: vi.fn(),
  setTankEnabled: vi.fn(),
  setAirExhaustEnabled: vi.fn(),
  resetAlarm: vi.fn(),
  setPowerMode: vi.fn(),
  switchAllSockets: vi.fn(),
}))

vi.mock('@radix-ui/react-icons', () => ({
  QuestionMarkCircledIcon: vi.fn(() => <span>?</span>),
}))

const makeDevice = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'device-001',
    type: 't-unknown',
    info: { container: 'container-1' },
    last: { snap: { stats: { status: 'running' } } },
    ...overrides,
  }) as Device

const makeProps = (
  overrides: Partial<ContainerControlsBoxProps> = {},
): ContainerControlsBoxProps => ({
  data: makeDevice(),
  isBatch: false,
  selectedDevices: [],
  pendingSubmissions: [],
  alarmsDataItems: [],
  onNavigate: vi.fn(),
  ...overrides,
})

describe('ContainerControlsBox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isBitdeer).mockReturnValue(false)
    vi.mocked(isAntspaceHydro).mockReturnValue(false)
    vi.mocked(isAntspaceImmersion).mockReturnValue(false)
    vi.mocked(isMicroBT).mockReturnValue(false)
    vi.mocked(getContainerState).mockReturnValue({ isStarted: false, isAllSocketsOn: false })
    vi.mocked(getButtonsStates).mockReturnValue({
      isSwitchContainerButtonDisabled: false,
      isSwitchCoolingSystemButtonDisabled: false,
      isResetAlarmButtonDisabled: false,
      isSetTank1EnabledButtonDisabled: false,
      isSetTank2EnabledButtonDisabled: false,
      isSetAirExhaustEnabledButtonDisabled: false,
      isSwitchSocketButtonDisabled: false,
    })
    vi.mocked(useDispatch).mockReturnValue(vi.fn())
  })

  describe('base rendering', () => {
    it('renders the root container', () => {
      const { container } = render(<ContainerControlsBox {...makeProps()} />)
      expect(container.querySelector('.mdk-container-controls-box')).toBeInTheDocument()
    })

    it('renders ContentBox with Active Alarms title', () => {
      render(<ContainerControlsBox {...makeProps()} />)
      expect(screen.getByTestId('content-box')).toHaveAttribute('data-title', 'Active Alarms')
    })

    it('renders AlarmContents with alarmsDataItems count', () => {
      const items = [{ item: {}, dot: null, children: null }] as any
      render(<ContainerControlsBox {...makeProps({ alarmsDataItems: items })} />)
      expect(screen.getByTestId('alarm-contents')).toHaveAttribute('data-count', '1')
    })

    it('renders AlarmContents with 0 count by default', () => {
      render(<ContainerControlsBox {...makeProps()} />)
      expect(screen.getByTestId('alarm-contents')).toHaveAttribute('data-count', '0')
    })

    it('renders MinerPowerModeSelectionButtons', () => {
      render(<ContainerControlsBox {...makeProps()} />)
      expect(screen.getByTestId('power-mode-buttons')).toBeInTheDocument()
    })

    it('does not render bitdeer buttons for unknown type', () => {
      render(<ContainerControlsBox {...makeProps()} />)
      expect(screen.queryByText('Start')).not.toBeInTheDocument()
      expect(screen.queryByText('Stop')).not.toBeInTheDocument()
      expect(screen.queryByText('Reset Alarm')).not.toBeInTheDocument()
    })

    it('does not render cooling buttons for unknown type', () => {
      render(<ContainerControlsBox {...makeProps()} />)
      expect(screen.queryByText('Start Cooling')).not.toBeInTheDocument()
      expect(screen.queryByText('Stop Cooling')).not.toBeInTheDocument()
    })

    it('does not render tank toggles for unknown type', () => {
      render(<ContainerControlsBox {...makeProps()} />)
      expect(screen.queryByTestId('toggle-tank-1')).not.toBeInTheDocument()
    })
  })

  describe('Bitdeer type', () => {
    beforeEach(() => {
      vi.mocked(isBitdeer).mockReturnValue(true)
    })

    it('renders Start button', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      expect(screen.getByText('Start')).toBeInTheDocument()
    })

    it('renders Stop button', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      expect(screen.getByText('Stop')).toBeInTheDocument()
    })

    it('renders Reset Alarm button', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      expect(screen.getByText('Reset Alarm')).toBeInTheDocument()
    })

    it('renders Power All Sockets On action button', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      expect(screen.getByTestId('action-button')).toBeInTheDocument()
    })

    it('renders Power All Sockets Off button', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      expect(screen.getByText('Power All Sockets Off')).toBeInTheDocument()
    })

    it('renders tank-1 toggle', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      expect(screen.getByTestId('toggle-tank-1')).toBeInTheDocument()
    })

    it('renders tank-2 toggle', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      expect(screen.getByTestId('toggle-tank-2')).toBeInTheDocument()
    })

    it('renders air exhaust toggle (tank-0)', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      expect(screen.getByTestId('toggle-tank-0')).toBeInTheDocument()
    })

    it('calls switchContainer with isOn=true when Start clicked', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      fireEvent.click(screen.getByText('Start'))
      expect(vi.mocked(switchContainer)).toHaveBeenCalledWith(
        expect.objectContaining({ isOn: true }),
      )
    })

    it('calls resetAlarm when Reset Alarm clicked', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      fireEvent.click(screen.getByText('Reset Alarm'))
      expect(vi.mocked(resetAlarm)).toHaveBeenCalledOnce()
    })

    it('calls switchAllSockets with isOn=true when Power All Sockets On confirmed', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      fireEvent.click(screen.getByText('Power All Sockets On'))
      expect(vi.mocked(switchAllSockets)).toHaveBeenCalledWith(
        expect.objectContaining({ isOn: true }),
      )
    })

    it('calls setTankEnabled with tankNumber=1 when tank-1 toggled', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      fireEvent.click(screen.getByText('Toggle 1'))
      expect(vi.mocked(setTankEnabled)).toHaveBeenCalledWith(
        expect.objectContaining({ tankNumber: 1 }),
      )
    })

    it('calls setTankEnabled with tankNumber=2 when tank-2 toggled', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      fireEvent.click(screen.getByText('Toggle 2'))
      expect(vi.mocked(setTankEnabled)).toHaveBeenCalledWith(
        expect.objectContaining({ tankNumber: 2 }),
      )
    })

    it('calls setAirExhaustEnabled when tank-0 toggled', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      fireEvent.click(screen.getByText('Toggle 0'))
      expect(vi.mocked(setAirExhaustEnabled)).toHaveBeenCalledOnce()
    })

    it('passes isBatch to switchContainer', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-bitdeer' }), isBatch: true })}
        />,
      )
      fireEvent.click(screen.getByText('Start'))
      expect(vi.mocked(switchContainer)).toHaveBeenCalledWith(
        expect.objectContaining({ isBatch: true }),
      )
    })

    it('passes selectedDevices to switchContainer', () => {
      const selectedDevices = [makeDevice()]
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-bitdeer' }), selectedDevices })}
        />,
      )
      fireEvent.click(screen.getByText('Start'))
      expect(vi.mocked(switchContainer)).toHaveBeenCalledWith(
        expect.objectContaining({ selectedDevices }),
      )
    })
  })

  describe('offline state', () => {
    beforeEach(() => {
      vi.mocked(isBitdeer).mockReturnValue(true)
    })

    const makeOfflineDevice = () =>
      makeDevice({ last: { snap: { stats: { status: 'offline' } } }, type: 't-bitdeer' })

    it('disables Start button when offline', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeOfflineDevice() })} />)
      expect(screen.getByText('Start').closest('button')).toBeDisabled()
    })

    it('disables Stop button when offline', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeOfflineDevice() })} />)
      expect(screen.getByText('Stop').closest('button')).toBeDisabled()
    })

    it('disables Reset Alarm button when offline', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeOfflineDevice() })} />)
      expect(screen.getByText('Reset Alarm').closest('button')).toBeDisabled()
    })

    it('shows offline tooltip content when offline', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeOfflineDevice() })} />)
      const tooltips = screen.getAllByTestId('tooltip')
      const offlineTooltip = tooltips.find(
        (t) => t.getAttribute('data-content') === 'Container is offline',
      )
      expect(offlineTooltip).toBeInTheDocument()
    })

    it('does not show offline tooltip when online', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      const tooltips = screen.getAllByTestId('tooltip')
      tooltips.forEach((t) => {
        expect(t).not.toHaveAttribute('data-content', 'Container is offline')
      })
    })
  })

  describe('Antspace Hydro type', () => {
    beforeEach(() => {
      vi.mocked(isAntspaceHydro).mockReturnValue(true)
    })

    it('renders Start Cooling button', () => {
      render(
        <ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-antspace-hydro' }) })} />,
      )
      expect(screen.getByText('Start Cooling')).toBeInTheDocument()
    })

    it('renders Stop Cooling button', () => {
      render(
        <ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-antspace-hydro' }) })} />,
      )
      expect(screen.getByText('Stop Cooling')).toBeInTheDocument()
    })

    it('calls switchCoolingSystem with isOn=true when Start Cooling clicked', () => {
      render(
        <ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-antspace-hydro' }) })} />,
      )
      fireEvent.click(screen.getByText('Start Cooling'))
      expect(vi.mocked(switchCoolingSystem)).toHaveBeenCalledWith(
        expect.objectContaining({ isOn: true }),
      )
    })

    it('renders PID Mode switch when not batch', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-antspace-hydro' }), isBatch: false })}
        />,
      )
      expect(screen.getByText('PID Mode Enabled:')).toBeInTheDocument()
    })

    it('does not render PID Mode switch when isBatch', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-antspace-hydro' }), isBatch: true })}
        />,
      )
      expect(screen.queryByText('PID Mode Enabled:')).not.toBeInTheDocument()
    })

    it('does not render bitdeer buttons', () => {
      render(
        <ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-antspace-hydro' }) })} />,
      )
      expect(screen.queryByText('Start')).not.toBeInTheDocument()
      expect(screen.queryByText('Reset Alarm')).not.toBeInTheDocument()
    })
  })

  describe('Antspace Immersion type', () => {
    beforeEach(() => {
      vi.mocked(isAntspaceImmersion).mockReturnValue(true)
    })

    it('renders BitMainImmersionSystemStatus', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-antspace-immersion' }) })}
        />,
      )
      expect(screen.getByTestId('bitmain-immersion-status')).toBeInTheDocument()
    })

    it('renders PID Mode switch when not batch', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-antspace-immersion' }), isBatch: false })}
        />,
      )
      expect(screen.getByText('PID Mode Enabled:')).toBeInTheDocument()
    })

    it('renders Running Mode switch when not batch', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-antspace-immersion' }), isBatch: false })}
        />,
      )
      expect(screen.getByText('Running Mode Enabled:')).toBeInTheDocument()
    })

    it('does not render PID Mode switch when isBatch', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-antspace-immersion' }), isBatch: true })}
        />,
      )
      expect(screen.queryByText('PID Mode Enabled:')).not.toBeInTheDocument()
    })

    it('does not render Running Mode switch when isBatch', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-antspace-immersion' }), isBatch: true })}
        />,
      )
      expect(screen.queryByText('Running Mode Enabled:')).not.toBeInTheDocument()
    })

    it('renders Start Cooling and Stop Cooling', () => {
      render(
        <ContainerControlsBox
          {...makeProps({ data: makeDevice({ type: 't-antspace-immersion' }) })}
        />,
      )
      expect(screen.getByText('Start Cooling')).toBeInTheDocument()
      expect(screen.getByText('Stop Cooling')).toBeInTheDocument()
    })
  })

  describe('MicroBT type', () => {
    beforeEach(() => {
      vi.mocked(isMicroBT).mockReturnValue(true)
    })

    it('renders Start Cooling button', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-microbt' }) })} />)
      expect(screen.getByText('Start Cooling')).toBeInTheDocument()
    })

    it('renders Power All Sockets On action button', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-microbt' }) })} />)
      expect(screen.getByTestId('action-button')).toBeInTheDocument()
    })

    it('renders Power All Sockets Off button', () => {
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-microbt' }) })} />)
      expect(screen.getByText('Power All Sockets Off')).toBeInTheDocument()
    })
  })

  describe('MinerPowerModeSelectionButtons', () => {
    it('is disabled when not batch and container is not started', () => {
      vi.mocked(getContainerState).mockReturnValue({ isStarted: false, isAllSocketsOn: false })
      render(<ContainerControlsBox {...makeProps({ isBatch: false })} />)
      expect(screen.getByTestId('power-mode-buttons')).toHaveAttribute('data-disabled', 'true')
    })

    it('is not disabled when isBatch is true', () => {
      render(<ContainerControlsBox {...makeProps({ isBatch: true })} />)
      expect(screen.getByTestId('power-mode-buttons')).toHaveAttribute('data-disabled', 'false')
    })

    it('is not disabled when container is started', () => {
      vi.mocked(getContainerState).mockReturnValue({ isStarted: true, isAllSocketsOn: false })
      render(<ContainerControlsBox {...makeProps({ isBatch: false })} />)
      expect(screen.getByTestId('power-mode-buttons')).toHaveAttribute('data-disabled', 'false')
    })

    it('calls setPowerMode helper when power mode button clicked', () => {
      render(<ContainerControlsBox {...makeProps()} />)
      fireEvent.click(screen.getByText('Set Eco Mode'))
      expect(vi.mocked(setPowerMode)).toHaveBeenCalledWith(
        expect.objectContaining({ powerMode: 'eco' }),
      )
    })
  })

  describe('tailLogData effect', () => {
    it('calls groupTailLogByMinersByType when isBatch and has tailLogData and selectedDevices', async () => {
      const selectedDevices = [makeDevice()]

      await act(async () => {
        render(
          <ContainerControlsBox
            {...makeProps({
              isBatch: true,
              selectedDevices,
              tailLogData: [{ key: 'value' }],
            })}
          />,
        )
      })

      expect(vi.mocked(groupTailLogByMinersByType)).toHaveBeenCalledWith(selectedDevices, {
        key: 'value',
      })
    })

    it('does not call groupTailLogByMinersByType when isBatch is false', async () => {
      await act(async () => {
        render(
          <ContainerControlsBox
            {...makeProps({
              isBatch: false,
              selectedDevices: [makeDevice()],
              tailLogData: [{ key: 'value' }],
            })}
          />,
        )
      })

      expect(vi.mocked(groupTailLogByMinersByType)).not.toHaveBeenCalled()
    })

    it('does not call groupTailLogByMinersByType when selectedDevices is empty', async () => {
      await act(async () => {
        render(
          <ContainerControlsBox
            {...makeProps({
              isBatch: true,
              selectedDevices: [],
              tailLogData: [{ key: 'value' }],
            })}
          />,
        )
      })

      expect(vi.mocked(groupTailLogByMinersByType)).not.toHaveBeenCalled()
    })

    it('does not call groupTailLogByMinersByType when tailLogData is empty', async () => {
      await act(async () => {
        render(
          <ContainerControlsBox
            {...makeProps({
              isBatch: true,
              selectedDevices: [makeDevice()],
              tailLogData: [],
            })}
          />,
        )
      })

      expect(vi.mocked(groupTailLogByMinersByType)).not.toHaveBeenCalled()
    })
  })

  describe('containerControlsData effect', () => {
    it('calls getBitdeerContainerControlsBoxData when isBitdeer', async () => {
      vi.mocked(isBitdeer).mockReturnValue(true)

      await act(async () => {
        render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      })

      expect(vi.mocked(getBitdeerContainerControlsBoxData)).toHaveBeenCalledWith(
        expect.objectContaining({ type: 't-bitdeer' }),
      )
    })

    it('calls getAntspaceContainerControlsBoxData when isAntspaceHydro', async () => {
      vi.mocked(isAntspaceHydro).mockReturnValue(true)

      await act(async () => {
        render(
          <ContainerControlsBox
            {...makeProps({ data: makeDevice({ type: 't-antspace-hydro' }) })}
          />,
        )
      })

      expect(vi.mocked(getAntspaceContainerControlsBoxData)).toHaveBeenCalledWith(
        expect.objectContaining({ type: 't-antspace-hydro' }),
      )
    })

    it('does not call either util when type is unknown', async () => {
      await act(async () => {
        render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 'unknown' }) })} />)
      })

      expect(vi.mocked(getBitdeerContainerControlsBoxData)).not.toHaveBeenCalled()
      expect(vi.mocked(getAntspaceContainerControlsBoxData)).not.toHaveBeenCalled()
    })
  })

  describe('props passthrough', () => {
    it('passes selectedDevices to getButtonsStates', () => {
      const selectedDevices = [makeDevice()]
      render(<ContainerControlsBox {...makeProps({ selectedDevices })} />)
      expect(vi.mocked(getButtonsStates)).toHaveBeenCalledWith(
        expect.objectContaining({ selectedDevices }),
      )
    })

    it('passes pendingSubmissions to getButtonsStates', () => {
      const pendingSubmissions = [{ id: '1', action: 'test', tags: [] }]
      render(<ContainerControlsBox {...makeProps({ pendingSubmissions })} />)
      expect(vi.mocked(getButtonsStates)).toHaveBeenCalledWith(
        expect.objectContaining({ pendingSubmissions }),
      )
    })

    it('passes data stats to getContainerState', () => {
      const data = makeDevice({ last: { snap: { stats: { status: 'running' } } } })
      render(<ContainerControlsBox {...makeProps({ data })} />)
      expect(vi.mocked(getContainerState)).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running' }),
      )
    })

    it('passes callbacks to action helpers', () => {
      vi.mocked(isBitdeer).mockReturnValue(true)
      render(<ContainerControlsBox {...makeProps({ data: makeDevice({ type: 't-bitdeer' }) })} />)
      fireEvent.click(screen.getByText('Start'))
      expect(vi.mocked(switchContainer)).toHaveBeenCalledWith(
        expect.objectContaining({
          onAddPendingSubmission: expect.any(Function),
          onResetSelections: expect.any(Function),
          onUpdateExistedActions: expect.any(Function),
        }),
      )
    })
  })
})
