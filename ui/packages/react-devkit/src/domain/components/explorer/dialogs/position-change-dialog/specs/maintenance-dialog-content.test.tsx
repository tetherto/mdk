// @vitest-environment jsdom
import { actionsStore } from '@tetherto/mdk-ui-foundation'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '@domain/constants/actions'
import { MAINTENANCE_CONTAINER } from '@domain/constants/container-constants'
import type { Device } from '@domain/types'
import { getDeviceContainerPosText } from '@domain/utils/container-utils'
import { getMinerShortCode } from '@domain/utils/device-utils'
import { notifyInfo } from '@domain/utils/notification-utils'
import { getPosHistory } from '@domain/components/explorer/dialogs/position-change-dialog/position-change-dialog-utils'
import { MaintenanceDialogContent } from '../maintenance-dialog-content/maintenance-dialog-content'

vi.mock('@domain/utils/container-utils', () => ({
  getDeviceContainerPosText: vi.fn(() => 'CON-BBR-01 / A1'),
}))

vi.mock('@domain/utils/device-utils', () => ({
  getMinerShortCode: vi.fn(() => 'M-SNOW-01'),
}))

vi.mock('@domain/utils/notification-utils', () => ({
  notifyInfo: vi.fn(),
}))

vi.mock(
  '@domain/components/explorer/dialogs/position-change-dialog/position-change-dialog-utils',
  () => ({
    getPosHistory: vi.fn(() => [
      { container: 'CON-BBR-01', pos: 'A1', removedAt: 1_700_000_000_000 },
    ]),
  }),
)

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

    it('renders the Add to Maintenance button', () => {
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
        pos: mockMiner.info!.pos,
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

    it('does not enqueue an action when Cancel is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(setAddSpy).not.toHaveBeenCalled()
    })
  })

  describe('Add to Maintenance button', () => {
    it('enqueues a pending submission with the correct payload', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))

      expect(setAddSpy).toHaveBeenCalledWith({
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
      expect(actionsStore.getState().pendingSubmissions).toHaveLength(1)
    })

    it('calls getPosHistory with the selectedEditSocket', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))
      expect(getPosHistory).toHaveBeenCalledWith(defaultProps.selectedEditSocket)
    })

    it('notifies the user once the action is added', () => {
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

    it('calls onCancel after the action is enqueued', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i }))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe('missing props safety', () => {
    it('renders without crashing when all props are omitted', () => {
      expect(() => render(<MaintenanceDialogContent />)).not.toThrow()
    })

    it('does not crash when selectedEditSocket is undefined', () => {
      render(<MaintenanceDialogContent onCancel={vi.fn()} />)
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i })),
      ).not.toThrow()
    })

    it('does not crash when onCancel is undefined', () => {
      render(<MaintenanceDialogContent selectedEditSocket={defaultProps.selectedEditSocket} />)
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /add to maintenance/i })),
      ).not.toThrow()
    })
  })
})
