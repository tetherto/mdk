import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContextualModal } from '../../../../../hooks'
import type { PoolSummary } from '../../types'
import { PoolCollapseItemBody } from '../pool-collapse-item-body/pool-collapse-item-body'

const { mockDispatch, mockNotifyInfo, mockOpenModal, mockCloseModal } = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockNotifyInfo: vi.fn(),
  mockOpenModal: vi.fn(),
  mockCloseModal: vi.fn(),
}))

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}))

vi.mock('../../../../../utils/notification-utils', () => ({
  notifyInfo: mockNotifyInfo,
}))

vi.mock('../../../../../hooks/use-contextual-modal', () => ({
  useContextualModal: vi.fn(() => ({
    modalOpen: false,
    handleOpen: mockOpenModal,
    handleClose: mockCloseModal,
    subject: undefined,
  })),
}))

vi.mock('../../../../../state', () => ({
  actionsSlice: {
    actions: {
      setAddPendingSubmissionAction: vi.fn((payload) => ({ type: 'SET_PENDING', payload })),
    },
  },
}))

vi.mock('../../pool-manager-constants', () => ({
  ADD_ENDPOINT_ENABLED: true,
  EDIT_ENDPOINT_ENABLED: true,
  MAX_POOL_ENDPOINTS: 3,
  POOL_STATUS_INDICATOR_ENABLED: false,
  POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_LABELS: { INCREMENTAL: 'Incremental' },
  POOL_ENDPOINT_INDEX_ROLES: { 0: 'PRIMARY', 1: 'FAILOVER_1', 2: 'FAILOVER_2' },
  POOL_ENDPOINT_ROLES_LABELS: {
    PRIMARY: 'PRIMARY',
    FAILOVER_1: 'FAILOVER 1',
    FAILOVER_2: 'FAILOVER 2',
  },
  POOL_VALIDATION_STATUSES: { TESTED: 'TESTED' },
}))

vi.mock('../add-pool-endpoint-modal/add-pool-endpoint-modal', () => ({
  AddPoolEndpointModal: ({
    isOpen,
    onClose,
    onSubmit,
    endpoint,
  }: {
    isOpen: boolean
    onClose: () => void
    onSubmit: (values: { host: string; port: string; pool: string }) => void
    endpoint?: { host: string }
  }) =>
    isOpen ? (
      <div data-testid="add-endpoint-modal" data-edit-host={endpoint?.host ?? ''}>
        <button
          data-testid="endpoint-submit-btn"
          onClick={() => onSubmit({ host: 'new.host.com', port: '4444', pool: 'pool-x' })}
        >
          submit
        </button>
        <button data-testid="endpoint-close-btn" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    cn: (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' '),
    Button: ({
      children,
      type,
      onClick,
      disabled,
      icon,
      variant,
    }: {
      children?: React.ReactNode
      type?: string
      onClick?: () => void
      disabled?: boolean
      icon?: React.ReactNode
      variant?: string
    }) => (
      <button
        type={(type as 'button' | 'submit') ?? 'button'}
        onClick={onClick}
        disabled={disabled}
        data-variant={variant}
      >
        {icon}
        {children}
      </button>
    ),
  }
})

const makeEndpoint = (overrides = {}): PoolSummary['endpoints'][0] => ({
  host: 'pool.example.com',
  port: '3333',
  pool: 'pool-1',
  url: 'stratum+tcp://pool.example.com:3333',
  ...overrides,
})

const makePool = (overrides: Partial<PoolSummary> = {}): PoolSummary => ({
  id: 'pool-1',
  name: 'Primary Pool',
  description: 'Main pool',
  units: 2,
  miners: 10,
  workerName: 'worker1',
  workerPassword: 'x',
  endpoints: [makeEndpoint()],
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

const renderBody = (pool: PoolSummary) => render(<PoolCollapseItemBody pool={pool} />)

describe('PoolCollapseItemBody', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('endpoints section', () => {
    it('renders Endpoints Configuration title', () => {
      renderBody(makePool())
      expect(screen.getByText('Endpoints Configuration')).toBeInTheDocument()
    })

    it('renders empty state when no endpoints', () => {
      renderBody(makePool({ endpoints: [] }))
      expect(screen.getByText('No Endpoints configured')).toBeInTheDocument()
    })

    it('renders endpoint host and port', () => {
      renderBody(makePool())
      expect(screen.getByText('pool.example.com')).toBeInTheDocument()
      expect(screen.getByText('3333')).toBeInTheDocument()
    })

    it('renders correct role label for primary endpoint', () => {
      renderBody(makePool())
      expect(screen.getByText('PRIMARY')).toBeInTheDocument()
    })

    it('renders correct role label for failover endpoints', () => {
      renderBody(
        makePool({
          endpoints: [makeEndpoint(), makeEndpoint({ host: 'failover.example.com', port: '4444' })],
        }),
      )
      expect(screen.getByText('PRIMARY')).toBeInTheDocument()
      expect(screen.getByText('FAILOVER 1')).toBeInTheDocument()
    })

    it('renders Add Endpoint button when below max', () => {
      renderBody(makePool())
      expect(screen.getByRole('button', { name: '+ Add Endpoint' })).toBeInTheDocument()
    })

    it('does not render Add Endpoint button when at max endpoints', () => {
      renderBody(
        makePool({
          endpoints: [
            makeEndpoint(),
            makeEndpoint({ host: 'f1.example.com', port: '4444' }),
            makeEndpoint({ host: 'f2.example.com', port: '5555' }),
          ],
        }),
      )
      expect(screen.queryByRole('button', { name: '+ Add Endpoint' })).not.toBeInTheDocument()
    })

    it('opens add endpoint modal when Add Endpoint is clicked', () => {
      renderBody(makePool())
      fireEvent.click(screen.getByRole('button', { name: '+ Add Endpoint' }))
      expect(mockOpenModal).toHaveBeenCalledWith(undefined)
    })

    it('opens edit endpoint modal when edit button is clicked', () => {
      renderBody(makePool())
      const editButtons = screen
        .getAllByRole('button')
        .filter((b) => !b.textContent?.includes('Add'))
      fireEvent.click(editButtons[0])
      expect(mockOpenModal).toHaveBeenCalledWith({
        endpoint: makeEndpoint(),
        index: 0,
      })
    })
  })

  describe('add endpoint modal', () => {
    it('does not render modal when modalOpen is false', () => {
      renderBody(makePool())
      expect(screen.queryByTestId('add-endpoint-modal')).not.toBeInTheDocument()
    })

    it('renders modal when modalOpen is true', async () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
        subject: undefined,
      })
      renderBody(makePool())
      expect(screen.getByTestId('add-endpoint-modal')).toBeInTheDocument()
    })

    it('passes endpoint to modal when editing', async () => {
      const endpoint = makeEndpoint({ host: 'edit.example.com' })
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
        subject: { endpoint, index: 0 },
      })
      renderBody(makePool({ endpoints: [endpoint] }))
      expect(screen.getByTestId('add-endpoint-modal')).toHaveAttribute(
        'data-edit-host',
        'edit.example.com',
      )
    })

    it('dispatches and notifies on endpoint submit', async () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
        subject: undefined,
      })
      renderBody(makePool())
      fireEvent.click(screen.getByTestId('endpoint-submit-btn'))
      expect(mockDispatch).toHaveBeenCalledTimes(1)
      expect(mockNotifyInfo).toHaveBeenCalledWith('Action added', 'Update Pool config')
      expect(mockCloseModal).toHaveBeenCalledTimes(1)
    })

    it('adds new endpoint URL when subject is null', async () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
        subject: undefined,
      })
      renderBody(makePool())
      fireEvent.click(screen.getByTestId('endpoint-submit-btn'))

      const dispatchArg = mockDispatch.mock.calls[0][0]
      const poolUrls = dispatchArg.payload.params[0].data.poolUrls
      expect(poolUrls).toHaveLength(2)
      expect(poolUrls[1].url).toBe('stratum+tcp://new.host.com:4444')
    })

    it('replaces endpoint URL when editing existing index', async () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
        subject: { endpoint: makeEndpoint(), index: 0 },
      })
      renderBody(makePool())
      fireEvent.click(screen.getByTestId('endpoint-submit-btn'))

      const dispatchArg = mockDispatch.mock.calls[0][0]
      const poolUrls = dispatchArg.payload.params[0].data.poolUrls
      expect(poolUrls).toHaveLength(1)
      expect(poolUrls[0].url).toBe('stratum+tcp://new.host.com:4444')
    })

    it('closes modal when close button is clicked', async () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
        subject: undefined,
      })
      renderBody(makePool())
      fireEvent.click(screen.getByTestId('endpoint-close-btn'))
      expect(mockCloseModal).toHaveBeenCalledTimes(1)
    })
  })

  describe('credentials section', () => {
    it('does not render credentials section when credentialsTemplate is absent', () => {
      renderBody(makePool({ credentialsTemplate: undefined }))
      expect(screen.queryByText('Credentials')).not.toBeInTheDocument()
    })

    it('renders credentials section when credentialsTemplate is present', () => {
      renderBody(makePool({ credentialsTemplate: { workerName: 'w1', suffixType: 'INCREMENTAL' } }))
      expect(screen.getByText('Credentials')).toBeInTheDocument()
    })

    it('renders worker name value', () => {
      renderBody(
        makePool({ credentialsTemplate: { workerName: 'my-worker', suffixType: 'INCREMENTAL' } }),
      )
      expect(screen.getByText('my-worker')).toBeInTheDocument()
    })

    it('renders resolved suffix type label', () => {
      renderBody(makePool({ credentialsTemplate: { workerName: 'w1', suffixType: 'INCREMENTAL' } }))
      expect(screen.getByText('Incremental')).toBeInTheDocument()
    })

    it('falls back to raw suffix type when label is not found', () => {
      renderBody(
        makePool({ credentialsTemplate: { workerName: 'w1', suffixType: 'UNKNOWN_TYPE' } }),
      )
      expect(screen.getByText('UNKNOWN_TYPE')).toBeInTheDocument()
    })
  })

  describe('validation section', () => {
    it('does not render validation section when validation is absent', () => {
      renderBody(makePool({ validation: undefined }))
      expect(screen.queryByText('Validation Status')).not.toBeInTheDocument()
    })

    it('renders validation section when validation is present', () => {
      renderBody(makePool({ validation: { status: 'NOT_TESTED' } }))
      expect(screen.getByText('Validation Status')).toBeInTheDocument()
    })

    it('renders invalid status when not tested', () => {
      renderBody(makePool({ validation: { status: 'NOT_TESTED' } }))
      expect(screen.getByText('Configuration not validated')).toBeInTheDocument()
    })

    it('renders valid status when tested', () => {
      renderBody(makePool({ validation: { status: 'TESTED' } }))
      expect(screen.getByText('Configuration validated successfully')).toBeInTheDocument()
    })

    it('applies valid modifier class when tested', () => {
      renderBody(makePool({ validation: { status: 'TESTED' } }))
      const el = screen.getByText('Configuration validated successfully')
      expect(el.className).toContain('mdk-pm-pool-body__validation-status--valid')
    })

    it('applies invalid modifier class when not tested', () => {
      renderBody(makePool({ validation: { status: 'NOT_TESTED' } }))
      const el = screen.getByText('Configuration not validated')
      expect(el.className).toContain('mdk-pm-pool-body__validation-status--invalid')
    })

    it('renders Test Configuration button', () => {
      renderBody(makePool({ validation: { status: 'NOT_TESTED' } }))
      expect(screen.getByRole('button', { name: 'Test Configuration' })).toBeInTheDocument()
    })
  })
})
