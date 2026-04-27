import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MaintenanceDialogContent } from '../maintenance-dialog-content/maintenance-dialog-content'

// ─── Re-imports for assertions ────────────────────────────────────────────────

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../../constants/actions'
import { MAINTENANCE_CONTAINER } from '../../../../../../constants/container-constants'
import { actionsSlice } from '../../../../../../state'
import type { Device } from '../../../../../../types'
import { getDeviceContainerPosText } from '../../../../../../utils/container-utils'
import { getMinerShortCode } from '../../../../../../utils/device-utils'
import { notifyInfo } from '../../../../../../utils/notification-utils'
import { getPosHistory } from '../position-change-dialog-utils'

const mockDispatch = vi.fn()
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}))

vi.mock('../../../../../../utils/container-utils', () => ({
  getDeviceContainerPosText: vi.fn(() => 'CON-BBR-01 / A1'),
}))

vi.mock('../../../../../../utils/device-utils', () => ({
  getMinerShortCode: vi.fn(() => 'M-SNOW-01'),
}))

vi.mock('../../../../../../utils/notification-utils', () => ({
  notifyInfo: vi.fn(),
}))

vi.mock('../position-change-dialog-utils', () => ({
  getPosHistory: vi.fn(() => [
    { container: 'CON-BBR-01', pos: 'A1', removedAt: 1_700_000_000_000 },
  ]),
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
  info: {
    pos: 'A1',
    container: 'CON-BBR-01',
    serialNum: 'SN-12345',
    macAddress: 'aa:bb:cc:dd:ee:ff',
  },
} as unknown as Device

const defaultProps = {
  selectedEditSocket: {
    miner: mockMiner,
    containerInfo: { container: 'CON-BBR-01' },
  },
  onCancel: vi.fn(),
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<MaintenanceDialogContent {...defaultProps} {...overrides} />)

describe('MaintenanceDialogContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the confirmation message', () => {
      renderComponent()
      expect(screen.getByText(/are you sure to send miner/i)).toBeInTheDocument()
    })

    it('renders the short code from getMinerShortCode', () => {
      renderComponent()
      expect(screen.getByText('M-SNOW-01')).toBeInTheDocument()
    })

    it('renders the position text from getDeviceContainerPosText', () => {
      renderComponent()
      expect(screen.getByText(/CON-BBR-01 \/ A1/)).toBeInTheDocument()
    })

    it('renders the Cancel button', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders the "Add to Maintenance" button', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /add to maintenance/i })).toBeInTheDocument()
    })

    it('calls getMinerShortCode with miner code and tags', () => {
      renderComponent()
      expect(getMinerShortCode).toHaveBeenCalledWith(mockMiner.code, mockMiner.tags)
    })

    it('calls getDeviceContainerPosText with containerInfo and pos for display', () => {
      renderComponent()
      expect(getDeviceContainerPosText).toHaveBeenCalledWith({
        containerInfo: defaultProps.selectedEditSocket.containerInfo,
        pos: mockMiner!.info!.pos,
      })
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

  describe('"Add to Maintenance" button', () => {
    it('dispatches setAddPendingSubmissionAction with correct shape', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))

      expect(setAddPendingSubmissionAction).toHaveBeenCalledWith({
        type: SUBMIT_ACTION_TYPES.VOTING,
        action: ACTION_TYPES.UPDATE_THING,
        params: [
          {
            rackId: mockMiner.rack,
            id: mockMiner.id,
            code: mockMiner.code,
            info: {
              ...mockMiner.info,
              container: MAINTENANCE_CONTAINER,
              pos: '',
              subnet: '',
              posHistory: expect.any(Array),
            },
          },
        ],
        minerId: mockMiner.id,
      })
    })

    it('dispatches the action returned by setAddPendingSubmissionAction', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))
      expect(mockDispatch).toHaveBeenCalledOnce()
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_PENDING' }))
    })

    it('calls getPosHistory with the selectedEditSocket', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))
      expect(getPosHistory).toHaveBeenCalledWith(defaultProps.selectedEditSocket)
    })

    it('calls notifyInfo with correct title and message', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))
      expect(notifyInfo).toHaveBeenCalledWith(
        'Action added',
        'Add miner to maintenance CON-BBR-01 / A1',
      )
    })

    it('calls getDeviceContainerPosText with the full selectedEditSocket for the notification', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))
      expect(getDeviceContainerPosText).toHaveBeenCalledWith(defaultProps.selectedEditSocket)
    })

    it('calls onCancel after dispatching', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onCancel after dispatch and notification', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))

      const dispatchOrder = mockDispatch.mock.invocationCallOrder[0]
      const notifyOrder = vi.mocked(notifyInfo).mock.invocationCallOrder[0]
      const cancelOrder = onCancel.mock.invocationCallOrder[0]

      expect(dispatchOrder).toBeLessThan(cancelOrder)
      expect(notifyOrder).toBeLessThan(cancelOrder)
    })
  })

  // ── No-prop safety ────────────────────────────────────────────────────────

  describe('missing props safety', () => {
    it('renders without crashing when all props are omitted', () => {
      expect(() => render(<MaintenanceDialogContent />)).not.toThrow()
    })

    it('does not crash on "Add to Maintenance" click when selectedEditSocket is undefined', () => {
      render(<MaintenanceDialogContent onCancel={vi.fn()} />)
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i })),
      ).not.toThrow()
    })

    it('does not call onCancel on maintenance click when onCancel is undefined', () => {
      render(<MaintenanceDialogContent selectedEditSocket={defaultProps.selectedEditSocket} />)
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i })),
      ).not.toThrow()
    })
  })
})
