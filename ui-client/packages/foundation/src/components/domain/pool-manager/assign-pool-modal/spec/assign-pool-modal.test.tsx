import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Device } from '../../../../../types'
import type { PoolConfigData } from '../../hooks/use-pool-configs'
import type { PoolSummary } from '../../types'
import type { AssignPoolModalProps } from '../assign-pool-modal'
import { AssignPoolModal } from '../assign-pool-modal'

const { mockUsePoolConfigs } = vi.hoisted(() => ({
  mockUsePoolConfigs: vi.fn(),
}))

vi.mock('../../hooks/use-pool-configs', () => ({
  usePoolConfigs: () => mockUsePoolConfigs(),
}))

vi.mock('../pool-manager-constants', () => ({
  POOL_ENDPOINT_ROLES_LABELS: {
    primary: 'Primary',
    failover_1: 'Failover 1',
  },
  SHOW_CREDENTIAL_TEMPLATE: false,
}))

vi.mock('../assign-pool-modal-columns', () => ({
  minersTableColumns: [],
}))

vi.mock('../../../../../utils/device-utils', () => ({
  getMinerShortCode: vi.fn((code: string) => code),
  getTableDeviceData: vi.fn((device: Device) => ({
    code: device.code,
    tags: device.tags,
    id: device.id,
    info: (device as any).info,
    stats: { status: 'mining' },
  })),
}))

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    Loader: () => <div data-testid="loader" />,
    CoreAlert: ({ type, title }: { type: string; title: string }) => (
      <div data-testid="core-alert" data-type={type}>
        {title}
      </div>
    ),
    DataTable: ({ data }: { data: unknown[] }) => (
      <div data-testid="miners-table" data-row-count={data.length} />
    ),
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children, title }: { children: React.ReactNode; title: string }) => (
      <div data-testid="dialog-content" data-title={title}>
        {children}
      </div>
    ),
    DialogFooter: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dialog-footer">{children}</div>
    ),
    Form: ({ children, onSubmit }: { children: React.ReactNode; onSubmit: () => void }) => (
      <form data-testid="form" onSubmit={onSubmit}>
        {children}
      </form>
    ),
    FormSelect: ({
      name,
      options,
      placeholder,
    }: {
      name: string
      options: { value: string; label: string }[]
      placeholder: string
    }) => (
      <select
        data-testid={`form-select-${name}`}
        defaultValue=""
        onChange={(e) => {
          // Simulate react-hook-form field update by dispatching a custom event
          const event = new CustomEvent('rhf-change', { detail: { name, value: e.target.value } })
          document.dispatchEvent(event)
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ),
    Button: ({
      children,
      type,
      onClick,
      disabled,
    }: {
      children: React.ReactNode
      type?: string
      onClick?: () => void
      disabled?: boolean
    }) => (
      <button type={type as 'button' | 'submit'} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
  }
})

const makePool = (overrides: Partial<PoolSummary> = {}): PoolSummary => ({
  id: 'pool-1',
  name: 'Primary Pool',
  description: 'Main pool',
  units: 3,
  miners: 12,
  endpoints: [
    {
      role: 'primary',
      host: 'pool.example.com',
      port: '3333',
      pool: 'pool-1',
      url: '',
    },
    {
      role: 'failover_1',
      host: 'backup.example.com',
      port: '4444',
      pool: 'pool-1',
      url: '',
    },
  ],
  workerName: 'worker1',
  workerPassword: 'x',
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

const makeDevice = (id: string): Device =>
  ({
    id,
    code: `M-${id}`,
    tags: ['t-miner'],
    info: { container: 'unit-01', poolConfig: 'pool-1' },
    last: { snap: { stats: { status: 'mining' } } },
  }) as unknown as Device

const makePoolConfig = (): PoolConfigData[] => [
  {
    id: 'pool-1',
    poolConfigName: 'Primary Pool',
    description: 'Main pool',
    poolUrls: [{ url: 'stratum+tcp://pool.example.com:3333', pool: 'pool-1' }],
    miners: 12,
    containers: 3,
    updatedAt: 1704067200000,
  },
]

const defaultPools = [makePool()]

const defaultProps: AssignPoolModalProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  miners: [makeDevice('1'), makeDevice('2')],
  poolConfig: makePoolConfig(),
}

const renderModal = (props: Partial<AssignPoolModalProps> = {}) =>
  render(<AssignPoolModal {...defaultProps} {...props} />)

describe('AssignPoolModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePoolConfigs.mockReturnValue({
      pools: defaultPools,
      poolIdMap: { 'pool-1': makePool() },
      isLoading: false,
      error: null,
    })
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

    it('renders dialog title as "Assign Pool"', () => {
      renderModal()
      expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-title', 'Assign Pool')
    })
  })

  describe('loading state', () => {
    it('renders Loader when isLoading is true', () => {
      mockUsePoolConfigs.mockReturnValue({ pools: [], poolIdMap: {}, isLoading: true, error: null })
      renderModal()
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('does not render form when isLoading is true', () => {
      mockUsePoolConfigs.mockReturnValue({ pools: [], poolIdMap: {}, isLoading: true, error: null })
      renderModal()
      expect(screen.queryByTestId('form')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders CoreAlert when pool config fails to load', () => {
      mockUsePoolConfigs.mockReturnValue({
        pools: [],
        poolIdMap: {},
        isLoading: false,
        error: new Error('Failed'),
      })
      renderModal()
      expect(screen.getByTestId('core-alert')).toBeInTheDocument()
      expect(screen.getByTestId('core-alert')).toHaveAttribute('data-type', 'error')
    })

    it('does not render form when there is an error', () => {
      mockUsePoolConfigs.mockReturnValue({
        pools: [],
        poolIdMap: {},
        isLoading: false,
        error: new Error('Failed'),
      })
      renderModal()
      expect(screen.queryByTestId('form')).not.toBeInTheDocument()
    })
  })

  describe('miners table', () => {
    it('renders miners table', () => {
      renderModal()
      expect(screen.getByTestId('miners-table')).toBeInTheDocument()
    })

    it('passes all miners as rows', () => {
      renderModal()
      expect(screen.getByTestId('miners-table')).toHaveAttribute('data-row-count', '2')
    })

    it('renders miner count label', () => {
      renderModal()
      expect(screen.getByText('2 miners selected')).toBeInTheDocument()
    })

    it('renders correct count for single miner', () => {
      renderModal({ miners: [makeDevice('1')] })
      expect(screen.getByText('1 miners selected')).toBeInTheDocument()
    })

    it('renders zero miners when miners array is empty', () => {
      renderModal({ miners: [] })
      expect(screen.getByTestId('miners-table')).toHaveAttribute('data-row-count', '0')
    })
  })

  describe('pool select', () => {
    it('renders pool FormSelect', () => {
      renderModal()
      expect(screen.getByTestId('form-select-pool')).toBeInTheDocument()
    })

    it('renders pool options', () => {
      renderModal()
      expect(screen.getByRole('option', { name: 'Primary Pool' })).toBeInTheDocument()
    })

    it('does not show pool metadata before a pool is selected', () => {
      renderModal()
      expect(screen.queryByText(/Units:/)).not.toBeInTheDocument()
    })
  })

  describe('footer buttons', () => {
    it('renders Cancel button', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders Assign button', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Assign' })).toBeInTheDocument()
    })

    it('calls onClose when Cancel is clicked', async () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('form submission', () => {
    it('does not call onSubmit when no pool is selected', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      renderModal({ onSubmit })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('form'))
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('SHOW_CREDENTIAL_TEMPLATE=false', () => {
    it('does not render credential template section', () => {
      renderModal()
      expect(screen.queryByText('Credential Template Preview')).not.toBeInTheDocument()
    })
  })
})
