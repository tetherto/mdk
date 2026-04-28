import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContextualModal } from '../../../../../../hooks'
import type { PoolConfigData } from '../../../../../domain'
import { usePoolConfigs } from '../../../../../domain'
import type { PoolSummary } from '../../../../../domain/pool-manager/types'
import { PoolManagerPools } from '../pool-manager-pools'

const { mockOpenModal, mockCloseModal } = vi.hoisted(() => ({
  mockOpenModal: vi.fn(),
  mockCloseModal: vi.fn(),
}))

vi.mock('../../../../../../hooks/use-contextual-modal', () => ({
  useContextualModal: vi.fn(() => ({
    modalOpen: false,
    handleOpen: mockOpenModal,
    handleClose: mockCloseModal,
  })),
}))

vi.mock('../../../../../domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../domain')>()
  return {
    ...actual,
    ADD_POOL_ENABLED: true,
    usePoolConfigs: vi.fn(() => ({ pools: [], isLoading: false, error: null })),
  }
})

vi.mock(
  '../../../../../domain/pool-manager/pools/pool-collapse-item-header/pool-collapse-item-header',
  () => ({
    PoolCollapseItemHeader: ({ pool }: { pool: PoolSummary }) => (
      <div data-testid="pool-collapse-header" data-pool-name={pool.name} />
    ),
  }),
)

vi.mock(
  '../../../../../domain/pool-manager/pools/pool-collapse-item-body/pool-collapse-item-body',
  () => ({
    PoolCollapseItemBody: ({ pool }: { pool: PoolSummary }) => (
      <div data-testid="pool-collapse-body" data-pool-name={pool.name} />
    ),
  }),
)

vi.mock('../../../../../domain/pool-manager/pools/add-pool-modal/add-pool-modal', () => ({
  AddPoolModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="add-pool-modal">
        <button data-testid="add-pool-modal-close" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...actual,
    Loader: () => <div data-testid="loader" />,
    CoreAlert: ({ type, title }: { type: string; title: string }) => (
      <div data-testid="core-alert" data-type={type}>
        {title}
      </div>
    ),
    AccordionRoot: ({
      children,
      value,
      className,
    }: {
      children: React.ReactNode
      value: string[]
      onValueChange: (v: string[]) => void
      className?: string
    }) => (
      <div data-testid="accordion-root" data-active-keys={value.join(',')} className={className}>
        {children}
      </div>
    ),
    AccordionItem: ({
      children,
      value,
      className,
    }: {
      children: React.ReactNode
      value: string
      className?: string
    }) => (
      <div data-testid="accordion-item" data-value={value} className={className}>
        {children}
      </div>
    ),
    AccordionTrigger: ({ customLabel }: { customLabel: React.ReactNode }) => (
      <div data-testid="accordion-trigger">{customLabel}</div>
    ),
    AccordionContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="accordion-content">{children}</div>
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

vi.mock('@radix-ui/react-icons', () => ({
  ArrowLeftIcon: () => <svg data-testid="arrow-left-icon" />,
}))

const makePool = (name: string): PoolSummary => ({
  id: `id-${name}`,
  name,
  description: `${name} description`,
  units: 2,
  miners: 10,
  workerName: 'worker1',
  workerPassword: 'x',
  endpoints: [],
  updatedAt: new Date('2024-01-01'),
})

const defaultProps = {
  poolConfig: [] as PoolConfigData[],
  backButtonClick: vi.fn(),
}

const renderComponent = (props: Partial<typeof defaultProps> = {}) =>
  render(<PoolManagerPools {...defaultProps} {...props} />)

describe('PoolManagerPools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('header', () => {
    it('renders Pools title', () => {
      renderComponent()
      expect(screen.getByText('Pools')).toBeInTheDocument()
    })

    it('renders Pool Manager back button', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /pool manager/i })).toBeInTheDocument()
    })

    it('calls backButtonClick when back button is clicked', () => {
      const backButtonClick = vi.fn()
      renderComponent({ backButtonClick })
      fireEvent.click(screen.getByRole('button', { name: /pool manager/i }))
      expect(backButtonClick).toHaveBeenCalledTimes(1)
    })

    it('renders Add Pool button when ADD_POOL_ENABLED is true', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: 'Add Pool' })).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders Loader when isLoading is true', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({ pools: [], isLoading: true, error: null })
      renderComponent()
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('does not render accordion when loading', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({ pools: [], isLoading: true, error: null })
      renderComponent()
      expect(screen.queryByTestId('accordion-root')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders CoreAlert when error occurs', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({
        pools: [],
        isLoading: false,
        error: new Error('Failed'),
      })
      renderComponent()
      expect(screen.getByTestId('core-alert')).toBeInTheDocument()
      expect(screen.getByTestId('core-alert')).toHaveAttribute('data-type', 'error')
    })

    it('does not render accordion when there is an error', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({
        pools: [],
        isLoading: false,
        error: new Error('Failed'),
      })
      renderComponent()
      expect(screen.queryByTestId('accordion-root')).not.toBeInTheDocument()
    })
  })

  describe('accordion', () => {
    it('renders accordion when pools are loaded', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({
        pools: [makePool('Alpha')],
        isLoading: false,
        error: null,
      })
      renderComponent()
      expect(screen.getByTestId('accordion-root')).toBeInTheDocument()
    })

    it('renders one accordion item per pool', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({
        pools: [makePool('Alpha'), makePool('Beta')],
        isLoading: false,
        error: null,
      })
      renderComponent()
      expect(screen.getAllByTestId('accordion-item')).toHaveLength(2)
    })

    it('renders pool header for each pool', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({
        pools: [makePool('Alpha'), makePool('Beta')],
        isLoading: false,
        error: null,
      })
      renderComponent()
      const headers = screen.getAllByTestId('pool-collapse-header')
      expect(headers).toHaveLength(2)
      expect(headers[0]).toHaveAttribute('data-pool-name', 'Alpha')
      expect(headers[1]).toHaveAttribute('data-pool-name', 'Beta')
    })

    it('renders pool body for each pool', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({
        pools: [makePool('Alpha')],
        isLoading: false,
        error: null,
      })
      renderComponent()
      expect(screen.getByTestId('pool-collapse-body')).toHaveAttribute('data-pool-name', 'Alpha')
    })

    it('renders empty accordion when pools list is empty', async () => {
      vi.mocked(usePoolConfigs).mockReturnValue({ pools: [], isLoading: false, error: null })
      renderComponent()
      expect(screen.getByTestId('accordion-root')).toBeInTheDocument()
      expect(screen.queryByTestId('accordion-item')).not.toBeInTheDocument()
    })
  })

  describe('add pool modal', () => {
    it('does not render AddPoolModal when modalOpen is false', () => {
      renderComponent()
      expect(screen.queryByTestId('add-pool-modal')).not.toBeInTheDocument()
    })

    it('renders AddPoolModal when modalOpen is true', async () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
        subject: undefined,
        setSubject(): void {},
      })
      renderComponent()
      expect(screen.getByTestId('add-pool-modal')).toBeInTheDocument()
    })

    it('calls openAddPoolModal when Add Pool is clicked', () => {
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: 'Add Pool' }))
      expect(mockOpenModal).toHaveBeenCalledTimes(1)
    })

    it('calls closeAddPoolModal when modal close is triggered', async () => {
      vi.mocked(useContextualModal).mockReturnValue({
        modalOpen: true,
        handleOpen: mockOpenModal,
        handleClose: mockCloseModal,
        subject: undefined,
        setSubject(): void {},
      })
      renderComponent()
      fireEvent.click(screen.getByTestId('add-pool-modal-close'))
      expect(mockCloseModal).toHaveBeenCalledTimes(1)
    })
  })
})
