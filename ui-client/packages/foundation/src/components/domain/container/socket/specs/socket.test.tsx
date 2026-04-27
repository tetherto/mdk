import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HEATMAP_MODE } from '../../../../../constants/temperature-constants'
import { SOCKET_STATUSES } from '../../../../../utils/status-utils'
import { Socket } from '../socket'

import { getPowerModeColor, getTemperatureColor } from '../../../../../utils/device-utils'
import { getHeatmapDisplayValue, getHeatmapTooltipText, getSocketStatus } from '../socket-utils'

vi.mock('../../../../../hooks/use-timezone', () => ({
  useTimezone: () => ({ getFormattedDate: vi.fn(() => '2024-01-01 12:00') }),
}))

vi.mock('../../../../../utils/device-utils', () => ({
  getHashrateString: vi.fn((v: number) => `${v} TH/s`),
  getPowerModeColor: vi.fn(() => '#ff0000'),
  getTemperatureColor: vi.fn(() => '#e74c3c'),
}))

vi.mock('../../../../../utils/status-utils', () => ({
  SOCKET_STATUSES: {
    MINER_DISCONNECTED: 'miner_disconnected',
    CONNECTING: 'connecting',
    ONLINE: 'online',
    OFFLINE: 'offline',
  },
  getSocketStatus: vi.fn(() => 'online'),
}))

vi.mock('../socket-utils', () => ({
  getHeatmapDisplayValue: vi.fn(() => '72°C'),
  getHeatmapTooltipText: vi.fn(() => 'tooltip text'),
  getSocketStatus: vi.fn(() => 'online'),
}))

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...actual,
    SimpleTooltip: ({ children }: any) => <>{children}</>,
    FanIcon: () => <svg data-testid="fan-icon" />,
    formatValueUnit: vi.fn((value: number, unit: string) => `${value}${unit}`),
    unitToKilo: vi.fn((v: number) => v / 1000),
    UNITS: { POWER_KW: 'kW' },
  }
})

const onlineMiner = {
  id: 'miner-1',
  snap: {
    stats: { hashrate_mhs: { t_5m: 110 } },
    config: { power_mode: 'normal', led_status: false },
  },
  last: {},
  temperature: { chip: 72 },
}

const defaultProps = {
  socket: 1,
  enabled: true,
  power_w: 3250,
  current_a: 14.5,
  miner: onlineMiner,
  pdu: { pdu: 'pdu-1' },
}

const renderComponent = (overrides: Partial<typeof defaultProps> & Record<string, any> = {}) =>
  render(<Socket {...defaultProps} {...overrides} />)

describe('Socket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSocketStatus).mockReturnValue('online' as any)
  })

  describe('root element attributes', () => {
    it('sets data-socket-index from socket prop', () => {
      const { container } = renderComponent()
      expect(container.querySelector('[data-socket-index="1"]')).toBeInTheDocument()
    })

    it('sets data-pdu-index from pdu.pdu prop', () => {
      const { container } = renderComponent()
      expect(container.querySelector('[data-pdu-index="pdu-1"]')).toBeInTheDocument()
    })

    it('does not set data-socket-index when socket is null', () => {
      const { container } = renderComponent({ socket: null })
      expect(container.querySelector('[data-socket-index]')).not.toBeInTheDocument()
    })

    it('does not set data-pdu-index when pdu.pdu is null', () => {
      const { container } = renderComponent({ pdu: { pdu: null } })
      expect(container.querySelector('[data-pdu-index]')).not.toBeInTheDocument()
    })

    it('sets data-status from computed status', () => {
      const { container } = renderComponent()
      expect(container.querySelector('[data-status="online"]')).toBeInTheDocument()
    })

    it('sets data-enabled from enabled prop', () => {
      const { container } = renderComponent({ enabled: true })
      expect(container.querySelector('[data-enabled="true"]')).toBeInTheDocument()
    })
  })

  describe('CSS class modifiers', () => {
    it('applies mdk-socket--selected when selected is true', () => {
      const { container } = renderComponent({ selected: true })
      expect(container.querySelector('.mdk-socket--selected')).toBeInTheDocument()
    })

    it('does not apply mdk-socket--selected when selected is false', () => {
      const { container } = renderComponent({ selected: false })
      expect(container.querySelector('.mdk-socket--selected')).not.toBeInTheDocument()
    })

    it('applies mdk-socket--disabled when clickDisabled is true', () => {
      const { container } = renderComponent({ clickDisabled: true })
      expect(container.querySelector('.mdk-socket--disabled')).toBeInTheDocument()
    })

    it('applies mdk-socket--heatmap when isHeatmapMode is true', () => {
      const { container } = renderComponent({ heatmap: { isHeatmapMode: true, mode: 'chip' } })
      expect(container.querySelector('.mdk-socket--heatmap')).toBeInTheDocument()
    })

    it('applies mdk-socket--has-cooling when cooling is a boolean', () => {
      const { container } = renderComponent({ cooling: true })
      expect(container.querySelector('.mdk-socket--has-cooling')).toBeInTheDocument()
    })

    it('does not apply mdk-socket--has-cooling when cooling is undefined', () => {
      const { container } = renderComponent({ cooling: undefined })
      expect(container.querySelector('.mdk-socket--has-cooling')).not.toBeInTheDocument()
    })
  })

  describe('inline styles', () => {
    it('sets backgroundColor from getTemperatureColor in heatmap mode', () => {
      vi.mocked(getTemperatureColor).mockReturnValue('#e74c3c')
      const { container } = renderComponent({
        heatmap: { isHeatmapMode: true, mode: 'chip', ranges: { chip: { min: 0, max: 100 } } },
      })
      const socket = container.querySelector('.mdk-socket') as HTMLElement
      expect(socket.style.backgroundColor).toBe('#e74c3c')
    })

    it('sets borderColor from getPowerModeColor when powerMode is set', () => {
      vi.mocked(getPowerModeColor).mockReturnValue('#ff0000')
      const { container } = renderComponent()
      const socket = container.querySelector('.mdk-socket') as HTMLElement
      expect(socket.style.borderColor).toBe('#ff0000')
    })

    it('does not set backgroundColor when not in heatmap mode', () => {
      const { container } = renderComponent({ heatmap: null })
      const socket = container.querySelector('.mdk-socket') as HTMLElement
      expect(socket.style.backgroundColor).toBe('')
    })
  })

  describe('heatmap mode', () => {
    it('renders heatmap display value when isHeatmapMode is true', () => {
      vi.mocked(getHeatmapDisplayValue).mockReturnValue('72°C')
      renderComponent({ heatmap: { isHeatmapMode: true, mode: 'chip' } })
      expect(screen.getByText('72°C')).toBeInTheDocument()
    })

    it('does not render power/current values in heatmap mode', () => {
      renderComponent({ heatmap: { isHeatmapMode: true, mode: 'chip' } })
      expect(screen.queryByText(/kW/i)).not.toBeInTheDocument()
    })
  })

  describe('normal mode — power and current display', () => {
    it('renders power value when miner is connected', () => {
      renderComponent()
      expect(screen.getByText(/kW/i)).toBeInTheDocument()
    })

    it('renders current value when miner is connected', () => {
      renderComponent()
      expect(screen.getByText(/14\.5A/)).toBeInTheDocument()
    })

    it('renders socket index', () => {
      renderComponent({ socket: 5 })
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('empty socket state', () => {
    beforeEach(() => {
      vi.mocked(getSocketStatus).mockReturnValue(SOCKET_STATUSES.MINER_DISCONNECTED as any)
    })

    it('renders "Empty" text when enabled and miner disconnected and not in edit flow', () => {
      renderComponent({ miner: null, enabled: true, isEditFlow: false })
      expect(screen.getByText('Empty')).toBeInTheDocument()
    })

    it('does not render "Empty" text when in edit flow', () => {
      renderComponent({ miner: null, enabled: true, isEditFlow: true })
      expect(screen.queryByText('Empty')).not.toBeInTheDocument()
    })

    it('does not render "Empty" when disabled', () => {
      renderComponent({ miner: null, enabled: false, isEditFlow: false })
      expect(screen.queryByText('Empty')).not.toBeInTheDocument()
    })

    it('does not render power/current when miner disconnected and enabled', () => {
      renderComponent({ miner: null, enabled: true })
      expect(screen.queryByText(/kW/i)).not.toBeInTheDocument()
    })
  })

  describe('edit flow', () => {
    beforeEach(() => {
      vi.mocked(getSocketStatus).mockReturnValue(SOCKET_STATUSES.MINER_DISCONNECTED as any)
    })

    it('renders add icon when in edit flow and miner is disconnected', () => {
      const { container } = renderComponent({ miner: null, isEditFlow: true })
      expect(container.querySelector('.mdk-socket__add-icon')).toBeInTheDocument()
    })

    it('does not render add icon when not in edit flow', () => {
      const { container } = renderComponent({ miner: null, isEditFlow: false })
      expect(container.querySelector('.mdk-socket__add-icon')).not.toBeInTheDocument()
    })
  })

  describe('connecting state', () => {
    it('renders clock icon when status is CONNECTING', () => {
      vi.mocked(getSocketStatus).mockReturnValue(SOCKET_STATUSES.CONNECTING as any)
      const { container } = renderComponent()
      expect(container.querySelector('.mdk-socket__connection-icon')).toBeInTheDocument()
    })

    it('does not render clock icon when status is not CONNECTING', () => {
      vi.mocked(getSocketStatus).mockReturnValue('online' as any)
      const { container } = renderComponent()
      expect(container.querySelector('.mdk-socket__connection-icon')).not.toBeInTheDocument()
    })
  })

  describe('cooling', () => {
    it('renders fan icon when cooling is a boolean', () => {
      renderComponent({ cooling: true })
      expect(screen.getByTestId('fan-icon')).toBeInTheDocument()
    })

    it('applies fan-on class when cooling is true', () => {
      const { container } = renderComponent({ cooling: true })
      expect(container.querySelector('.mdk-socket__fan-icon--on')).toBeInTheDocument()
    })

    it('does not apply fan-on class when cooling is false', () => {
      const { container } = renderComponent({ cooling: false })
      expect(container.querySelector('.mdk-socket__fan-icon--on')).not.toBeInTheDocument()
    })

    it('does not render fan icon when cooling is undefined', () => {
      renderComponent({ cooling: undefined })
      expect(screen.queryByTestId('fan-icon')).not.toBeInTheDocument()
    })

    it('does not show Empty text when cooling is present', () => {
      vi.mocked(getSocketStatus).mockReturnValue(SOCKET_STATUSES.MINER_DISCONNECTED as any)
      renderComponent({ miner: null, enabled: true, cooling: false })
      expect(screen.queryByText('Empty')).not.toBeInTheDocument()
    })
  })

  describe('tooltip', () => {
    it('calls getHeatmapTooltipText with correct params', () => {
      renderComponent()
      expect(getHeatmapTooltipText).toHaveBeenCalledWith(
        expect.objectContaining({
          isHeatmapMode: false,
          enabled: true,
        }),
      )
    })
  })

  describe('miner absent', () => {
    it('uses MINER_DISCONNECTED status when miner is null', () => {
      const { container } = renderComponent({ miner: null })
      expect(
        container.querySelector(`[data-status="${SOCKET_STATUSES.MINER_DISCONNECTED}"]`),
      ).toBeInTheDocument()
    })

    it('does not call getSocketStatus when miner is null', () => {
      renderComponent({ miner: null })
      expect(getSocketStatus).not.toHaveBeenCalled()
    })
  })

  describe('hashrate in heatmap mode', () => {
    it('uses hashrate value when mode is HASHRATE', () => {
      renderComponent({
        heatmap: {
          isHeatmapMode: true,
          mode: HEATMAP_MODE.HASHRATE,
          ranges: { [HEATMAP_MODE.HASHRATE]: { min: 0, max: 200 } },
        },
      })
      expect(getTemperatureColor).toHaveBeenCalledWith(0, 200, 110)
    })
  })

  describe('defaults', () => {
    it('renders without crashing with no props', () => {
      expect(() => render(<Socket />)).not.toThrow()
    })

    it('renders socket index 0 correctly', () => {
      renderComponent({ socket: 0 })
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })
})
