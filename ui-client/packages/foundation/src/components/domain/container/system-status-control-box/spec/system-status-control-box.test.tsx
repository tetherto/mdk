import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Device } from '../../../../../types'
import { getContainerSpecificStats } from '../../../../../utils/device-utils'
import { SystemStatusControlBox } from '../system-status-control-box'

vi.mock('../../../../../utils/device-utils', () => ({
  getContainerSpecificStats: vi.fn(),
}))

vi.mock('../../content-box/content-box', () => ({
  ContentBox: vi.fn(({ children, title, className }) => (
    <div data-testid="content-box" data-title={title} className={className}>
      {children}
    </div>
  )),
}))

vi.mock('../system-status-control-box.scss', () => ({}))

const makeDevice = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'device-001',
    type: 't-antspace-immersion',
    ...overrides,
  }) as Device

describe('SystemStatusControlBox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ContentBox', () => {
    it('renders ContentBox with System Status title', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({})
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByTestId('content-box')).toHaveAttribute('data-title', 'System Status')
    })

    it('renders ContentBox with correct className', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({})
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByTestId('content-box')).toHaveClass('mdk-system-status-control-box')
    })

    it('calls getContainerSpecificStats with the device', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({})
      const device = makeDevice()
      render(<SystemStatusControlBox data={device} />)
      expect(vi.mocked(getContainerSpecificStats)).toHaveBeenCalledWith(device)
    })

    it('calls getContainerSpecificStats exactly once', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({})
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(vi.mocked(getContainerSpecificStats)).toHaveBeenCalledTimes(1)
    })
  })

  describe('server_on', () => {
    it('renders Allow Server Start when serverOn is true', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ server_on: true })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Allow Server Start')).toBeInTheDocument()
    })

    it('does not render Allow Server Start when serverOn is false', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ server_on: false })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Allow Server Start')).not.toBeInTheDocument()
    })

    it('does not render Allow Server Start when serverOn is undefined', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ server_on: undefined })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Allow Server Start')).not.toBeInTheDocument()
    })

    it('does not render Allow Server Start when containerSpecific is empty', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({})
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Allow Server Start')).not.toBeInTheDocument()
    })

    it('renders Allow Server Start with correct class', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ server_on: true })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Allow Server Start')).toHaveClass(
        'mdk-system-status-control-box__started-option',
      )
    })
  })

  describe('disconnect', () => {
    it('renders Disconnected when disconnect is true', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: true })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })

    it('renders Connected when disconnect is false', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: false })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('renders Connected when disconnect is undefined', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: undefined })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('renders Connected when containerSpecific is empty', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({})
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('does not render Connected when disconnect is true', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: true })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Connected')).not.toBeInTheDocument()
    })

    it('does not render Disconnected when disconnect is false', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: false })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument()
    })

    it('renders Disconnected with correct class', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: true })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Disconnected')).toHaveClass(
        'mdk-system-status-control-box__current-status',
      )
    })

    it('renders Connected with correct class', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: false })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Connected')).toHaveClass(
        'mdk-system-status-control-box__started-option',
      )
    })
  })

  describe('combined states', () => {
    it('renders Allow Server Start and Connected when serverOn=true and disconnect=false', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({
        server_on: true,
        disconnect: false,
      })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Allow Server Start')).toBeInTheDocument()
      expect(screen.getByText('Connected')).toBeInTheDocument()
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument()
    })

    it('renders Allow Server Start and Disconnected when serverOn=true and disconnect=true', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({
        server_on: true,
        disconnect: true,
      })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.getByText('Allow Server Start')).toBeInTheDocument()
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
      expect(screen.queryByText('Connected')).not.toBeInTheDocument()
    })

    it('renders only Connected when serverOn=false and disconnect=false', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({
        server_on: false,
        disconnect: false,
      })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Allow Server Start')).not.toBeInTheDocument()
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('renders only Disconnected when serverOn=false and disconnect=true', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({
        server_on: false,
        disconnect: true,
      })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Allow Server Start')).not.toBeInTheDocument()
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })

    it('renders only Connected when containerSpecific returns null', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue(null)
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Allow Server Start')).not.toBeInTheDocument()
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('renders only Connected when containerSpecific returns undefined', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue(undefined)
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Allow Server Start')).not.toBeInTheDocument()
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })
  })

  describe('mutual exclusivity', () => {
    it('never renders both Connected and Disconnected at the same time', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: true })
      render(<SystemStatusControlBox data={makeDevice()} />)
      expect(screen.queryByText('Connected')).not.toBeInTheDocument()
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })

    it('always renders exactly one of Connected or Disconnected', () => {
      vi.mocked(getContainerSpecificStats).mockReturnValue({ disconnect: false })
      render(<SystemStatusControlBox data={makeDevice()} />)
      const connected = screen.queryAllByText('Connected')
      const disconnected = screen.queryAllByText('Disconnected')
      expect(connected.length + disconnected.length).toBe(1)
    })
  })
})
