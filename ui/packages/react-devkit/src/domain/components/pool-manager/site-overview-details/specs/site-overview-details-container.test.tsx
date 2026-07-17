// @vitest-environment jsdom
import { actionsStore } from '@tetherto/mdk-ui-foundation'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDeviceResolution } from '@tetherto/mdk-react-adapter'
import { useSiteOverviewDetailsData } from '@domain/components/pool-manager/site-overview-details/use-site-overview-details-data'
import { notifyInfo } from '@domain/utils/notification-utils'
import { usePoolConfigs } from '@domain/components/pool-manager/hooks/use-pool-configs'
import type { SiteOverviewDetailsContainerProps } from '../site-overview-details-container'
import { SiteOverviewDetailsContainer } from '../site-overview-details-container'
import {
  getMinersPoolName,
  getSelectableName,
  resolveAssignPoolDevices,
} from '@domain/components/pool-manager/site-overview-details/site-overview-details-utils'

vi.mock('react-selecto', () => ({
  default: vi.fn(({ onSelectEnd }) => (
    <div
      data-testid="selecto"
      onClick={() => onSelectEnd?.({ added: [], removed: [], inputEvent: {} })}
    />
  )),
}))

vi.mock('@primitives/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives/index')>()
  return {
    ...actual,
    FALLBACK: '-',
    Loader: vi.fn(() => <div data-testid="loader" />),
    CoreAlert: vi.fn(({ title, type }) => (
      <div data-testid="core-alert" data-type={type}>
        {title}
      </div>
    )),
  }
})

vi.mock('@tetherto/mdk-react-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-react-adapter')>()
  return {
    ...actual,
    useDeviceResolution: vi.fn(),
  }
})

vi.mock('@domain/components/pool-manager/site-overview-details/use-site-overview-details-data', () => ({
  useSiteOverviewDetailsData: vi.fn(),
}))

vi.mock('@domain/utils/notification-utils', () => ({
  notifyInfo: vi.fn(),
}))

vi.mock('@domain/components/pool-manager/hooks/use-pool-configs', () => ({
  usePoolConfigs: vi.fn(),
}))

vi.mock('@domain/components/pool-manager/pool-manager-constants', () => ({
  ASSIGN_POOL_POPUP_ENABLED: true,
  SITE_OVERVIEW_STATUS_COLORS: { mining: 'green', offline: 'gray' },
}))

vi.mock('@domain/components/pool-manager/site-overview-details/site-overview-details-utils', () => ({
  getMinersPoolName: vi.fn(() => 'Test Pool'),
  getSelectableName: vi.fn((pdu, socket) => JSON.stringify({ pduIndex: pdu, socketIndex: socket })),
  resolveAssignPoolDevices: vi.fn(),
}))

vi.mock('@domain/components/pool-manager/site-overview-details/grid-unit', () => ({
  GridUnit: vi.fn(({ sectionKey }) => <div data-testid={`grid-unit-${sectionKey}`} />),
}))

vi.mock(
  '@domain/components/pool-manager/site-overview-details/site-overview-details-header/site-overview-details-header',
  () => ({
    SiteOverviewDetailsHeader: vi.fn(({ onSelectAll, onDeselectAll, hasSelection, poolName }) => (
      <div
        data-testid="details-header"
        data-pool={poolName}
        data-has-selection={String(hasSelection)}
      >
        <button data-testid="select-all-btn" onClick={onSelectAll}>
          Select All
        </button>
        <button data-testid="deselect-all-btn" onClick={onDeselectAll}>
          Deselect All
        </button>
      </div>
    )),
  }),
)

vi.mock(
  '@domain/components/pool-manager/site-overview-details/site-overview-details-legend/site-overview-details-legend',
  () => ({
    SiteOverviewDetailsLegend: vi.fn(() => <div data-testid="legend" />),
  }),
)

vi.mock('@domain/components/pool-manager/site-overview-details/miner-info-card/miner-info-card', () => ({
  MinerInfoCard: vi.fn(() => <div data-testid="miner-info-card" />),
}))

vi.mock(
  '@domain/components/pool-manager/sites-overview/set-pool-configuration/set-pool-configuration',
  () => ({
    SetPoolConfiguration: vi.fn(({ onSubmit }) => (
      <button
        data-testid="set-pool-configuration"
        onClick={() => onSubmit({ pool: { id: 'pool-1', name: 'Pool One' } })}
      >
        Set Pool
      </button>
    )),
  }),
)

vi.mock(
  '@domain/components/pool-manager/sites-overview/set-pool-configuration/set-pool-configuration-modal',
  () => ({
    SetPoolConfigurationModal: vi.fn(({ isOpen, onClose, onSubmit }) =>
      isOpen ? (
        <div data-testid="set-pool-modal">
          <button
            data-testid="modal-submit-btn"
            onClick={() => onSubmit({ pool: { id: 'pool-1', name: 'Pool One' } })}
          >
            Submit
          </button>
          <button data-testid="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      ) : null,
    ),
  }),
)

const mockUseDeviceResolution = useDeviceResolution as Mock
const mockUseSiteOverviewDetailsData = useSiteOverviewDetailsData as Mock
const mockUsePoolConfigs = usePoolConfigs as Mock
const mockNotifyInfo = notifyInfo as Mock
const mockGetMinersPoolName = getMinersPoolName as Mock
const mockResolveAssignPoolDevices = resolveAssignPoolDevices as Mock
const mockGetSelectableName = getSelectableName as Mock

const makeDetailsData = (overrides = {}) => ({
  actualMinersCount: 10,
  containerHashRate: '1.5 PH/s',
  pdus: [
    {
      pdu: '1',
      sockets: [{ socket: '1' }, { socket: '2' }],
    },
  ],
  segregatedPduSections: {
    Racks: [{ pdu: '1', sockets: [{ socket: '1' }, { socket: '2' }] }],
  },
  minersHashmap: {
    '1_1': {
      id: 'm1',
      hashrate: { value: '100', unit: 'MH/s' },
      snap: { stats: { status: 'mining' } },
    },
    '1_2': {
      id: 'm2',
      hashrate: { value: '50', unit: 'MH/s' },
      snap: { stats: { status: 'not_mining' } },
    },
  },
  connectedMiners: [{ id: 'm1' }, { id: 'm2' }],
  containerInfo: { container: 'bd-01', type: 'container-bd' },
  connectedMinersData: [{ rack: 'rack-1' }],
  isContainerRunning: true,
  isLoading: false,
  ...overrides,
})

const makePoolConfigs = (overrides = {}) => ({
  poolIdMap: { 'pool-1': { id: 'pool-1', name: 'Pool One' } },
  isLoading: false,
  error: null,
  ...overrides,
})

const makeProps = (
  overrides: Partial<SiteOverviewDetailsContainerProps> = {},
): SiteOverviewDetailsContainerProps => ({
  unit: {
    type: 'container-bd',
    info: { container: 'bd-01' },
    id: '',
  },
  poolConfig: [],
  ...overrides,
})

const renderContainer = (overrides: Partial<SiteOverviewDetailsContainerProps> = {}) =>
  render(<SiteOverviewDetailsContainer {...makeProps(overrides)} />)

describe('SiteOverviewDetailsContainer', () => {
  let setAddSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDeviceResolution.mockReturnValue({ isTablet: false, isMobile: false, isDesktop: true })
    mockUseSiteOverviewDetailsData.mockReturnValue(makeDetailsData())
    mockUsePoolConfigs.mockReturnValue(makePoolConfigs())
    mockGetMinersPoolName.mockReturnValue('Test Pool')
    mockGetSelectableName.mockImplementation((pdu, socket) =>
      JSON.stringify({ pduIndex: pdu, socketIndex: socket }),
    )
    mockResolveAssignPoolDevices.mockReturnValue({
      devices: [{ id: 'm1', code: 'CODE-1' }],
      hasEligibleDevices: true,
    })
    actionsStore.getState().clearAllPendingSubmissions()
    setAddSpy = vi.spyOn(actionsStore.getState(), 'setAddPendingSubmissionAction')
  })

  afterEach(() => {
    setAddSpy.mockRestore()
    actionsStore.getState().clearAllPendingSubmissions()
  })

  describe('loading state', () => {
    it('renders Loader when site overview details are loading', () => {
      mockUseSiteOverviewDetailsData.mockReturnValue(makeDetailsData({ isLoading: true }))
      renderContainer()
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('renders Loader when pool configs are loading', () => {
      mockUsePoolConfigs.mockReturnValue(makePoolConfigs({ isLoading: true }))
      renderContainer()
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('does not render main content while loading', () => {
      mockUseSiteOverviewDetailsData.mockReturnValue(makeDetailsData({ isLoading: true }))
      renderContainer()
      expect(screen.queryByTestId('details-header')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders CoreAlert when pool configs has error', () => {
      mockUsePoolConfigs.mockReturnValue(makePoolConfigs({ error: new Error('fail') }))
      renderContainer()
      expect(screen.getByTestId('core-alert')).toBeInTheDocument()
    })

    it('renders error alert with correct type', () => {
      mockUsePoolConfigs.mockReturnValue(makePoolConfigs({ error: new Error('fail') }))
      renderContainer()
      expect(screen.getByTestId('core-alert').dataset.type).toBe('error')
    })

    it('does not render main content on error', () => {
      mockUsePoolConfigs.mockReturnValue(makePoolConfigs({ error: new Error('fail') }))
      renderContainer()
      expect(screen.queryByTestId('details-header')).not.toBeInTheDocument()
    })
  })

  describe('normal render', () => {
    it('renders the root wrapper', () => {
      const { container } = renderContainer()
      expect(container.querySelector('.mdk-sodc')).toBeInTheDocument()
    })

    it('renders SiteOverviewDetailsHeader', () => {
      renderContainer()
      expect(screen.getByTestId('details-header')).toBeInTheDocument()
    })

    it('renders SiteOverviewDetailsLegend', () => {
      renderContainer()
      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })

    it('renders a GridUnit per section key', () => {
      renderContainer()
      expect(screen.getByTestId('grid-unit-Racks')).toBeInTheDocument()
    })

    it('renders multiple GridUnits when multiple section keys exist', () => {
      mockUseSiteOverviewDetailsData.mockReturnValue(
        makeDetailsData({
          segregatedPduSections: {
            Racks: [],
            SectionB: [],
          },
        }),
      )
      renderContainer()
      expect(screen.getByTestId('grid-unit-Racks')).toBeInTheDocument()
      expect(screen.getByTestId('grid-unit-SectionB')).toBeInTheDocument()
    })

    it('passes poolName from getMinersPoolName to header', () => {
      mockGetMinersPoolName.mockReturnValue('Alpha Pool')
      renderContainer()
      expect(screen.getByTestId('details-header').dataset.pool).toBe('Alpha Pool')
    })

    it('uses FALLBACK when getMinersPoolName returns empty string', () => {
      mockGetMinersPoolName.mockReturnValue('')
      renderContainer()
      expect(screen.getByTestId('details-header').dataset.pool).toBe('-')
    })
  })

  describe('racks column width', () => {
    it('applies narrow class when there is selection and not tablet', () => {
      const { container } = renderContainer()
      // Select all to get hasSelection = true
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(container.querySelector('.mdk-sodc__racks-col--narrow')).toBeInTheDocument()
    })

    it('does not apply narrow class when no selection', () => {
      const { container } = renderContainer()
      expect(container.querySelector('.mdk-sodc__racks-col--narrow')).not.toBeInTheDocument()
    })

    it('does not apply narrow class on tablet even with selection', () => {
      mockUseDeviceResolution.mockReturnValue({ isTablet: true })
      const { container } = renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(container.querySelector('.mdk-sodc__racks-col--narrow')).not.toBeInTheDocument()
    })
  })

  describe('select all', () => {
    it('selects all miners with valid hashmap entries on Select All click', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.getByTestId('details-header').dataset.hasSelection).toBe('true')
    })
  })

  describe('deselect all', () => {
    it('clears selection on Deselect All click', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.getByTestId('details-header').dataset.hasSelection).toBe('true')
      fireEvent.click(screen.getByTestId('deselect-all-btn'))
      expect(screen.getByTestId('details-header').dataset.hasSelection).toBe('false')
    })
  })

  describe('sticky col — desktop', () => {
    it('does not render sticky col when no selection', () => {
      const { container } = renderContainer()
      expect(container.querySelector('.mdk-sodc__sticky-col')).not.toBeInTheDocument()
    })

    it('renders SetPoolConfiguration when selection exists on desktop', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.getByTestId('set-pool-configuration')).toBeInTheDocument()
    })

    it('does not render MinerInfoCard when more than 1 item selected', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.queryByTestId('miner-info-card')).not.toBeInTheDocument()
    })
  })

  describe('sticky col — tablet', () => {
    beforeEach(() => {
      mockUseDeviceResolution.mockReturnValue({ isTablet: true })
    })

    it('renders tablet button when selection exists on tablet', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.getByRole('button', { name: /Selected/ })).toBeInTheDocument()
    })

    it('does not render SetPoolConfiguration on tablet', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.queryByTestId('set-pool-configuration')).not.toBeInTheDocument()
    })

    it('opens modal when tablet button is clicked', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      fireEvent.click(screen.getByRole('button', { name: /Selected/ }))
      expect(screen.getByTestId('set-pool-modal')).toBeInTheDocument()
    })

    it('closes modal when close button is clicked', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      fireEvent.click(screen.getByRole('button', { name: /Selected/ }))
      fireEvent.click(screen.getByTestId('modal-close-btn'))
      expect(screen.queryByTestId('set-pool-modal')).not.toBeInTheDocument()
    })

    it('shows correct singular label for 1 selected item', () => {
      mockUseSiteOverviewDetailsData.mockReturnValue(
        makeDetailsData({
          pdus: [{ pdu: '1', sockets: [{ socket: '1' }] }],
          minersHashmap: {
            '1_1': { id: 'm1', hashrate: { value: '100', unit: 'MH/s' } },
          },
        }),
      )
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.getByText(/Selected unit$/)).toBeInTheDocument()
    })
  })

  describe('handleAssignPoolSubmit', () => {
    it('enqueues a pending submission when devices are eligible', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      fireEvent.click(screen.getByTestId('set-pool-configuration'))

      expect(setAddSpy).toHaveBeenCalled()
    })

    it('calls notifyInfo with success message after enqueuing', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      fireEvent.click(screen.getByTestId('set-pool-configuration'))
      expect(mockNotifyInfo).toHaveBeenCalledWith('Action added', 'Assign Pools')
    })

    it('clears selection after successful submit', () => {
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      expect(screen.getByTestId('details-header').dataset.hasSelection).toBe('true')
      fireEvent.click(screen.getByTestId('set-pool-configuration'))
      expect(screen.getByTestId('details-header').dataset.hasSelection).toBe('false')
    })

    it('calls notifyInfo with "Not permitted" when no eligible devices', () => {
      mockResolveAssignPoolDevices.mockReturnValue({ devices: [], hasEligibleDevices: false })
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      fireEvent.click(screen.getByTestId('set-pool-configuration'))
      expect(mockNotifyInfo).toHaveBeenCalledWith(
        'Not permitted',
        'Assign Pools can only be performed on miners which are in mining or not mining state',
      )
    })

    it('does not enqueue a pending submission when no eligible devices', () => {
      mockResolveAssignPoolDevices.mockReturnValue({ devices: [], hasEligibleDevices: false })
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      fireEvent.click(screen.getByTestId('set-pool-configuration'))
      expect(setAddSpy).not.toHaveBeenCalled()
    })

    it('does not clear selection when no eligible devices', () => {
      mockResolveAssignPoolDevices.mockReturnValue({ devices: [], hasEligibleDevices: false })
      renderContainer()
      fireEvent.click(screen.getByTestId('select-all-btn'))
      fireEvent.click(screen.getByTestId('set-pool-configuration'))
      expect(screen.getByTestId('details-header').dataset.hasSelection).toBe('true')
    })
  })
})
