import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { selectSelectedContainers } from '../../../../../../state'
import type { Device } from '../../../../../../types'
import { getDeviceModel } from '../../../../../../utils/power-mode-utils'
import type { TimelineItemData } from '../../../../alarm/alarm-row/alarm-row'
import { BatchContainerControlsCard } from '../batch-container-controls-card'

import { useSelector } from 'react-redux'
import { ContainerControlsBox } from '../../../../container'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}))

vi.mock('../../../../../../state', () => ({
  selectSelectedContainers: vi.fn(),
}))

vi.mock('../../../../../../utils/power-mode-utils', () => ({
  getDeviceModel: vi.fn(),
}))

vi.mock('../../../../container', () => ({
  ContainerControlsBox: vi.fn(({ data, isBatch, isCompact, alarmsDataItems, onNavigate }) => (
    <div
      data-testid="container-controls-box"
      data-type={data?.type}
      data-is-batch={String(isBatch)}
      data-is-compact={String(isCompact)}
      data-alarms-count={alarmsDataItems?.length ?? 0}
      data-has-navigate={String(typeof onNavigate === 'function')}
    />
  )),
}))

vi.mock('../../../../container/content-box/content-box', () => ({
  ContentBox: vi.fn(({ children, title }) => (
    <div data-testid="content-box" data-title={title}>
      {children}
    </div>
  )),
}))

const makeDevice = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'device-001',
    type: 't-bitdeer',
    info: { container: 'CON-BTD-01', pos: 'A1' },
    ...overrides,
  }) as Device

const makeAlarmItem = (overrides: Partial<TimelineItemData['item']> = {}): TimelineItemData => ({
  item: {
    title: 'High Temperature',
    subtitle: 'Container CON-BTD-01',
    body: 'Triggered at 14:00:00|Threshold exceeded',
    uuid: 'uuid-001',
    status: 'critical',
    ...overrides,
  },
  dot: null,
  children: null,
})

const setSelectedContainers = (containers: Record<string, Device>) => {
  vi.mocked(useSelector).mockImplementation((selector) => {
    if (selector === selectSelectedContainers) return containers
    return {}
  })
}

describe('BatchContainerControlsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSelectedContainers({})
    vi.mocked(getDeviceModel).mockReturnValue('Model-A')
  })

  describe('rendering', () => {
    it('renders root container with correct class', () => {
      const { container } = render(<BatchContainerControlsCard />)
      expect(container.querySelector('.mdk-batch-container-controls-card')).toBeInTheDocument()
    })

    it('renders ContentBox', () => {
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('content-box')).toBeInTheDocument()
    })

    it('renders controls wrapper with correct class', () => {
      const { container } = render(<BatchContainerControlsCard />)
      expect(
        container.querySelector('.mdk-batch-container-controls-card__controls'),
      ).toBeInTheDocument()
    })

    it('renders ContainerControlsBox', () => {
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toBeInTheDocument()
    })
  })

  describe('ContentBox title', () => {
    it('renders Batch Container Controls title when isBatch is true', () => {
      render(<BatchContainerControlsCard isBatch={true} />)
      expect(screen.getByTestId('content-box')).toHaveAttribute(
        'data-title',
        'Batch Container Controls',
      )
    })

    it('renders Container Controls title when isBatch is false', () => {
      render(<BatchContainerControlsCard isBatch={false} />)
      expect(screen.getByTestId('content-box')).toHaveAttribute('data-title', 'Container Controls')
    })

    it('renders Batch Container Controls title when isBatch is undefined (default)', () => {
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('content-box')).toHaveAttribute(
        'data-title',
        'Batch Container Controls',
      )
    })
  })

  describe('isBatch prop passthrough', () => {
    it('passes isBatch=true to ContainerControlsBox', () => {
      render(<BatchContainerControlsCard isBatch={true} />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-is-batch', 'true')
    })

    it('passes isBatch=false to ContainerControlsBox', () => {
      render(<BatchContainerControlsCard isBatch={false} />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-is-batch', 'false')
    })

    it('passes isBatch=true to ContainerControlsBox when undefined (default)', () => {
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-is-batch', 'true')
    })
  })

  describe('isCompact prop passthrough', () => {
    it('passes isCompact=true to ContainerControlsBox', () => {
      render(<BatchContainerControlsCard isCompact={true} />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute(
        'data-is-compact',
        'true',
      )
    })

    it('passes isCompact=false to ContainerControlsBox', () => {
      render(<BatchContainerControlsCard isCompact={false} />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute(
        'data-is-compact',
        'false',
      )
    })

    it('passes isCompact=undefined to ContainerControlsBox when not provided', () => {
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute(
        'data-is-compact',
        'undefined',
      )
    })
  })

  describe('alarmsDataItems prop passthrough', () => {
    it('passes alarmsDataItems to ContainerControlsBox', () => {
      const alarms = [makeAlarmItem(), makeAlarmItem({ uuid: 'uuid-002' })]
      render(<BatchContainerControlsCard alarmsDataItems={alarms} />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-alarms-count', '2')
    })

    it('passes empty alarmsDataItems when not provided', () => {
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-alarms-count', '0')
    })

    it('passes single alarm item correctly', () => {
      render(<BatchContainerControlsCard alarmsDataItems={[makeAlarmItem()]} />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-alarms-count', '1')
    })
  })

  describe('onNavigate prop passthrough', () => {
    it('passes provided onNavigate to ContainerControlsBox', () => {
      const onNavigate = vi.fn()
      render(<BatchContainerControlsCard onNavigate={onNavigate} />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute(
        'data-has-navigate',
        'true',
      )
    })

    it('passes fallback onNavigate when not provided', () => {
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute(
        'data-has-navigate',
        'true',
      )
    })
  })

  describe('areAllSameModels', () => {
    it('returns true when only one device is selected', () => {
      const device = makeDevice({ type: 't-bitdeer' })
      setSelectedContainers({ [device.id]: device })
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-type', 't-bitdeer')
    })

    it('returns true when all devices have the same model', () => {
      vi.mocked(getDeviceModel).mockReturnValue('Model-A')
      const device1 = makeDevice({ id: 'device-1', type: 't-bitdeer' })
      const device2 = makeDevice({ id: 'device-2', type: 't-bitdeer' })
      setSelectedContainers({ [device1.id]: device1, [device2.id]: device2 })
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-type', 't-bitdeer')
    })

    it('calls getDeviceModel for each device when multiple selected', () => {
      const device1 = makeDevice({ id: 'device-1' })
      const device2 = makeDevice({ id: 'device-2' })
      const device3 = makeDevice({ id: 'device-3' })
      setSelectedContainers({
        [device1.id]: device1,
        [device2.id]: device2,
        [device3.id]: device3,
      })
      render(<BatchContainerControlsCard />)
      expect(vi.mocked(getDeviceModel)).toHaveBeenCalledTimes(3)
    })

    it('does not call getDeviceModel when no devices selected', () => {
      setSelectedContainers({})
      render(<BatchContainerControlsCard />)
      expect(vi.mocked(getDeviceModel)).not.toHaveBeenCalled()
    })

    it('does not call getDeviceModel when only one device selected', () => {
      const device = makeDevice()
      setSelectedContainers({ [device.id]: device })
      render(<BatchContainerControlsCard />)
      expect(vi.mocked(getDeviceModel)).not.toHaveBeenCalled()
    })
  })

  describe('controlsBoxData', () => {
    it('passes only type when multiple devices selected', () => {
      const device1 = makeDevice({ id: 'device-1', type: 't-bitdeer' })
      const device2 = makeDevice({ id: 'device-2', type: 't-bitdeer' })
      setSelectedContainers({ [device1.id]: device1, [device2.id]: device2 })
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute('data-type', 't-bitdeer')
    })

    it('spreads single device data into controlsBoxData', () => {
      const device = makeDevice({ id: 'device-1', type: 't-antspace-hydro' })
      setSelectedContainers({ [device.id]: device })
      render(<BatchContainerControlsCard />)
      expect(screen.getByTestId('container-controls-box')).toHaveAttribute(
        'data-type',
        't-antspace-hydro',
      )
    })

    it('passes connectedMiners into controlsBoxData when single device selected', () => {
      const device = makeDevice()
      const connectedMiners = [{ id: 'miner-1' }]
      setSelectedContainers({ [device.id]: device })
      render(<BatchContainerControlsCard connectedMiners={connectedMiners} />)
      expect(ContainerControlsBox).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ connectedMiners }),
        }),
        expect.anything(),
      )
    })

    it('does not pass connectedMiners when multiple devices selected', () => {
      const device1 = makeDevice({ id: 'device-1' })
      const device2 = makeDevice({ id: 'device-2' })
      const connectedMiners = [{ id: 'miner-1' }]
      setSelectedContainers({ [device1.id]: device1, [device2.id]: device2 })
      render(<BatchContainerControlsCard connectedMiners={connectedMiners} />)
      expect(ContainerControlsBox).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ connectedMiners }),
        }),
        expect.anything(),
      )
    })
  })

  describe('selector', () => {
    it('calls useSelector with selectSelectedContainers', () => {
      render(<BatchContainerControlsCard />)
      expect(vi.mocked(useSelector)).toHaveBeenCalledWith(selectSelectedContainers)
    })

    it('handles empty selectedContainers gracefully', () => {
      setSelectedContainers({})
      expect(() => render(<BatchContainerControlsCard />)).not.toThrow()
    })

    it('converts selectedContainers record values to Device array', () => {
      const device1 = makeDevice({ id: 'device-1', type: 't-bitdeer' })
      const device2 = makeDevice({ id: 'device-2', type: 't-bitdeer' })
      setSelectedContainers({ [device1.id]: device1, [device2.id]: device2 })
      render(<BatchContainerControlsCard />)
      expect(vi.mocked(getDeviceModel)).toHaveBeenCalledWith(device1)
    })
  })
})
