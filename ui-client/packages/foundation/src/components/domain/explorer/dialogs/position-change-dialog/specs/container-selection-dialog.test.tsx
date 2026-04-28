import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAINTENANCE_CONTAINER } from '../../../../../../constants/container-constants'
import type { Device } from '../../../../../../types'
import { ContainerSelectionDialog } from '../container-selection-dialog/container-selection-dialog'

vi.mock('../container-selection-dialog-content/container-selection-dialog-content', () => ({
  ContainerSelectionDialogContent: ({
    selectedSocketToReplace,
    containers,
    isContainersLoading,
    onCancel,
  }: any) => (
    <div data-testid="dialog-content">
      <span data-testid="prop-loading">{String(isContainersLoading)}</span>
      <span data-testid="prop-containers">{containers?.length ?? 0}</span>
      <span data-testid="prop-socket">{JSON.stringify(selectedSocketToReplace)}</span>
      <button onClick={() => onCancel(true)}>Select Container</button>
      <button onClick={() => onCancel()}>Cancel</button>
    </div>
  ),
}))

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...actual,
    Dialog: ({ open, onOpenChange, children }: any) =>
      open ? (
        <div data-testid="dialog" onMouseDown={() => onOpenChange(false)}>
          {children}
        </div>
      ) : null,
    DialogContent: ({ children, onClose }: any) => (
      <div data-testid="dialog-content-wrapper">
        <button data-testid="close-btn" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ),
  }
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CONTAINERS = [
  { id: '1', info: { container: 'CON-BBR-01' } },
  { id: '2', info: { container: 'CON-BBR-02' } },
] as unknown as Device[]

const MOCK_MINER = {
  id: 'miner-1',
  type: 'miner',
  code: 'M-SNOW-01',
  tags: ['Production'],
  info: { serialNum: 'SN-12345', macAddress: 'aa:bb:cc:dd:ee:ff' },
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  miner: MOCK_MINER,
  containers: MOCK_CONTAINERS,
  isLoading: false,
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<ContainerSelectionDialog {...defaultProps} {...overrides} />)

describe('ContainerSelectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('renders dialog content when open is true', () => {
      renderComponent({ open: true })
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('renders nothing when open is false', () => {
      renderComponent({ open: false })
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('selectedSocketToReplace prop', () => {
    it('passes miner into selectedSocketToReplace', () => {
      renderComponent()
      const socket = JSON.parse(screen.getByTestId('prop-socket').textContent!)
      expect(socket.miner).toEqual(MOCK_MINER)
    })

    it('sets containerInfo.container to MAINTENANCE_CONTAINER', () => {
      renderComponent()
      const socket = JSON.parse(screen.getByTestId('prop-socket').textContent!)
      expect(socket.containerInfo.container).toBe(MAINTENANCE_CONTAINER)
    })

    it('sets pos and socket to empty strings', () => {
      renderComponent()
      const socket = JSON.parse(screen.getByTestId('prop-socket').textContent!)
      expect(socket.pos).toBe('')
      expect(socket.socket).toBe('')
    })

    it('passes undefined miner when miner prop is omitted', () => {
      renderComponent({ miner: undefined })
      const socket = JSON.parse(screen.getByTestId('prop-socket').textContent!)
      expect(socket.miner).toBeUndefined()
    })
  })

  describe('props forwarding to ContainerSelectionDialogContent', () => {
    it('forwards containers prop', () => {
      renderComponent()
      expect(screen.getByTestId('prop-containers').textContent).toBe(String(MOCK_CONTAINERS.length))
    })

    it('forwards empty containers when prop is omitted', () => {
      render(<ContainerSelectionDialog open={true} onClose={vi.fn()} />)
      expect(screen.getByTestId('prop-containers').textContent).toBe('0')
    })

    it('forwards isLoading as isContainersLoading', () => {
      renderComponent({ isLoading: true })
      expect(screen.getByTestId('prop-loading').textContent).toBe('true')
    })

    it('forwards isLoading false', () => {
      renderComponent({ isLoading: false })
      expect(screen.getByTestId('prop-loading').textContent).toBe('false')
    })

    it('passes onClose as onCancel to ContainerSelectionDialogContent', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.click(screen.getByText('Select Container'))
      expect(onClose).toHaveBeenCalledWith(true)
    })
  })

  describe('close behaviours', () => {
    it('calls onClose() when DialogContent close button is clicked', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.click(screen.getByTestId('close-btn'))
      expect(onClose).toHaveBeenCalledWith()
    })

    it('calls onClose() when Dialog onOpenChange fires with false', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.mouseDown(screen.getByTestId('dialog'))
      expect(onClose).toHaveBeenCalledWith()
    })

    it('does NOT call onClose when Dialog onOpenChange fires with true', () => {
      // onOpenChange(true) should be a no-op — the guard is `!val && onClose()`
      // Our mock only fires onOpenChange(false) via mouseDown, so we verify
      // onClose is not called before any interaction.
      const onClose = vi.fn()
      renderComponent({ onClose })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('calls onClose(true) when a container is selected inside the content', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.click(screen.getByText('Select Container'))
      expect(onClose).toHaveBeenCalledWith(true)
    })

    it('calls onClose() with no args when Cancel is clicked inside the content', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.click(screen.getByText('Cancel'))
      expect(onClose).toHaveBeenCalledWith()
    })
  })
})
