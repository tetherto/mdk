import { fireEvent, render, screen } from '@testing-library/react'
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDeviceResolution, useKeyDown, usePduViewer } from '@tetherto/mdk-react-adapter'
import type { MinerData, Pdu } from '../use-site-overview-details-data'
import { isAntspaceHydro, isMicroBT } from '@domain/utils/container-utils'
import { DEVICE_NOT_FOUND_MESSAGE } from '@domain/utils/device-utils'
import { SITE_OVERVIEW_STATUSES } from '../../pool-manager-constants'
import type { GridUnitProps } from '../grid-unit'
import { GridUnit } from '../grid-unit'
import {
  getMinerInSocket,
  getSocketStatus,
  getUnitRowLabel,
  socketHasMiner,
} from '@domain/components/pool-manager/site-overview-details/site-overview-details-utils'

vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: vi.fn(({ children, panning }) => (
    <div data-testid="transform-wrapper" data-panning-disabled={String(panning?.disabled ?? false)}>
      {children}
    </div>
  )),
  TransformComponent: vi.fn(({ children }) => (
    <div data-testid="transform-component">{children}</div>
  )),
}))

vi.mock('@tetherto/mdk-react-adapter', () => ({
  useDeviceResolution: vi.fn(),
  useKeyDown: vi.fn(() => false),
  usePduViewer: vi.fn(),
  usePlatform: vi.fn(() => 'windows'),
  OS_TYPES: { MAC: 'mac', Windows: 'windows', Linux: 'linux', Android: 'android', IOS: 'ios' },
  getControlSectionsTooltips: vi.fn(() => [
    { label: 'Drag select', desc: 'Select multiple miners.' },
    { label: 'Shift+Click', desc: 'Select individual miners.' },
  ]),
}))

vi.mock('@domain/utils/container-utils', () => ({
  isAntspaceHydro: vi.fn(() => false),
  isMicroBT: vi.fn(() => false),
}))

vi.mock('@domain/components/pool-manager/site-overview-details/site-overview-details-utils', () => ({
  getMinerInSocket: vi.fn(
    ({ minersHashmap, pdu, socket }) => minersHashmap[`${pdu.pdu}_${socket.socket}`],
  ),
  getSocketStatus: vi.fn(() => SITE_OVERVIEW_STATUSES.MINING),
  getUnitRowLabel: vi.fn((pdu) => `Rack ${pdu.pdu}`),
  socketHasMiner: vi.fn(({ minersHashmap, pdu, socket }) => {
    const miner = minersHashmap[`${pdu.pdu}_${socket.socket}`]
    return miner ? miner.error !== DEVICE_NOT_FOUND_MESSAGE : false
  }),
}))

vi.mock('@primitives/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives/index')>()
  return {
    ...actual,
    Button: vi.fn(({ children, onClick, variant }) => (
      <button data-testid={`btn-${variant ?? 'default'}`} onClick={onClick}>
        {children}
      </button>
    )),
    SimpleTooltip: vi.fn(({ children }) => <div data-testid="simple-tooltip">{children}</div>),
  }
})

const mockUsePduViewer = usePduViewer as Mock
const mockUseDeviceResolution = useDeviceResolution as Mock
const mockUseKeyDown = useKeyDown as Mock
const mockIsAntspaceHydro = isAntspaceHydro as Mock
const mockIsMicroBT = isMicroBT as Mock
const mockGetMinerInSocket = getMinerInSocket as Mock
const mockGetSocketStatus = getSocketStatus as Mock
const mockGetUnitRowLabel = getUnitRowLabel as Mock
const mockSocketHasMiner = socketHasMiner as Mock

const makeViewerControls = (overrides = {}) => ({
  viewportBoundingBox: undefined,
  showBackToContent: false,
  showViewerControls: true,
  minZoomLevel: 0.5,
  onViewerInit: vi.fn(),
  resetViewer: vi.fn(),
  handleBackToContent: vi.fn(),
  handleZoomIn: vi.fn(),
  handleZoomOut: vi.fn(),
  checkShowBackToContent: vi.fn(),
  ...overrides,
})

const makeDeviceResolution = (overrides = {}) => ({
  isTablet: false,
  isMobile: false,
  isDesktop: true,
  width: 1280,
  ...overrides,
})

const makeMinerData = (overrides: Partial<MinerData> = {}): MinerData => ({
  id: 'miner-1',
  hashrate: { value: '100', unit: 'MH/s', realValue: 100 },
  snap: { stats: { status: 'mining' } },
  ...overrides,
})

const makePdu = (pduId: string, sockets: string[]): Pdu => ({
  pdu: pduId,
  sockets: sockets.map((s) => ({ socket: s })) as unknown as Pdu['sockets'],
})

const makeProps = (overrides: Partial<GridUnitProps> = {}): GridUnitProps => ({
  containerInfo: { container: 'bd-01', type: 'container-bd' },
  connectedMiners: [{ rack: 'rack-1' }],
  sectionKey: 'rack1',
  selectedItems: new Set(),
  setSelectedItems: vi.fn(),
  segregatedPduSections: {
    rack1: [makePdu('1', ['1', '2']), makePdu('2', ['1'])],
  },
  minersHashmap: {
    '1_1': makeMinerData({ id: 'm1' }),
    '1_2': makeMinerData({ id: 'm2' }),
    '2_1': makeMinerData({ id: 'm3' }),
  },
  getSelectableName: (pdu, socket) => JSON.stringify({ pduIndex: pdu, socketIndex: socket }),
  onSocketClick: vi.fn(),
  ...overrides,
})

const renderGridUnit = (overrides: Partial<GridUnitProps> = {}) =>
  render(<GridUnit {...makeProps(overrides)} />)

describe('GridUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePduViewer.mockReturnValue(makeViewerControls())
    mockUseDeviceResolution.mockReturnValue(makeDeviceResolution())
    mockUseKeyDown.mockReturnValue(false)
    mockIsAntspaceHydro.mockReturnValue(false)
    mockIsMicroBT.mockReturnValue(false)
    mockGetUnitRowLabel.mockImplementation((pdu) => `Rack ${pdu.pdu}`)
    mockGetMinerInSocket.mockImplementation(
      ({ minersHashmap, pdu, socket }) => minersHashmap[`${pdu.pdu}_${socket.socket}`],
    )
    mockSocketHasMiner.mockImplementation(({ minersHashmap, pdu, socket }) => {
      const miner = minersHashmap[`${pdu.pdu}_${socket.socket}`]
      return miner ? miner.error !== DEVICE_NOT_FOUND_MESSAGE : false
    })
    mockGetSocketStatus.mockReturnValue(SITE_OVERVIEW_STATUSES.MINING)
  })

  describe('viewer controls', () => {
    it('renders zoom in / zoom out / reset buttons when showViewerControls is true', () => {
      renderGridUnit()
      expect(screen.getByText('Zoom in')).toBeInTheDocument()
      expect(screen.getByText('Zoom out')).toBeInTheDocument()
      expect(screen.getByText('Reset')).toBeInTheDocument()
    })

    it('does not render controls when showViewerControls is false', () => {
      mockUsePduViewer.mockReturnValue(makeViewerControls({ showViewerControls: false }))
      renderGridUnit()
      expect(screen.queryByText('Zoom in')).not.toBeInTheDocument()
    })

    it('renders "Back to content" button when showBackToContent is true', () => {
      mockUsePduViewer.mockReturnValue(makeViewerControls({ showBackToContent: true }))
      renderGridUnit()
      expect(screen.getByText('Back to content')).toBeInTheDocument()
    })

    it('does not render "Back to content" when showBackToContent is false', () => {
      renderGridUnit()
      expect(screen.queryByText('Back to content')).not.toBeInTheDocument()
    })

    it('calls handleZoomIn when Zoom in is clicked', () => {
      const handleZoomIn = vi.fn()
      mockUsePduViewer.mockReturnValue(makeViewerControls({ handleZoomIn }))
      renderGridUnit()
      fireEvent.click(screen.getByText('Zoom in'))
      expect(handleZoomIn).toHaveBeenCalledOnce()
    })

    it('calls handleZoomOut when Zoom out is clicked', () => {
      const handleZoomOut = vi.fn()
      mockUsePduViewer.mockReturnValue(makeViewerControls({ handleZoomOut }))
      renderGridUnit()
      fireEvent.click(screen.getByText('Zoom out'))
      expect(handleZoomOut).toHaveBeenCalledOnce()
    })

    it('calls resetViewer with viewportBoundingBox when Reset is clicked', () => {
      const resetViewer = vi.fn()
      const viewportBoundingBox = {
        boundingRect: new DOMRect(),
        scrollWidth: 400,
        scrollHeight: 300,
      }
      mockUsePduViewer.mockReturnValue(makeViewerControls({ resetViewer, viewportBoundingBox }))
      renderGridUnit()
      fireEvent.click(screen.getByText('Reset'))
      expect(resetViewer).toHaveBeenCalledWith(viewportBoundingBox)
    })

    it('calls handleBackToContent when Back to content is clicked', () => {
      const handleBackToContent = vi.fn()
      mockUsePduViewer.mockReturnValue(
        makeViewerControls({ showBackToContent: true, handleBackToContent }),
      )
      renderGridUnit()
      fireEvent.click(screen.getByText('Back to content'))
      expect(handleBackToContent).toHaveBeenCalledOnce()
    })
  })

  describe('tooltip', () => {
    it('renders tooltip icon on desktop', () => {
      renderGridUnit()
      expect(screen.getByTestId('simple-tooltip')).toBeInTheDocument()
    })

    it('does not render tooltip on tablet', () => {
      mockUseDeviceResolution.mockReturnValue(
        makeDeviceResolution({ isTablet: true, isDesktop: false }),
      )
      renderGridUnit()
      expect(screen.queryByTestId('simple-tooltip')).not.toBeInTheDocument()
    })
  })

  describe('PDU / socket rendering', () => {
    it('renders a rack label for each PDU in the section', () => {
      renderGridUnit()
      expect(screen.getByText('Rack 1')).toBeInTheDocument()
      expect(screen.getByText('Rack 2')).toBeInTheDocument()
    })

    it('renders hashrate value and unit for miners', () => {
      renderGridUnit()
      expect(screen.getAllByText('100')).toHaveLength(3)
      expect(screen.getAllByText('MH/s')).toHaveLength(3)
    })

    it('renders empty section when sectionKey has no PDUs', () => {
      renderGridUnit({ sectionKey: 'nonexistent' })
      expect(screen.queryByText('Rack 1')).not.toBeInTheDocument()
    })
  })

  describe('socket click', () => {
    it('calls onSocketClick with correct args when socket is clicked', () => {
      const onSocketClick = vi.fn()
      renderGridUnit({ onSocketClick })
      const container = document.querySelector('.mdk-grid-unit__socket-container')!
      fireEvent.click(container)
      expect(onSocketClick).toHaveBeenCalledWith(
        expect.objectContaining({ container: 'bd-01', rack: 'rack-1' }),
        '1',
        '1',
        expect.objectContaining({ id: 'm1' }),
      )
    })

    it('does not call onSocketClick when socket is disabled', () => {
      const onSocketClick = vi.fn()
      renderGridUnit({ onSocketClick, disableMinerSelect: true })
      const disabled = document.querySelector('.mdk-grid-unit__socket-container--disabled')!
      fireEvent.click(disabled)
      expect(onSocketClick).not.toHaveBeenCalled()
    })
  })

  describe('rack row selection', () => {
    it('adds all sockets of a PDU to selection on rack label click', () => {
      const setSelectedItems = vi.fn()
      renderGridUnit({ setSelectedItems })
      fireEvent.click(screen.getByText('Rack 1'))
      const updater = setSelectedItems.mock.calls[0][0] as (prev: Set<string>) => Set<string>
      const result = updater(new Set())
      expect(result.size).toBe(2)
    })

    it('removes all sockets of a PDU from selection on Ctrl+click', () => {
      const setSelectedItems = vi.fn()
      const existing = new Set([
        JSON.stringify({ pduIndex: '1', socketIndex: '1' }),
        JSON.stringify({ pduIndex: '1', socketIndex: '2' }),
      ])
      renderGridUnit({ setSelectedItems, selectedItems: existing })
      fireEvent.click(screen.getByText('Rack 1'), { ctrlKey: true })
      const updater = setSelectedItems.mock.calls[0][0] as (prev: Set<string>) => Set<string>
      const result = updater(new Set(existing))
      expect(result.size).toBe(0)
    })

    it('removes all sockets of a PDU from selection on Meta+click', () => {
      const setSelectedItems = vi.fn()
      renderGridUnit({ setSelectedItems })
      fireEvent.click(screen.getByText('Rack 1'), { metaKey: true })
      const updater = setSelectedItems.mock.calls[0][0] as (prev: Set<string>) => Set<string>
      const result = updater(new Set([JSON.stringify({ pduIndex: '1', socketIndex: '1' })]))
      expect(result.size).toBe(0)
    })
  })

  describe('selected state', () => {
    it('applies selected class when socket is in selectedItems', () => {
      const selectedItems = new Set([JSON.stringify({ pduIndex: '1', socketIndex: '1' })])
      renderGridUnit({ selectedItems })
      expect(document.querySelectorAll('.mdk-grid-unit__miner-box--selected')).toHaveLength(1)
    })

    it('does not apply selected class when socket is not selected', () => {
      renderGridUnit({ selectedItems: new Set() })
      expect(document.querySelectorAll('.mdk-grid-unit__miner-box--selected')).toHaveLength(0)
    })
  })

  describe('mobileSelectionEnabled', () => {
    it('disables panning when mobileSelectionEnabled is true and alt is not held', async () => {
      mockUseKeyDown.mockReturnValue(false)
      renderGridUnit({ mobileSelectionEnabled: true })
      const wrapper = await screen.findByTestId('transform-wrapper')
      expect(wrapper.dataset.panningDisabled).toBe('true')
    })

    it('enables panning when mobileSelectionEnabled is false', async () => {
      renderGridUnit({ mobileSelectionEnabled: false })
      const wrapper = await screen.findByTestId('transform-wrapper')
      expect(wrapper.dataset.panningDisabled).toBe('false')
    })

    it('enables panning even when mobileSelectionEnabled is true if alt is held', async () => {
      mockUseKeyDown.mockReturnValue(true)
      renderGridUnit({ mobileSelectionEnabled: true })
      const wrapper = await screen.findByTestId('transform-wrapper')
      expect(wrapper.dataset.panningDisabled).toBe('false')
    })
  })

  describe('context menu', () => {
    it('prevents default on right-click', () => {
      renderGridUnit()
      const root = document.querySelector('.mdk-grid-unit')!
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      root.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('layout direction', () => {
    it('applies column class when type is not antspace hydro or microbt', () => {
      renderGridUnit({ type: 'container-bd' })
      expect(document.querySelector('.mdk-grid-unit__row-wrapper--column')).toBeInTheDocument()
    })

    it('does not apply column class when type is antspace hydro', () => {
      mockIsAntspaceHydro.mockReturnValue(true)
      renderGridUnit({ type: 'container-as-hk3' })
      expect(document.querySelector('.mdk-grid-unit__row-wrapper--column')).not.toBeInTheDocument()
    })

    it('does not apply column class when type is microbt', () => {
      mockIsMicroBT.mockReturnValue(true)
      renderGridUnit({ type: 'container-mbt' })
      expect(document.querySelector('.mdk-grid-unit__row-wrapper--column')).not.toBeInTheDocument()
    })
  })

  describe('heatmap mode', () => {
    it('applies heatmap label class when isHeatmapMode is true', () => {
      renderGridUnit({ isHeatmapMode: true })
      expect(document.querySelector('.mdk-grid-unit__row-label--heatmap')).toBeInTheDocument()
    })
  })
})
