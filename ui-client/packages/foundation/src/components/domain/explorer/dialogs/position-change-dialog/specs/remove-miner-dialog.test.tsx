import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../../../../../types'
import { RemoveMinerDialog } from '../remove-miner-dialog/remove-miner-dialog'

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
    DialogContent: ({ title, onClose, children }: any) => (
      <div data-testid="dialog-content">
        <span data-testid="dialog-title">{title}</span>
        <button data-testid="close-btn" onClick={onClose} />
        {children}
      </div>
    ),
  }
})

vi.mock('../remove-miner-dialog/remove-miner-dialog-content', () => ({
  RemoveMinerDialogContent: ({ selectedEditSocket, onCancel }: any) => (
    <div data-testid="remove-miner-content">
      <span data-testid="prop-socket">{JSON.stringify(selectedEditSocket)}</span>
      <button data-testid="inner-cancel-btn" onClick={onCancel}>
        cancel
      </button>
    </div>
  ),
}))

const mockDevice = {
  id: 'miner-1',
  rack: 'rack-001',
  code: 'M-SNOW-01',
  info: {
    pos: 'A1',
    container: 'CON-BBR-01',
    serialNum: 'SN-12345',
  },
} as unknown as Device

const defaultProps = {
  isRemoveMinerFlow: true,
  onCancel: vi.fn(),
  headDevice: mockDevice,
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<RemoveMinerDialog {...defaultProps} {...overrides} />)

describe('RemoveMinerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('renders when isRemoveMinerFlow is true', () => {
      renderComponent()
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('renders nothing when isRemoveMinerFlow is false', () => {
      renderComponent({ isRemoveMinerFlow: false })
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('dialog title', () => {
    it('renders the correct title', () => {
      renderComponent()
      expect(screen.getByTestId('dialog-title').textContent).toBe(
        'Are you sure to permanently remove miner?',
      )
    })
  })

  describe('selectedEditSocket construction', () => {
    it('sets miner to headDevice', () => {
      renderComponent()
      const socket = JSON.parse(screen.getByTestId('prop-socket').textContent!)
      expect(socket.miner).toEqual(mockDevice)
    })

    it('sets containerInfo to headDevice.info', () => {
      renderComponent()
      const socket = JSON.parse(screen.getByTestId('prop-socket').textContent!)
      expect(socket.containerInfo).toEqual(mockDevice.info)
    })

    it('sets pos to headDevice.info.pos', () => {
      renderComponent()
      const socket = JSON.parse(screen.getByTestId('prop-socket').textContent!)
      expect(socket.pos).toBe(mockDevice.info.pos)
    })

    it('uses empty object as headDevice default when prop is omitted', () => {
      render(<RemoveMinerDialog isRemoveMinerFlow={true} onCancel={vi.fn()} />)
      const socket = JSON.parse(screen.getByTestId('prop-socket').textContent!)
      expect(socket.miner).toEqual({})
      expect(socket.containerInfo).toBeUndefined()
      expect(socket.pos).toBeUndefined()
    })
  })

  describe('close / cancel behaviour', () => {
    it('calls onCancel when the DialogContent close button is clicked', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByTestId('close-btn'))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onCancel when Dialog onOpenChange fires with false', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.mouseDown(screen.getByTestId('dialog'))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onCancel when inner content cancel button is clicked', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      fireEvent.click(screen.getByTestId('inner-cancel-btn'))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('does not call onCancel before any interaction', () => {
      const onCancel = vi.fn()
      renderComponent({ onCancel })
      expect(onCancel).not.toHaveBeenCalled()
    })
  })
})
