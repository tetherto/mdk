import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types'
import { ContainerSelectionDialogContent } from '../container-selection-dialog-content/container-selection-dialog-content'

vi.mock('../../../../../../utils/container-utils', () => ({
  getContainerName: vi.fn((name: string) => `Container: ${name}`),
}))

vi.mock('../../../../../../utils/device-utils', () => ({
  getMinerShortCode: vi.fn((code: string, tags: string[]) =>
    tags.length ? `${code} [${tags.join(', ')}]` : code,
  ),
}))

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...actual,
    Spinner: () => <div data-testid="spinner" />,
  }
})

const MOCK_CONTAINERS = [
  { id: '1', info: { container: 'CON-BBR-01' } },
  { id: '2', info: { container: 'CON-BBR-02' } },
  { id: '3', info: { container: 'CON-BBR-03' } },
] as unknown as Device[]

const defaultSocket = {
  miner: {
    code: 'M-SNOW-01',
    tags: ['Production'],
    info: {
      serialNum: 'SN-12345',
      macAddress: 'aa:bb:cc:dd:ee:ff',
    },
  },
}

const defaultProps = {
  onCancel: vi.fn(),
  selectedSocketToReplace: defaultSocket,
  containers: MOCK_CONTAINERS,
  isContainersLoading: false,
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<ContainerSelectionDialogContent {...defaultProps} {...overrides} />)

describe('ContainerSelectionDialogContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('renders Spinner when isContainersLoading is true', () => {
      renderComponent({ isContainersLoading: true })
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })

    it('does not render Spinner when isContainersLoading is false', () => {
      renderComponent({ isContainersLoading: false })
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
    })

    it('does not render Spinner by default', () => {
      renderComponent()
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
    })
  })

  describe('miner info header', () => {
    it('renders the Code label', () => {
      renderComponent()
      expect(screen.getByText('Code:')).toBeInTheDocument()
    })

    it('renders short code via getMinerShortCode', () => {
      renderComponent()
      expect(screen.getByText('M-SNOW-01 [Production]')).toBeInTheDocument()
    })

    it('renders the SN label', () => {
      renderComponent()
      expect(screen.getByText('SN:')).toBeInTheDocument()
    })

    it('renders the serial number', () => {
      renderComponent()
      expect(screen.getByText('SN-12345')).toBeInTheDocument()
    })

    it('renders the MAC label', () => {
      renderComponent()
      expect(screen.getByText('MAC:')).toBeInTheDocument()
    })

    it('renders the MAC address uppercased', () => {
      renderComponent()
      expect(screen.getByText('AA:BB:CC:DD:EE:FF')).toBeInTheDocument()
    })
  })

  describe('container list', () => {
    it('renders a button for each container passed via prop', () => {
      renderComponent()
      const buttons = screen.getAllByRole('button', { name: /container:/i })
      expect(buttons).toHaveLength(MOCK_CONTAINERS.length)
    })

    it('renders container names via getContainerName', () => {
      renderComponent()
      expect(screen.getByText('Container: CON-BBR-01')).toBeInTheDocument()
      expect(screen.getByText('Container: CON-BBR-02')).toBeInTheDocument()
      expect(screen.getByText('Container: CON-BBR-03')).toBeInTheDocument()
    })

    it('renders no container buttons when containers prop is empty', () => {
      renderComponent({ containers: [] })
      expect(screen.queryAllByRole('button', { name: /container:/i })).toHaveLength(0)
    })

    it('renders no container buttons when containers prop is omitted', () => {
      render(
        <ContainerSelectionDialogContent
          onCancel={vi.fn()}
          selectedSocketToReplace={defaultSocket}
        />,
      )
      expect(screen.queryAllByRole('button', { name: /container:/i })).toHaveLength(0)
    })

    it('calls onCancel(true) when a container button is clicked', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByText('Container: CON-BBR-01'))
      expect(onCancel).toHaveBeenCalledWith(true)
    })

    it('calls onCancel(true) for each container button independently', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByText('Container: CON-BBR-02'))
      fireEvent.click(screen.getByText('Container: CON-BBR-03'))
      expect(onCancel).toHaveBeenCalledTimes(2)
      expect(onCancel).toHaveBeenNthCalledWith(1, true)
      expect(onCancel).toHaveBeenNthCalledWith(2, true)
    })

    it('renders only the provided containers when a single container is passed', () => {
      renderComponent({ containers: [{ id: '99', info: { container: 'CON-SOLO-01' } }] })
      expect(screen.getByText('Container: CON-SOLO-01')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /container:/i })).toHaveLength(1)
    })
  })

  describe('footer cancel button', () => {
    it('renders the Cancel button', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('calls onCancel() with no arguments when Cancel is clicked', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(onCancel).toHaveBeenCalledWith()
    })

    it('does not call onCancel with true when Cancel is clicked', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(onCancel).not.toHaveBeenCalledWith(true)
    })
  })
})
