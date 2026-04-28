import type { UnknownRecord } from '@tetherto/core'
import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMinerDuplicateValidation } from '../../../../../../hooks/use-miner-duplicate-validation'
import { notifyInfo } from '../../../../../../utils/notification-utils'
import { ConfirmChangePositionDialogContent } from '../confirm-change-position-dialog/confirm-change-position-dialog-content'

// Mock dependencies
vi.mock('@hookform/resolvers/zod')
vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form')
  return {
    ...actual,
    useForm: vi.fn(() => ({
      control: {},
      handleSubmit: vi.fn((fn) => fn),
      watch: vi.fn((field) => {
        if (field === 'containerMinerRackId') return 'rack-001'
        if (field === 'forceSetIp') return false
        if (field === 'minerIp') return '192.168.1.100'
        return ''
      }),
      setValue: vi.fn(),
      formState: { isSubmitting: false },
    })),
  }
})

vi.mock('@tetherto/core', async () => {
  const actual = await vi.importActual('@tetherto/core')
  return {
    ...actual,
    Button: vi.fn(({ children, onClick, type, variant, disabled }) => (
      <button data-testid={`button-${variant}`} onClick={onClick} type={type} disabled={disabled}>
        {children}
      </button>
    )),
    Form: vi.fn(({ children, onSubmit }) => (
      <form data-testid="form" onSubmit={onSubmit}>
        {children}
      </form>
    )),
    FormCheckbox: vi.fn(({ name, label, checkboxProps }) => (
      <div data-testid="form-checkbox">
        <input
          type="checkbox"
          data-testid={`checkbox-${name}`}
          onChange={checkboxProps?.onCheckedChange}
        />
        <label>{label}</label>
      </div>
    )),
    DialogFooter: vi.fn(({ children, className }) => (
      <div data-testid="dialog-footer" className={className}>
        {children}
      </div>
    )),
    createFieldNames: vi.fn(() => (name: string) => name),
  }
})

vi.mock('../../../../../../hooks/use-miner-duplicate-validation', () => ({
  useMinerDuplicateValidation: vi.fn(() => ({
    checkDuplicate: vi.fn().mockResolvedValue(false),
    duplicateError: false,
    isDuplicateCheckLoading: false,
    setDuplicateError: vi.fn(),
  })),
}))

vi.mock('../../../../../../hooks/use-static-miner-ip-assignment', () => ({
  useStaticMinerIpAssignment: vi.fn(() => ({
    isStaticIpAssignment: true,
    minerIp: '192.168.1.100',
  })),
}))

vi.mock('../../../../../../utils/notification-utils', () => ({
  notifyInfo: vi.fn(),
}))

vi.mock('../../../../../../utils/container-utils', () => ({
  getDeviceContainerPosText: vi.fn((socket) => {
    if (!socket) return 'Unknown'
    const container = socket.containerInfo?.container || socket.container || 'container-1'
    const pos = socket.pos || `${socket.pdu}_${socket.socket}` || '1_1'
    return `${container} - ${pos}`
  }),
}))

vi.mock('../position-change-dialog-utils', () => ({
  getPosHistory: vi.fn(() => ['pos1', 'pos2']),
}))

vi.mock('../rack-id-selection-dropdown/rack-id-selection-dropdown', () => ({
  RackIdSelectionDropdown: vi.fn(({ value, handleChange }) => (
    <select
      data-testid="rack-id-dropdown"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="rack-001">Rack 001</option>
      <option value="rack-002">Rack 002</option>
    </select>
  )),
}))

vi.mock('../static-miner-ip-assigment/static-miner-ip-assigment', () => ({
  StaticMinerIpAssigment: vi.fn(({ forceSetIp, isStaticIpAssignment, minerIp, setMinerIp }) => (
    <div data-testid="static-ip-assignment">
      <input data-testid="ip-input" value={minerIp} onChange={(e) => setMinerIp(e.target.value)} />
      <span data-testid="force-set-ip">{String(forceSetIp)}</span>
      <span data-testid="is-static">{String(isStaticIpAssignment)}</span>
    </div>
  )),
}))

const createMockStore = () => {
  return configureStore({
    reducer: {
      actions: (state = { pendingActions: [] }) => state,
    },
  })
}

describe('ConfirmChangePositionDialogContent', () => {
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()

  const mockSelectedSocketToReplace: UnknownRecord = {
    miner: {
      id: 'miner-001',
      code: 'M001',
      rack: 'rack-001',
      info: {
        pos: '1_1',
      },
    },
    containerInfo: {
      container: 'container-1',
      subnet: '192.168.1.0/24',
    },
    pdu: 1,
    socket: 1,
  }

  const mockSelectedEditSocket: UnknownRecord = {
    containerInfo: {
      container: 'container-2',
      subnet: '192.168.2.0/24',
    },
    pdu: 2,
    socket: 3,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders form container', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByTestId('form')).toBeInTheDocument()
    })

    it('renders confirmation text for position change', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByText(/Are you sure to change position of miner/)).toBeInTheDocument()
      expect(screen.getByText(/M001/)).toBeInTheDocument()
    })

    it('renders dialog footer', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders submit button with change position text', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByText('Change position')).toBeInTheDocument()
    })

    it('renders force set IP checkbox', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByTestId('form-checkbox')).toBeInTheDocument()
      expect(screen.getByText('Force set new IP')).toBeInTheDocument()
    })

    it('renders static IP assignment component', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByTestId('static-ip-assignment')).toBeInTheDocument()
    })
  })

  describe('back from maintenance mode', () => {
    it('renders back from maintenance confirmation text', () => {
      const maintenanceSocket = {
        ...mockSelectedSocketToReplace,
        containerInfo: { container: 'maintenance' },
      }

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={maintenanceSocket}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByText(/bring miner back from maintenance/)).toBeInTheDocument()
    })

    it('renders back from maintenance button text', () => {
      const maintenanceSocket = {
        ...mockSelectedSocketToReplace,
        containerInfo: { container: 'maintenance' },
      }

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={maintenanceSocket}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByText('Back from maintenance')).toBeInTheDocument()
    })

    it('does not render force set IP checkbox when back from maintenance', () => {
      const maintenanceSocket = {
        ...mockSelectedSocketToReplace,
        containerInfo: { container: 'maintenance' },
      }

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={maintenanceSocket}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.queryByTestId('form-checkbox')).not.toBeInTheDocument()
    })
  })

  describe('duplicate IP error', () => {
    it('displays duplicate error when present', () => {
      vi.mocked(useMinerDuplicateValidation).mockReturnValue({
        checkDuplicate: vi.fn(),
        duplicateError: true,
        isDuplicateCheckLoading: false,
        setDuplicateError: vi.fn(),
      })

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByText('IP address is already being used.')).toBeInTheDocument()
    })

    it('does not display error when no duplicate', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.queryByText('IP address is already being used.')).not.toBeInTheDocument()
    })
  })

  describe('button interactions', () => {
    it('calls onCancel when cancel button clicked', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      fireEvent.click(screen.getByText('Cancel'))
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('disables submit button when duplicate check is loading', () => {
      vi.mocked(useMinerDuplicateValidation).mockReturnValue({
        checkDuplicate: vi.fn(),
        duplicateError: false,
        isDuplicateCheckLoading: true,
        setDuplicateError: vi.fn(),
      })

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByText('Change position')).toBeDisabled()
    })
  })

  describe('form submission', () => {
    it('calls checkDuplicate when forceSetIp is enabled', async () => {
      const mockCheckDuplicate = vi.fn().mockResolvedValue(false)
      vi.mocked(useMinerDuplicateValidation).mockReturnValue({
        checkDuplicate: mockCheckDuplicate,
        duplicateError: false,
        isDuplicateCheckLoading: false,
        setDuplicateError: vi.fn(),
      })

      const mockHandleSubmit = vi.fn((fn) => (e?: any) => {
        e?.preventDefault?.()
        return fn({
          containerMinerRackId: 'rack-001',
          forceSetIp: true,
          minerIp: '192.168.1.100',
        })
      })

      vi.mocked(useForm).mockReturnValue({
        control: {},
        handleSubmit: mockHandleSubmit,
        watch: vi.fn((field) => {
          if (field === 'forceSetIp') return true
          if (field === 'minerIp') return '192.168.1.100'
          return ''
        }),
        setValue: vi.fn(),
        formState: { isSubmitting: false },
      })

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      fireEvent.click(screen.getByText('Change position'))

      await waitFor(() => {
        expect(mockCheckDuplicate).toHaveBeenCalled()
      })
    })

    it('calls onSave after successful submission', async () => {
      const mockHandleSubmit = vi.fn((fn) => (e?: any) => {
        e?.preventDefault?.()
        return fn({
          containerMinerRackId: 'rack-001',
          forceSetIp: false,
          minerIp: '',
        })
      })

      vi.mocked(useForm).mockReturnValue({
        control: {},
        handleSubmit: mockHandleSubmit,
        watch: vi.fn(() => ''),
        setValue: vi.fn(),
        formState: { isSubmitting: false },
      })

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      fireEvent.click(screen.getByText('Change position'))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('dispatches action to Redux store', async () => {
      const store = createMockStore()
      const dispatchSpy = vi.spyOn(store, 'dispatch')

      const mockHandleSubmit = vi.fn((fn) => (e?: any) => {
        e?.preventDefault?.()
        return fn({
          containerMinerRackId: 'rack-001',
          forceSetIp: false,
          minerIp: '',
        })
      })

      vi.mocked(useForm).mockReturnValue({
        control: {},
        handleSubmit: mockHandleSubmit,
        watch: vi.fn(() => ''),
        setValue: vi.fn(),
        formState: { isSubmitting: false },
      })

      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      fireEvent.click(screen.getByText('Change position'))

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalled()
      })
    })

    it('shows notification after submission', async () => {
      const mockHandleSubmit = vi.fn((fn) => (e?: any) => {
        e?.preventDefault?.()
        return fn({
          containerMinerRackId: 'rack-001',
          forceSetIp: false,
          minerIp: '',
        })
      })

      vi.mocked(useForm).mockReturnValue({
        control: {},
        handleSubmit: mockHandleSubmit,
        watch: vi.fn(() => ''),
        setValue: vi.fn(),
        formState: { isSubmitting: false },
      })

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      fireEvent.click(screen.getByText('Change position'))

      await waitFor(() => {
        expect(notifyInfo).toHaveBeenCalled()
      })
    })

    it('does not submit when duplicate IP found', async () => {
      const mockCheckDuplicate = vi.fn().mockResolvedValue(true)

      vi.mocked(useMinerDuplicateValidation).mockReturnValue({
        checkDuplicate: mockCheckDuplicate,
        duplicateError: false,
        isDuplicateCheckLoading: false,
        setDuplicateError: vi.fn(),
      })

      const mockHandleSubmit = vi.fn((fn) => (e?: any) => {
        e?.preventDefault?.()
        return fn({
          containerMinerRackId: 'rack-001',
          forceSetIp: true,
          minerIp: '192.168.1.100',
        })
      })

      vi.mocked(useForm).mockReturnValue({
        control: {},
        handleSubmit: mockHandleSubmit,
        watch: vi.fn((field) => {
          if (field === 'forceSetIp') return true
          if (field === 'minerIp') return '192.168.1.100'
          return ''
        }),
        setValue: vi.fn(),
        formState: { isSubmitting: false },
      })

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      fireEvent.click(screen.getByText('Change position'))

      await waitFor(() => {
        expect(mockCheckDuplicate).toHaveBeenCalled()
      })

      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })

  describe('CSS classes', () => {
    it('applies correct wrapper class', () => {
      const store = createMockStore()
      const { container } = render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(container.querySelector('.mdk-confirm-position')).toBeInTheDocument()
    })

    it('applies correct footer class', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByTestId('dialog-footer')).toHaveClass('mdk-confirm-position__footer')
    })
  })

  describe('edge cases', () => {
    it('handles missing miner code', () => {
      const socketWithoutCode = {
        ...mockSelectedSocketToReplace,
        miner: { id: 'miner-001', rack: 'rack-001' },
      }

      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={socketWithoutCode}
            selectedEditSocket={mockSelectedEditSocket}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByText(/Are you sure to change position/)).toBeInTheDocument()
    })

    it('handles undefined selectedEditSocket', () => {
      const store = createMockStore()
      render(
        <Provider store={store}>
          <ConfirmChangePositionDialogContent
            selectedSocketToReplace={mockSelectedSocketToReplace}
            selectedEditSocket={undefined}
            isContainerEmpty={false}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </Provider>,
      )

      expect(screen.getByTestId('form')).toBeInTheDocument()
    })
  })
})
