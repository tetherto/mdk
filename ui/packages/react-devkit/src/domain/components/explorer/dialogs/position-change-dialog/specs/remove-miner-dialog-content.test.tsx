// @vitest-environment jsdom
import { actionsStore } from '@tetherto/mdk-ui-foundation'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '@domain/constants/actions'
import type { Device } from '@domain/types'
import { getDeviceContainerPosText } from '@domain/utils/container-utils'
import { notifyInfo } from '@domain/utils/notification-utils'
import { RemoveMinerDialogContent } from '../remove-miner-dialog/remove-miner-dialog-content'

vi.mock('@domain/utils/container-utils', () => ({
  getDeviceContainerPosText: vi.fn(() => 'CON-BBR-01 / A1'),
}))

vi.mock('@domain/utils/notification-utils', () => ({
  notifyInfo: vi.fn(),
}))

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
  let setAddSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    actionsStore.getState().clearAllPendingSubmissions()
    setAddSpy = vi.spyOn(actionsStore.getState(), 'setAddPendingSubmissionAction')
  })

  afterEach(() => {
    setAddSpy.mockRestore()
    actionsStore.getState().clearAllPendingSubmissions()
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

    it('renders the Remove Miner button', () => {
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

    it('does not enqueue an action when Cancel is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(setAddSpy).not.toHaveBeenCalled()
    })
  })

  describe('Remove Miner button', () => {
    it('enqueues a pending submission with the correct payload', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))

      expect(setAddSpy).toHaveBeenCalledWith({
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
      expect(actionsStore.getState().pendingSubmissions).toHaveLength(1)
    })

    it('uses pdu_socket fallback for pos when pos is absent', () => {
      const { pos: _omitted, ...socketWithoutPos } = defaultProps.selectedEditSocket
      renderComponent({ selectedEditSocket: socketWithoutPos })
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))

      expect(setAddSpy).toHaveBeenCalledWith(expect.objectContaining({ pos: 'PDU-01_S1' }))
    })

    it('uses pdu_socket fallback for pos when pos is empty string', () => {
      renderComponent({ selectedEditSocket: { ...defaultProps.selectedEditSocket, pos: '' } })
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))

      expect(setAddSpy).toHaveBeenCalledWith(expect.objectContaining({ pos: 'PDU-01_S1' }))
    })

    it('notifies the user once the action is added', () => {
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

    it('calls onCancel after enqueuing the action', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /remove miner/i }))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })
})
