import { UNITS } from '@core/index'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MinerInfoCardProps } from '../miner-info-card/miner-info-card'
import { MinerInfoCard } from '../miner-info-card/miner-info-card'

vi.mock('@core/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@core/index')>()
  return {
    ...actual,
    Loader: () => <div data-testid="loader" />,
    CoreAlert: ({ type, title }: { type: string; title: string }) => (
      <div data-testid="core-alert" data-type={type}>
        {title}
      </div>
    ),
  }
})

const makeSocket = (pduIndex: number, socketIndex: number) =>
  JSON.stringify({ pduIndex, socketIndex })

const makeMiner = (overrides: Record<string, unknown> = {}) => ({
  id: '1_3',
  info: { poolConfig: 'pool-1' },
  hashrate: { value: 100, unit: UNITS.HASHRATE_TH_S },
  overriddenConfig: false,
  ...overrides,
})

const makePool = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'pool-1',
    name: 'Main Pool',
    description: 'Main pool for mining',
    endpoints: [{ url: 'stratum+tcp://pool.example.com:3333' }],
    workerName: '',
    workerPassword: '',
    enabled: true,
    priority: 1,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }) as unknown as MinerInfoCardProps['poolIdMap']['pool-1']

const defaultProps: MinerInfoCardProps = {
  selectedItems: new Set([makeSocket(1, 3)]),
  poolIdMap: { 'pool-1': makePool() },
  minersHashmap: { '1_3': makeMiner() },
  isLoading: false,
  error: undefined,
  minerName: 'PDU',
}

const renderComponent = (overrides: Partial<MinerInfoCardProps> = {}) =>
  render(<MinerInfoCard {...defaultProps} {...overrides} />)

describe('MinerInfoCard', () => {
  describe('header', () => {
    it('renders "Miner Info" title', () => {
      renderComponent()
      expect(screen.getByText('Miner Info')).toBeInTheDocument()
    })

    it('renders minerName with pduIndex', () => {
      renderComponent()
      expect(screen.getByText(/PDU 1/)).toBeInTheDocument()
    })

    it('renders socket index', () => {
      renderComponent()
      expect(screen.getByText(/Socket: 3/)).toBeInTheDocument()
    })

    it('applies statusColor as background on socket badge', () => {
      const { container } = renderComponent()
      const badge = container.querySelector('.mdk-miner-info-card__socket-badge') as HTMLElement
      expect(badge.style.backgroundColor).toBe('gray')
    })

    it('renders empty minerName gracefully when not provided', () => {
      renderComponent({ minerName: undefined })
      expect(screen.getByText(/Socket: 3/)).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders Loader when isLoading is true', () => {
      renderComponent({ isLoading: true })
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('does not render pool section when isLoading is true', () => {
      renderComponent({ isLoading: true })
      expect(screen.queryByText('Pool Information')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders CoreAlert when error is provided', () => {
      renderComponent({ error: new Error('fetch failed') })
      expect(screen.getByTestId('core-alert')).toBeInTheDocument()
    })

    it('renders error alert with type "error"', () => {
      renderComponent({ error: 'some error' })
      expect(screen.getByTestId('core-alert')).toHaveAttribute('data-type', 'error')
    })

    it('renders "Failed to load data" as alert title', () => {
      renderComponent({ error: 'some error' })
      expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    })

    it('does not render pool section when error is present', () => {
      renderComponent({ error: 'some error' })
      expect(screen.queryByText('Pool Information')).not.toBeInTheDocument()
    })
  })

  describe('pool information', () => {
    it('renders "Pool Information" section title', () => {
      renderComponent()
      expect(screen.getByText('Pool Information')).toBeInTheDocument()
    })

    it('renders pool name from poolIdMap', () => {
      renderComponent()
      expect(screen.getByText('Main Pool')).toBeInTheDocument()
    })

    it('renders "None" when miner has no poolConfig', () => {
      renderComponent({
        minersHashmap: { '1_3': makeMiner({ info: { poolConfig: undefined } }) },
      })
      expect(screen.getAllByText('None')[0]).toBeInTheDocument()
    })

    it('renders "None" when poolConfig id is not in poolIdMap', () => {
      renderComponent({
        minersHashmap: { '1_3': makeMiner({ info: { poolConfig: 'unknown-pool' } }) },
      })
      expect(screen.getAllByText('None')[0]).toBeInTheDocument()
    })

    it('renders endpoint URL', () => {
      renderComponent()
      expect(screen.getByText('stratum+tcp://pool.example.com:3333')).toBeInTheDocument()
    })

    it('renders "None" for endpoint when pool has no endpoints', () => {
      renderComponent({
        poolIdMap: { 'pool-1': makePool({ endpoints: [] }) },
      })
      expect(
        screen.getAllByText('None').some((el) => el.closest('.mdk-miner-info-card__field')),
      ).toBe(true)
    })
  })

  describe('hashrate', () => {
    it('renders hashrate value with unit', () => {
      renderComponent()
      expect(screen.getByText(`100 ${UNITS.HASHRATE_TH_S}`)).toBeInTheDocument()
    })

    it('renders "-" when hashrate value is null', () => {
      renderComponent({
        minersHashmap: {
          '1_3': makeMiner({ hashrate: { value: null, unit: UNITS.HASHRATE_TH_S } }),
        },
      })
      expect(screen.getByText('-')).toBeInTheDocument()
    })

    it('renders "-" when hashrate is undefined', () => {
      renderComponent({
        minersHashmap: { '1_3': makeMiner({ hashrate: undefined }) },
      })
      expect(screen.getByText('-')).toBeInTheDocument()
    })
  })

  describe('override status', () => {
    it('renders "Override" when overriddenConfig is true', () => {
      renderComponent({
        minersHashmap: { '1_3': makeMiner({ overriddenConfig: true }) },
      })
      expect(screen.getByText('Override')).toBeInTheDocument()
    })

    it('renders "Normal" when overriddenConfig is false', () => {
      renderComponent()
      expect(screen.getByText('Normal')).toBeInTheDocument()
    })

    it('renders "-" when overriddenConfig is undefined', () => {
      renderComponent({
        minersHashmap: { '1_3': makeMiner({ overriddenConfig: undefined }) },
      })
      expect(screen.getAllByText('-')[0]).toBeInTheDocument()
    })

    it('renders "-" when overriddenConfig is null', () => {
      renderComponent({
        minersHashmap: { '1_3': makeMiner({ overriddenConfig: null }) },
      })
      expect(screen.getAllByText('-')[0]).toBeInTheDocument()
    })
  })

  describe('empty selection', () => {
    it('renders header without pdu/socket info when selectedItems is empty', () => {
      renderComponent({ selectedItems: new Set() })
      expect(screen.getByText('Miner Info')).toBeInTheDocument()
    })

    it('renders pool section with "None" values when no miner is resolved', () => {
      renderComponent({ selectedItems: new Set() })
      const noneElements = screen.getAllByText('None')
      expect(noneElements.length).toBeGreaterThan(0)
    })
  })
})
