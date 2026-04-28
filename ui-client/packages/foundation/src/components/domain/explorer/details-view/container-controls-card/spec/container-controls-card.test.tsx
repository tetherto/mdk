// @vitest-environment jsdom
import { UNITS } from '@tetherto/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { useSelector } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../../constants/actions'
import {
  getNumberSelected,
  isContainerControlNotSupported,
} from '../../../../../../utils/container-utils'
import { ContainerControlsCard } from '../container-controls-card'

const { mockDispatch, mockNotifyInfo } = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockNotifyInfo: vi.fn(),
}))

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn(),
}))

vi.mock('../../../../../../utils/notification-utils', () => ({
  notifyInfo: mockNotifyInfo,
}))

vi.mock('../../../../../../state', () => ({
  actionsSlice: {
    actions: {
      setAddPendingSubmissionAction: (payload: unknown) => ({
        type: 'actions/setAddPendingSubmissionAction',
        payload,
      }),
    },
    selectors: {},
  },
  selectSelectedSockets: vi.fn(),
}))

vi.mock('../../../../../../utils/container-utils', () => ({
  getNumberSelected: vi.fn(() => ({ nSockets: 2 })),
  isContainerControlNotSupported: vi.fn(() => false),
}))

vi.mock('../../../../../../utils/device-utils', () => ({
  appendContainerToTag: vi.fn((name: string) => `tag:${name}`),
  getOnOffText: vi.fn((isOn: boolean) => (isOn ? 'on' : 'off')),
}))

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...actual,
    formatNumber: vi.fn((v: number) => String(Math.round(v))),
    unitToKilo: vi.fn((v: number) => v / 1000),
    ActionButton: ({ label, confirmation, disabled }: any) => (
      <button data-testid="power-on-btn" disabled={disabled} onClick={confirmation?.onConfirm}>
        {label}
      </button>
    ),
  }
})

const setSelectedSockets = (containers: Record<string, { sockets: any[] }>) => {
  vi.mocked(useSelector).mockReturnValue(containers as any)
}

const twoOffSockets = [
  { pduIndex: 0, socketIndex: 1, enabled: false, power_w: 1500, current_a: 6.5 },
  { pduIndex: 0, socketIndex: 2, enabled: false, power_w: 1750, current_a: 7.5 },
]

const defaultContainers = { 'CON-BBR-01': { sockets: twoOffSockets } }

const defaultProps = { isLoading: false, buttonsStates: {} }

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<ContainerControlsCard {...defaultProps} {...overrides} />)

describe('ContainerControlsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSelectedSockets(defaultContainers)
    vi.mocked(getNumberSelected).mockReturnValue({
      nSockets: 2,
      nContainers: 0,
    })
    vi.mocked(isContainerControlNotSupported).mockReturnValue(false)
  })

  describe('null render guard', () => {
    it('returns null when nSockets is 0', () => {
      vi.mocked(getNumberSelected).mockReturnValue({
        nSockets: 0,
        nContainers: 0,
      })
      const { container } = renderComponent()
      expect(container.firstChild).toBeNull()
    })

    it('returns null when nSockets is negative', () => {
      vi.mocked(getNumberSelected).mockReturnValue({
        nSockets: -1,
        nContainers: 0,
      })
      const { container } = renderComponent()
      expect(container.firstChild).toBeNull()
    })

    it('returns null when any container is unsupported', () => {
      vi.mocked(isContainerControlNotSupported).mockReturnValue(true)
      const { container } = renderComponent()
      expect(container.firstChild).toBeNull()
    })

    it('renders when nSockets > 0 and all containers supported', () => {
      renderComponent()
      expect(screen.getByText('Container Controls')).toBeInTheDocument()
    })
  })

  describe('stats display', () => {
    it('renders Power stat label', () => {
      renderComponent()
      expect(screen.getByText(`Power (${UNITS.POWER_KW})`)).toBeInTheDocument()
    })

    it('renders Current stat label', () => {
      renderComponent()
      expect(screen.getByText(`Current (${UNITS.AMPERE})`)).toBeInTheDocument()
    })

    it('computes and displays summed power via unitToKilo', () => {
      setSelectedSockets({
        'CON-BBR-01': {
          sockets: [
            { pduIndex: 0, socketIndex: 1, enabled: false, power_w: 1000, current_a: 4 },
            { pduIndex: 0, socketIndex: 2, enabled: false, power_w: 2000, current_a: 6 },
          ],
        },
        'CON-BBR-02': {
          sockets: [{ pduIndex: 0, socketIndex: 1, enabled: false, power_w: 500, current_a: 2 }],
        },
      })
      renderComponent()
      // unitToKilo(3500) = 3.5
      expect(screen.getByText('3.5')).toBeInTheDocument()
    })

    it('computes and displays summed current via formatNumber', () => {
      setSelectedSockets({
        'CON-BBR-01': {
          sockets: [
            { pduIndex: 0, socketIndex: 1, enabled: false, power_w: 1000, current_a: 5 },
            { pduIndex: 0, socketIndex: 2, enabled: false, power_w: 2000, current_a: 8 },
          ],
        },
      })
      renderComponent()
      // formatNumber(13) = '13'
      expect(screen.getByText('13')).toBeInTheDocument()
    })
  })

  describe('Power on action', () => {
    it('renders the Power on button', () => {
      renderComponent()
      expect(screen.getByTestId('power-on-btn')).toHaveTextContent('Power on')
    })

    it('dispatches SWITCH_SOCKET with correct type and action when confirmed', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('power-on-btn'))
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            type: SUBMIT_ACTION_TYPES.VOTING,
            action: ACTION_TYPES.SWITCH_SOCKET,
          }),
        }),
      )
    })

    it('dispatches with the correct container tag', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('power-on-btn'))
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ tags: ['tag:CON-BBR-01'] }),
        }),
      )
    })

    it('dispatches socket payload with isOn=true', () => {
      setSelectedSockets({
        'CON-BBR-01': {
          sockets: [{ pduIndex: 0, socketIndex: 1, enabled: false, power_w: 1500, current_a: 6 }],
        },
      })
      renderComponent()
      fireEvent.click(screen.getByTestId('power-on-btn'))
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ params: [[[0, 1, true]]] }),
        }),
      )
    })

    it('calls notifyInfo "Action added" after power on', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('power-on-btn'))
      expect(mockNotifyInfo).toHaveBeenCalledWith('Action added', expect.stringContaining('on'))
    })

    it('uses plural "Sockets" when more than one socket', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('power-on-btn'))
      expect(mockNotifyInfo).toHaveBeenCalledWith(
        'Action added',
        expect.stringContaining('2 Sockets'),
      )
    })

    it('uses singular "Socket" when exactly one socket', () => {
      setSelectedSockets({
        'CON-BBR-01': {
          sockets: [{ pduIndex: 0, socketIndex: 1, enabled: false, power_w: 1500, current_a: 6 }],
        },
      })
      renderComponent()
      fireEvent.click(screen.getByTestId('power-on-btn'))
      expect(mockNotifyInfo).toHaveBeenCalledWith(
        'Action added',
        expect.stringContaining('1 Socket '),
      )
    })

    it('calls notifyInfo "No actions added" when all sockets already on', () => {
      setSelectedSockets({
        'CON-BBR-01': {
          sockets: [{ pduIndex: 0, socketIndex: 1, enabled: true, power_w: 1500, current_a: 6 }],
        },
      })
      renderComponent()
      fireEvent.click(screen.getByTestId('power-on-btn'))
      expect(mockNotifyInfo).toHaveBeenCalledWith(
        'No actions added',
        'No sockets affected by the action',
      )
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('Power off action', () => {
    it('renders the Power off button', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /power off/i })).toBeInTheDocument()
    })

    it('calls notifyInfo "No actions added" when all sockets already off', () => {
      renderComponent() // default sockets are already enabled: false
      fireEvent.click(screen.getByRole('button', { name: /power off/i }))
      expect(mockNotifyInfo).toHaveBeenCalledWith(
        'No actions added',
        'No sockets affected by the action',
      )
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('disabled states', () => {
    it('disables Power on when isSwitchSocketButtonDisabled is true', () => {
      renderComponent({ buttonsStates: { isSwitchSocketButtonDisabled: true } })
      expect(screen.getByTestId('power-on-btn')).toBeDisabled()
    })

    it('disables Power off when isSwitchSocketButtonDisabled is true', () => {
      renderComponent({ buttonsStates: { isSwitchSocketButtonDisabled: true } })
      expect(screen.getByRole('button', { name: /power off/i })).toBeDisabled()
    })

    it('disables Power on when isLoading is true', () => {
      renderComponent({ isLoading: true })
      expect(screen.getByTestId('power-on-btn')).toBeDisabled()
    })

    it('disables Power off when isLoading is true', () => {
      renderComponent({ isLoading: true })
      expect(screen.getByRole('button', { name: /power off/i })).toBeDisabled()
    })
  })

  describe('multiple containers', () => {
    it('dispatches once per container that has changes', () => {
      setSelectedSockets({
        'CON-BBR-01': {
          sockets: [{ pduIndex: 0, socketIndex: 1, enabled: false, power_w: 1000, current_a: 5 }],
        },
        'CON-BBR-02': {
          sockets: [{ pduIndex: 0, socketIndex: 1, enabled: false, power_w: 500, current_a: 2 }],
        },
      })
      vi.mocked(getNumberSelected).mockReturnValue({ nSockets: 2 })
      renderComponent()
      fireEvent.click(screen.getByTestId('power-on-btn'))
      expect(mockDispatch).toHaveBeenCalledTimes(2)
    })
  })
})
