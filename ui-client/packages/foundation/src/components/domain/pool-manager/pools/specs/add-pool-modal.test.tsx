import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AddPoolModalProps } from '../add-pool-modal/add-pool-modal'
import { AddPoolModal } from './../add-pool-modal/add-pool-modal'

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
  MAX_POOL_ENDPOINTS: 3,
  SHOW_CREDENTIAL_TEMPLATE: false,
  SHOW_POOL_VALIDATION: false,
  POOL_CREDENTIAL_TEMPLATE_SUFFIX_TYPE_OPTIONS: [{ value: 'INCREMENTAL', label: 'Incremental' }],
  POOL_ENDPOINT_INDEX_ROLES: { 0: 'PRIMARY', 1: 'FAILOVER_1', 2: 'FAILOVER_2' },
  POOL_ENDPOINT_ROLES_LABELS: {
    PRIMARY: 'PRIMARY',
    FAILOVER_1: 'FAILOVER 1',
    FAILOVER_2: 'FAILOVER 2',
  },
}))

vi.mock('../add-pool-endpoint-modal/add-pool-endpoint-modal', () => ({
  AddPoolEndpointModal: ({
    isOpen,
    onClose,
    onSubmit,
  }: {
    isOpen: boolean
    onClose: () => void
    onSubmit: (values: { host: string; port: string; pool: string }) => void
  }) =>
    isOpen ? (
      <div data-testid="add-endpoint-modal">
        <button
          data-testid="endpoint-submit-btn"
          onClick={() => onSubmit({ host: 'pool.example.com', port: '3333', pool: 'pool-id' })}
        >
          submit endpoint
        </button>
        <button data-testid="endpoint-close-btn" onClick={onClose}>
          close endpoint
        </button>
      </div>
    ) : null,
}))

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...actual,
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children, title }: { children: React.ReactNode; title: string }) => (
      <div data-testid="dialog-content" data-title={title}>
        {children}
      </div>
    ),
    DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="dialog-footer" className={className}>
        {children}
      </div>
    ),
    Form: ({
      children,
      onSubmit,
      className,
    }: {
      children: React.ReactNode
      onSubmit: React.FormEventHandler
      className?: string
    }) => (
      <form data-testid="form" className={className} onSubmit={onSubmit}>
        {children}
      </form>
    ),
    FormInput: ({
      name,
      label,
      placeholder,
    }: {
      name: string
      label?: string
      placeholder?: string
    }) => (
      <div data-testid={`form-input-${name}`}>
        {label && <label htmlFor={name}>{label}</label>}
        <input id={name} name={name} placeholder={placeholder} data-testid={`input-${name}`} />
      </div>
    ),
    FormSelect: ({ name, label }: { name: string; label?: string }) => (
      <div data-testid={`form-select-${name}`}>{label && <label>{label}</label>}</div>
    ),
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

const defaultProps: AddPoolModalProps = {
  isOpen: true,
  onClose: vi.fn(),
}

const renderModal = (props: Partial<AddPoolModalProps> = {}) =>
  render(<AddPoolModal {...defaultProps} {...props} />)

describe('AddPoolModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('renders when isOpen is true', () => {
      renderModal()
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      renderModal({ isOpen: false })
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog with title "Add Pool"', () => {
      renderModal()
      expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-title', 'Add Pool')
    })
  })

  describe('form fields', () => {
    it('renders Pool Name input', () => {
      renderModal()
      expect(screen.getByTestId('form-input-groupName')).toBeInTheDocument()
    })

    it('renders Description input', () => {
      renderModal()
      expect(screen.getByTestId('form-input-description')).toBeInTheDocument()
    })

    it('renders Pool Username input', () => {
      renderModal()
      expect(screen.getByTestId('form-input-workerName')).toBeInTheDocument()
    })

    it('does not render Suffix Type select when SHOW_CREDENTIAL_TEMPLATE is false', () => {
      renderModal()
      expect(screen.queryByTestId('form-select-suffixType')).not.toBeInTheDocument()
    })

    it('does not render validation section when SHOW_POOL_VALIDATION is false', () => {
      renderModal()
      expect(screen.queryByText('Validation Status')).not.toBeInTheDocument()
    })
  })

  describe('section headers', () => {
    it('renders POOL INFO section header', () => {
      renderModal()
      expect(screen.getByText('POOL INFO')).toBeInTheDocument()
    })

    it('renders ENDPOINTS CONFIGURATION section header', () => {
      renderModal()
      expect(screen.getByText('ENDPOINTS CONFIGURATION')).toBeInTheDocument()
    })

    it('renders CREDENTIALS TEMPLATE section header', () => {
      renderModal()
      expect(screen.getByText('CREDENTIALS TEMPLATE')).toBeInTheDocument()
    })
  })

  describe('footer buttons', () => {
    it('renders Cancel button', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders Save button', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('endpoints', () => {
    it('renders Add Endpoint button', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Add Endpoint' })).toBeInTheDocument()
    })

    it('Add Endpoint button is enabled when no endpoints added', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Add Endpoint' })).not.toBeDisabled()
    })

    it('renders no endpoints initially', () => {
      renderModal()
      expect(screen.queryByText('PRIMARY')).not.toBeInTheDocument()
    })

    it('does not render AddPoolEndpointModal when modalOpen is false', () => {
      renderModal()
      expect(screen.queryByTestId('add-endpoint-modal')).not.toBeInTheDocument()
    })

    it('opens AddPoolEndpointModal when Add Endpoint is clicked', () => {
      renderModal()
      fireEvent.click(screen.getByRole('button', { name: 'Add Endpoint' }))
      expect(mockOpenModal).toHaveBeenCalledTimes(1)
    })

    it('renders AddPoolEndpointModal when modalOpen is true', async () => {
      const { useContextualModal } = await import('../../../../../hooks/use-contextual-modal')
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
      })
      renderModal()
      expect(screen.getByTestId('add-endpoint-modal')).toBeInTheDocument()
    })

    it('closes endpoint modal on endpoint submit', async () => {
      const { useContextualModal } = await import('../../../../../hooks/use-contextual-modal')
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
      })
      renderModal()
      await act(async () => {
        fireEvent.click(screen.getByTestId('endpoint-submit-btn'))
      })
      expect(mockCloseModal).toHaveBeenCalledTimes(1)
    })

    it('disables Add Endpoint button when MAX_POOL_ENDPOINTS is reached', async () => {
      const { useContextualModal } = await import('../../../../../hooks/use-contextual-modal')
      const { rerender } = renderModal()

      for (let i = 0; i < 3; i++) {
        vi.mocked(useContextualModal).mockReturnValue({
          modalOpen: true,
          handleOpen: mockOpenModal,
          handleClose: mockCloseModal,
        })
        rerender(<AddPoolModal {...defaultProps} />)
        await act(async () => {
          fireEvent.click(screen.getByTestId('endpoint-submit-btn'))
        })
        vi.mocked(useContextualModal).mockReturnValue({
          modalOpen: false,
          handleOpen: mockOpenModal,
          handleClose: mockCloseModal,
        })
        rerender(<AddPoolModal {...defaultProps} />)
      }

      expect(screen.getByRole('button', { name: 'Add Endpoint' })).toBeDisabled()
    })
  })

  describe('form submission', () => {
    it('does not dispatch when required fields are empty', async () => {
      renderModal()
      await act(async () => {
        fireEvent.submit(screen.getByTestId('form'))
      })
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('does not call notifyInfo when validation fails', async () => {
      renderModal()
      await act(async () => {
        fireEvent.submit(screen.getByTestId('form'))
      })
      expect(mockNotifyInfo).not.toHaveBeenCalled()
    })
  })
})
