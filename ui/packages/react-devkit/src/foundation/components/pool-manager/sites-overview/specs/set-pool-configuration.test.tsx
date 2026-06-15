import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePoolConfigs } from '@/components/pool-manager/hooks/use-pool-configs'
import { SetPoolConfiguration } from '../set-pool-configuration/set-pool-configuration'

vi.mock('@/components/pool-manager/hooks/use-pool-configs', () => ({
  usePoolConfigs: vi.fn(),
}))

vi.mock('@/components/pool-manager/pool-manager-constants', () => ({
  SHOW_CREDENTIAL_TEMPLATE: true,
  POOL_ENDPOINT_ROLES_LABELS: { PRIMARY: 'Primary', SECONDARY: 'Secondary' },
}))

describe('SetPoolConfiguration', () => {
  const mockOnSubmit = vi.fn()
  const mockPoolConfig = [{ some: 'config' }] as any

  const mockPools = [
    {
      id: 'pool-1',
      name: 'AntPool',
      units: 10,
      miners: 50,
      endpoints: [{ host: 'stratum.antpool.com', port: '3333', role: 'PRIMARY' }],
    },
    {
      id: 'pool-2',
      name: 'F2Pool',
      units: 5,
      miners: 20,
      endpoints: [],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state correctly', () => {
    ;(usePoolConfigs as Mock).mockReturnValue({ pools: [], isLoading: true, error: null })

    render(<SetPoolConfiguration onSubmit={mockOnSubmit} poolConfig={mockPoolConfig} />)
    // Check for Loader (assuming Loader renders specific test-id or class)
    expect(document.querySelector('.mdk-loader')).toBeDefined()
  })

  it('renders error state correctly', () => {
    ;(usePoolConfigs as Mock).mockReturnValue({
      pools: [],
      isLoading: false,
      error: new Error('Fail'),
    })

    render(<SetPoolConfiguration onSubmit={mockOnSubmit} poolConfig={mockPoolConfig} />)
    expect(screen.getByText('Error loading data')).toBeDefined()
  })

  it('displays pool stats and table when a pool is selected', async () => {
    ;(usePoolConfigs as Mock).mockReturnValue({ pools: mockPools, isLoading: false, error: null })

    render(<SetPoolConfiguration onSubmit={mockOnSubmit} poolConfig={mockPoolConfig} />)

    const trigger = screen.getByRole('combobox', { name: /pool/i })
    fireEvent.click(trigger)

    const option = screen.getByRole('option', { name: 'AntPool' })
    fireEvent.click(option)

    await waitFor(() => {
      expect(screen.getByText((_, el) => el?.textContent === '#Units: 10')).toBeInTheDocument()
      expect(screen.getByText((_, el) => el?.textContent === '#Miners: 50')).toBeInTheDocument()
    })

    expect(screen.getByText('stratum.antpool.com')).toBeInTheDocument()
  })

  it('calls onSubmit with correct pool data when form is submitted', async () => {
    ;(usePoolConfigs as Mock).mockReturnValue({ pools: mockPools, isLoading: false, error: null })

    render(<SetPoolConfiguration onSubmit={mockOnSubmit} poolConfig={mockPoolConfig} />)

    const trigger = screen.getByRole('combobox', { name: /pool/i })
    fireEvent.click(trigger)

    const option = screen.getByRole('option', { name: 'AntPool' })
    fireEvent.click(option)

    const submitBtn = screen.getByRole('button', { name: /assign pool/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        pool: mockPools[0],
      })
    })
  })

  it('shows credentials preview when constant is enabled', async () => {
    ;(usePoolConfigs as Mock).mockReturnValue({ pools: mockPools, isLoading: false, error: null })

    render(<SetPoolConfiguration onSubmit={mockOnSubmit} poolConfig={mockPoolConfig} />)

    fireEvent.click(screen.getByRole('combobox', { name: /pool/i }))
    fireEvent.click(screen.getByRole('option', { name: 'AntPool' }))

    await waitFor(() => {
      expect(screen.getByText('Credentials Template Preview')).toBeInTheDocument()
      expect(screen.getByText('unit01.miner001')).toBeInTheDocument()
    })
  })
})
