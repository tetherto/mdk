// @vitest-environment jsdom
import { actionsStore } from '@tetherto/mdk-ui-foundation'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ACTION_TYPES } from '@domain/constants/actions'
import { useDeviceResolution } from '@tetherto/mdk-react-adapter'
import { notifyInfo } from '@domain/utils/notification-utils'
import type { PoolConfigData } from '@domain/components/pool-manager/hooks/use-pool-configs'
import { usePoolConfigs } from '@domain/components/pool-manager/hooks/use-pool-configs'
import type { ProcessedContainerUnit } from '../../hooks/use-sites-overview-data'
import { SitesOverviewStatusCardList } from '../sites-overview-status-card-list'

vi.mock('@domain/components/pool-manager/hooks/use-pool-configs', () => ({
  usePoolConfigs: vi.fn(),
}))

vi.mock('@tetherto/mdk-react-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-react-adapter')>()
  return {
    ...actual,
    useDeviceResolution: vi.fn(),
  }
})

vi.mock('@domain/utils/notification-utils', () => ({
  notifyInfo: vi.fn(),
}))

vi.mock('@domain/components/pool-manager/sites-overview/sites-overview-status-card', () => ({
  SitesOverviewStatusCard: ({ unit, onSelect, onClick, checked }: any) => (
    <div data-testid="status-card" onClick={onClick}>
      <span>{unit}</span>
      <input
        type="checkbox"
        data-testid="card-checkbox"
        checked={checked}
        onChange={(e) => onSelect(e.target.checked)}
      />
    </div>
  ),
}))

vi.mock(
  '@domain/components/pool-manager/sites-overview/set-pool-configuration/set-pool-configuration',
  () => ({
    SetPoolConfiguration: ({ onSubmit }: any) => (
      <button
        data-testid="desktop-submit"
        onClick={() => onSubmit({ pool: { id: 'p1', name: 'Pool 1' } })}
      >
        Submit Desktop
      </button>
    ),
  }),
)

describe('SitesOverviewStatusCardList', () => {
  const mockUnits = [
    {
      id: '1',
      type: 'typeA',
      hashrateMhs: 100,
      miners: { actualMiners: 5 },
      info: { container: 'C1' },
      status: 'ONLINE',
    },
    {
      id: '2',
      type: 'typeB',
      hashrateMhs: 200,
      miners: { actualMiners: 10 },
      info: { container: 'C2' },
      status: 'OFFLINE',
    },
  ] as unknown as ProcessedContainerUnit[]

  const mockPoolConfig = [] as PoolConfigData[]
  let setAddSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useDeviceResolution as Mock).mockReturnValue({ isTablet: false })
    ;(usePoolConfigs as Mock).mockReturnValue({
      poolIdMap: { p1: { name: 'Pool 1' } },
      isLoading: false,
      error: null,
    })
    actionsStore.getState().clearAllPendingSubmissions()
    setAddSpy = vi.spyOn(actionsStore.getState(), 'setAddPendingSubmissionAction')
  })

  afterEach(() => {
    setAddSpy.mockRestore()
    actionsStore.getState().clearAllPendingSubmissions()
  })

  it('renders loading state', () => {
    ;(usePoolConfigs as Mock).mockReturnValue({ isLoading: true })
    render(
      <SitesOverviewStatusCardList
        units={mockUnits}
        poolConfig={mockPoolConfig}
        onCardClick={vi.fn()}
      />,
    )
    expect(document.querySelector('.mdk-loader')).toBeDefined()
  })

  it('renders error state', () => {
    ;(usePoolConfigs as Mock).mockReturnValue({ error: new Error('Fail'), isLoading: false })
    render(
      <SitesOverviewStatusCardList
        units={mockUnits}
        poolConfig={mockPoolConfig}
        onCardClick={vi.fn()}
      />,
    )
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('renders the grid of units', () => {
    render(
      <SitesOverviewStatusCardList
        units={mockUnits}
        poolConfig={mockPoolConfig}
        onCardClick={vi.fn()}
      />,
    )
    const cards = screen.getAllByTestId('status-card')
    expect(cards).toHaveLength(2)
  })

  it('handles selection and shows the sticky column on desktop', () => {
    render(
      <SitesOverviewStatusCardList
        units={mockUnits}
        poolConfig={mockPoolConfig}
        onCardClick={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('desktop-submit')).not.toBeInTheDocument()

    const checkboxes = screen.getAllByTestId('card-checkbox')
    fireEvent.click(checkboxes[0]!)

    expect(screen.getByTestId('desktop-submit')).toBeInTheDocument()
  })

  it('shows FAB and Modal on tablet view when units are selected', () => {
    ;(useDeviceResolution as Mock).mockReturnValue({ isTablet: true })
    render(
      <SitesOverviewStatusCardList
        units={mockUnits}
        poolConfig={mockPoolConfig}
        onCardClick={vi.fn()}
      />,
    )

    const checkboxes = screen.getAllByTestId('card-checkbox')
    fireEvent.click(checkboxes[0]!)

    expect(screen.getByText(/1 Selected unit/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Selected/i }))
  })

  it('enqueues a pending submission and notifies on submit', async () => {
    render(
      <SitesOverviewStatusCardList
        units={mockUnits}
        poolConfig={mockPoolConfig}
        onCardClick={vi.fn()}
      />,
    )

    fireEvent.click(screen.getAllByTestId('card-checkbox')[0]!)
    fireEvent.click(screen.getByTestId('desktop-submit'))

    await waitFor(() => {
      expect(actionsStore.getState().pendingSubmissions).toHaveLength(1)
      expect(actionsStore.getState().pendingSubmissions[0]).toMatchObject({
        action: ACTION_TYPES.SETUP_POOLS,
        poolName: 'Pool 1',
        overrideQuery: false,
        containersList: ['C1'],
        params: [
          {
            configType: 'pool',
            poolConfigId: 'p1',
          },
        ],
        query: { tags: { $in: ['container-C1'] } },
      })
      expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Assign Pools')
    })

    expect(screen.queryByTestId('desktop-submit')).not.toBeInTheDocument()
  })

  it('calls onCardClick when a card is clicked', () => {
    const onCardClickMock = vi.fn()
    render(
      <SitesOverviewStatusCardList
        units={mockUnits}
        poolConfig={mockPoolConfig}
        onCardClick={onCardClickMock}
      />,
    )

    const cards = screen.getAllByTestId('status-card')
    fireEvent.click(cards[0]!)

    expect(onCardClickMock).toHaveBeenCalledWith('1')
  })
})
