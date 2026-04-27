import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoveMinerDialogContent } from '../remove-miner-dialog/remove-miner-dialog-content'

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../../constants/actions'
import { actionsSlice } from '../../../../../../state'
import type { Device } from '../../../../../../types'
import { getDeviceContainerPosText } from '../../../../../../utils/container-utils'
import { notifyInfo } from '../../../../../../utils/notification-utils'

const mockDispatch = vi.fn()
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}))

vi.mock('../../../../../../utils/container-utils', () => ({
  getDeviceContainerPosText: vi.fn(() => 'CON-BBR-01 / A1'),
}))

vi.mock('../../../../../../utils/notification-utils', () => ({
  notifyInfo: vi.fn(),
}))

vi.mock('../../../../../../state', () => ({
  actionsSlice: {
    actions: {
      setAddPendingSubmissionAction: vi.fn((payload) => ({ type: 'SET_PENDING', payload })),
    },
  },
}))

const { setAddPendingSubmissionAction } = actionsSlice.actions

const mockMiner = {
  id: 'miner-1',
  rack: 'rack-001',
  code: 'M-SNOW-01',
  tags: ['Production'],
  info: { pos: 'A1', container: 'CON-BBR-01' },
} as unknown as Device

const defaultProps = {
  selectedEditSocket: {
    miner: mockMiner,
    containerInfo: { container: 'CON-BBR-01' },
    pos: 'A1',
    pdu: 'PDU-01',
    socket: 'S1',
  },
  onCancel: vi.fn(),
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<RemoveMinerDialogContent {...defaultProps} {...overrides} />)

describe('RemoveMinerDialogContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the confirmation warning message', () => {
      renderComponent()
      expect(screen.getByText(/are you sure to permanently remove miner/i)).toBeInTheDocument()
    })

    it('renders the miner id in the warning', () => {
      renderComponent()
      expect(screen.getByText(mockMiner.id)).toBeInTheDocument()
    })

    it('renders nothing for miner id when selectedEditSocket is absent', () => {
      renderComponent({ selectedEditSocket: undefined })
      expect(screen.queryByText(mockMiner.id)).not.toBeInTheDocument()
    })

    it('renders the Cancel button', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders the "Remove Miner" button', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /remove miner/i })).toBeInTheDocument()
    })
  })

  describe('cancel button', () => {
    it('calls onCancel when Cancel is clicked', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('does not dispatch when Cancel is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('"Remove Miner" button', () => {
    it('dispatches setAddPendingSubmissionAction with correct shape', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))

      expect(setAddPendingSubmissionAction).toHaveBeenCalledWith({
        type: SUBMIT_ACTION_TYPES.VOTING,
        action: ACTION_TYPES.FORGET_THINGS,
        params: [
          {
            rackId: mockMiner.rack,
            query: { id: mockMiner.id },
          },
        ],
        container: defaultProps.selectedEditSocket.containerInfo.container,
        pos: defaultProps.selectedEditSocket.pos,
        minerId: mockMiner.id,
      })
    })

    it('dispatches the action returned by setAddPendingSubmissionAction', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))
      expect(mockDispatch).toHaveBeenCalledOnce()
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_PENDING' }))
    })

    it('uses pdu_socket fallback for pos when pos is absent', () => {
      const { pos: _omitted, ...socketWithoutPos } = defaultProps.selectedEditSocket
      renderComponent({ selectedEditSocket: socketWithoutPos })
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))

      expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
        expect.objectContaining({ pos: 'PDU-01_S1' }),
      )
    })

    it('uses pdu_socket fallback for pos when pos is empty string', () => {
      renderComponent({ selectedEditSocket: { ...defaultProps.selectedEditSocket, pos: '' } })
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))

      expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
        expect.objectContaining({ pos: 'PDU-01_S1' }),
      )
    })

    it('calls notifyInfo with correct title and message', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))
      expect(notifyInfo).toHaveBeenCalledWith(
        'Action added',
        `Remove miner ${mockMiner.id} from CON-BBR-01 / A1`,
      )
    })

    it('calls getDeviceContainerPosText with the selectedEditSocket', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))
      expect(getDeviceContainerPosText).toHaveBeenCalledWith(defaultProps.selectedEditSocket)
    })

    it('calls onCancel after dispatching', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onCancel after dispatch and notification', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))

      const dispatchOrder = mockDispatch.mock.invocationCallOrder[0]
      const notifyOrder = vi.mocked(notifyInfo).mock.invocationCallOrder[0]
      const cancelOrder = onCancel.mock.invocationCallOrder[0]

      expect(dispatchOrder).toBeLessThan(cancelOrder)
      expect(notifyOrder).toBeLessThan(cancelOrder)
    })
  })
})
