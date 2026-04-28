import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types'
import { PoolManagerMinerExplorer } from '../pool-manager-miner-explorer'

import { ACTION_TYPES } from '../../../../../../constants/actions'
import { useCheckPerm } from '../../../../../../hooks'
import { useContextualModal } from '../../../../../../hooks/use-contextual-modal'
import { actionsSlice } from '../../../../../../state'

const { mockDispatch, mockNotifyInfo, mockOpenModal, mockCloseModal } = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockNotifyInfo: vi.fn(),
  mockOpenModal: vi.fn(),
  mockCloseModal: vi.fn(),
}))

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}))

vi.mock('../../../../../../utils/notification-utils', () => ({
  notifyInfo: mockNotifyInfo,
}))

vi.mock('../../../../../../hooks', () => ({
  useCheckPerm: vi.fn(() => true),
}))

vi.mock('../../../../../../hooks/use-contextual-modal', () => ({
  useContextualModal: vi.fn(() => ({
    modalOpen: false,
    handleOpen: mockOpenModal,
    handleClose: mockCloseModal,
  })),
}))

vi.mock('../../../../../../state', () => ({
  actionsSlice: {
    actions: {
      setAddPendingSubmissionAction: vi.fn((payload) => ({ type: 'SET_PENDING', payload })),
    },
  },
}))

vi.mock('../../../../../domain/pool-manager/pool-manager-constants', () => ({
  ASSIGN_POOL_POPUP_ENABLED: true,
}))

vi.mock('../../../../../domain/pool-manager/miner-explorer', () => ({
  MinerExplorer: ({
    onSelectedDevicesChange,
  }: {
    onSelectedDevicesChange: (devices: Device[]) => void
  }) => (
    <div data-testid="miner-explorer">
      <button
        data-testid="select-miner-btn"
        onClick={() =>
          onSelectedDevicesChange([{ id: 'miner-1', type: 'miner', code: 'M-001' } as Device])
        }
      >
        select miner
      </button>
      <button data-testid="clear-selection-btn" onClick={() => onSelectedDevicesChange([])}>
        clear
      </button>
    </div>
  ),
}))

vi.mock('../../../../../domain/pool-manager/assign-pool-modal/assign-pool-modal', () => ({
  AssignPoolModal: ({
    isOpen,
    onClose,
    onSubmit,
  }: {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: { pool: { id: string; name: string } }) => void
  }) =>
    isOpen ? (
      <div data-testid="assign-pool-modal">
        <button
          data-testid="modal-submit-btn"
          onClick={() => onSubmit({ pool: { id: 'pool-1', name: 'Pool One' } })}
        >
          submit
        </button>
        <button data-testid="modal-close-btn" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    SimpleTooltip: ({ children, content }: { children: React.ReactNode; content?: string }) => (
      <div data-testid="tooltip" data-content={content ?? ''}>
        {children}
      </div>
    ),
  }
})

const { setAddPendingSubmissionAction } = actionsSlice.actions

const makeMiner = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'miner-1',
    type: 'miner',
    code: 'M-001',
    ...overrides,
  }) as Device

const defaultProps = {
  miners: [makeMiner()],
  poolConfig: [],
  backButtonClick: vi.fn(),
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<PoolManagerMinerExplorer {...defaultProps} {...overrides} />)

describe('PoolManagerMinerExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCheckPerm).mockReturnValue(true)
    vi.mocked(useContextualModal).mockReturnValue({
      modalOpen: false,
      handleOpen: mockOpenModal,
      handleClose: mockCloseModal,
    })
  })

  describe('rendering', () => {
    it('renders the Miner Explorer title', () => {
      renderComponent()
      expect(screen.getByText('Miner Explorer')).toBeInTheDocument()
    })

    it('renders the Pool Manager back link', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /pool manager/i })).toBeInTheDocument()
    })

    it('renders the MinerExplorer component', () => {
      renderComponent()
      expect(screen.getByTestId('miner-explorer')).toBeInTheDocument()
    })

    it('renders the Assign Pool button when ASSIGN_POOL_POPUP_ENABLED is true', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /assign pool/i })).toBeInTheDocument()
    })

    it('does not render AssignPoolModal when modalOpen is false', () => {
      renderComponent()
      expect(screen.queryByTestId('assign-pool-modal')).not.toBeInTheDocument()
    })

    it('renders AssignPoolModal when modalOpen is true', () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
      })
      renderComponent()
      expect(screen.getByTestId('assign-pool-modal')).toBeInTheDocument()
    })
  })

  describe('back button', () => {
    it('calls backButtonClick when back link is clicked', () => {
      const backButtonClick = vi.fn()
      renderComponent({ backButtonClick })
      fireEvent.click(screen.getByRole('button', { name: /pool manager/i }))
      expect(backButtonClick).toHaveBeenCalledOnce()
    })
  })

  describe('Assign Pool button tooltip', () => {
    it('shows no-permission tooltip when canSubmitActions is false', () => {
      vi.mocked(useCheckPerm).mockReturnValue(false)
      renderComponent()
      expect(screen.getByTestId('tooltip')).toHaveAttribute(
        'data-content',
        'You do not have permission to submit actions',
      )
    })

    it('shows select-miners tooltip when no miners are selected and user has permission', () => {
      renderComponent()
      expect(screen.getByTestId('tooltip')).toHaveAttribute(
        'data-content',
        'Please select miners to assign pools',
      )
    })

    it('shows no tooltip when miners are selected and user has permission', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('select-miner-btn'))
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-content', '')
    })
  })

  describe('Assign Pool button state', () => {
    it('is disabled when no miners are selected', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /assign pool/i })).toBeDisabled()
    })

    it('is enabled when miners are selected', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('select-miner-btn'))
      expect(screen.getByRole('button', { name: /assign pool/i })).not.toBeDisabled()
    })

    it('opens the assign pool modal when clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('select-miner-btn'))
      fireEvent.click(screen.getByRole('button', { name: /assign pool/i }))
      expect(mockOpenModal).toHaveBeenCalledWith(undefined)
    })
  })

  describe('miner selection', () => {
    it('filters selected devices from miners prop by id', () => {
      const miners = [
        makeMiner({ id: 'miner-1', code: 'M-001' }),
        makeMiner({ id: 'miner-2', code: 'M-002' }),
      ]
      renderComponent({ miners })
      fireEvent.click(screen.getByTestId('select-miner-btn'))
      fireEvent.click(screen.getByRole('button', { name: /assign pool/i }))
      expect(mockOpenModal).toHaveBeenCalledOnce()
    })

    it('clears selections after clearing via MinerExplorer', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('select-miner-btn'))
      fireEvent.click(screen.getByTestId('clear-selection-btn'))
      expect(screen.getByRole('button', { name: /assign pool/i })).toBeDisabled()
    })
  })

  describe('handleAssignPoolSubmit', () => {
    beforeEach(() => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
      })
    })

    it('dispatches setAddPendingSubmissionAction with correct payload', async () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('modal-submit-btn'))
      await waitFor(() => {
        expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: ACTION_TYPES.SETUP_POOLS,
            params: [{ poolConfigId: 'pool-1', configType: 'pool' }],
            poolName: 'Pool One',
          }),
        )
      })
    })

    it('dispatches with selected device ids in query', async () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('modal-submit-btn'))
      await waitFor(() => {
        expect(setAddPendingSubmissionAction).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({
              id: expect.objectContaining({ $in: expect.any(Array) }),
            }),
          }),
        )
      })
    })

    it('calls notifyInfo after dispatch', async () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('modal-submit-btn'))
      await waitFor(() => {
        expect(mockNotifyInfo).toHaveBeenCalledWith('Action added', 'Assign Pools')
      })
    })

    it('calls closeAssignPoolModal after submit', async () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('modal-submit-btn'))
      await waitFor(() => {
        expect(mockCloseModal).toHaveBeenCalledOnce()
      })
    })
  })

  describe('modal close', () => {
    it('calls closeAssignPoolModal when modal close button is clicked', () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
      })
      renderComponent()
      fireEvent.click(screen.getByTestId('modal-close-btn'))
      expect(mockCloseModal).toHaveBeenCalledOnce()
    })
  })
})
