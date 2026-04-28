import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAINTENANCE_CONTAINER } from '../../../../../../constants/container-constants'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../../constants/dialog'
import { PositionChangeDialog } from '../position-change-dialog'

import { getDeviceContainerPosText } from '../../../../../../utils/container-utils'
import { getMinerShortCode } from '../../../../../../utils/device-utils'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
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

vi.mock('../../../../../../utils/container-utils', () => ({
  getDeviceContainerPosText: vi.fn(() => 'CON-BBR-01 / A1'),
}))

vi.mock('../../../../../../utils/device-utils', () => ({
  getMinerShortCode: vi.fn(() => 'M-SNOW-01'),
}))

vi.mock('../position-change-dialog-content', () => ({
  PositionChangeDialogContent: ({
    currentDialogFlow,
    setCurrentDialogFlow,
    onCancel,
    onChangePositionClicked,
    onPositionChangedSuccess,
    isContainerEmpty,
  }: any) => (
    <div data-testid="dialog-body">
      <span data-testid="current-flow">{currentDialogFlow}</span>
      <span data-testid="is-container-empty">{String(isContainerEmpty)}</span>
      <button data-testid="set-flow-btn" onClick={() => setCurrentDialogFlow('new-flow')}>
        set flow
      </button>
      <button data-testid="cancel-btn" onClick={() => onCancel()}>
        cancel
      </button>
      <button data-testid="cancel-dont-reset-btn" onClick={() => onCancel(true)}>
        cancel no reset
      </button>
      <button data-testid="change-position-btn" onClick={onChangePositionClicked}>
        change position
      </button>
      <button data-testid="position-changed-btn" onClick={onPositionChangedSuccess}>
        position changed
      </button>
    </div>
  ),
}))

const withFlow = (dialogFlow: string) => ({
  open: true,
  onClose: vi.fn(),
  dialogFlow,
  selectedEditSocket: {
    miner: { code: 'M-SNOW-01', tags: ['Production'] },
    containerInfo: { container: 'CON-BBR-01' },
  },
})

const defaultProps = withFlow(POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE)

const renderComponent = (
  overrides: Partial<typeof defaultProps> & {
    selectedSocketToReplace?: any
    onChangePositionClicked?: any
    onPositionChangedSuccess?: any
    isContainerEmpty?: boolean
    dialogFlow?: string
  } = {},
) => render(<PositionChangeDialog {...defaultProps} {...overrides} />)

describe('PositionChangeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('renders dialog when open is true and title resolves', () => {
      renderComponent()
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('renders nothing when open is false', () => {
      renderComponent({ open: false })
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('renders nothing when currentDialogFlow is empty (title is null)', () => {
      renderComponent({ dialogFlow: '' })
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('renders nothing when dialogFlow is not provided', () => {
      renderComponent({ dialogFlow: undefined })
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('initial flow state', () => {
    it('initialises currentDialogFlow from dialogFlow prop', () => {
      renderComponent()
      expect(screen.getByTestId('current-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE,
      )
    })

    it('sets flow to CONFIRM_CHANGE_POSITION when both selectedSocketToReplace and selectedEditSocket are provided', () => {
      renderComponent({
        selectedSocketToReplace: {
          miner: { id: 'miner-2' },
          containerInfo: { container: 'CON-BBR-02' },
        },
      })
      expect(screen.getByTestId('current-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION,
      )
    })

    it('does not set CONFIRM_CHANGE_POSITION when selectedSocketToReplace is absent', () => {
      renderComponent({ selectedSocketToReplace: undefined })
      expect(screen.getByTestId('current-flow').textContent).not.toBe(
        POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION,
      )
    })
  })

  describe('dialogFlow prop sync', () => {
    it('updates currentDialogFlow when dialogFlow prop changes', () => {
      const { rerender } = renderComponent({
        dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE,
      })
      expect(screen.getByTestId('current-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE,
      )

      rerender(
        <PositionChangeDialog
          {...defaultProps}
          dialogFlow={POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO}
        />,
      )
      expect(screen.getByTestId('current-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO,
      )
    })

    it('hides dialog when dialogFlow becomes undefined (title becomes null)', () => {
      const { rerender } = renderComponent({
        dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE,
      })
      expect(screen.getByTestId('dialog')).toBeInTheDocument()

      rerender(<PositionChangeDialog {...defaultProps} dialogFlow={undefined} />)
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('setCurrentDialogFlow forwarding', () => {
    it('updates the rendered flow when setCurrentDialogFlow is called from content', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('set-flow-btn'))
      expect(screen.getByTestId('current-flow').textContent).toBe('new-flow')
    })
  })

  describe('dialog title', () => {
    it('renders MAINTENANCE title', () => {
      renderComponent({ dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE })
      expect(screen.getByTestId('dialog-title').textContent).toBe('Move miner to maintenance')
    })

    it('renders CHANGE_INFO title with short code', () => {
      renderComponent({ dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO })
      expect(screen.getByTestId('dialog-title').textContent).toBe('Change info of miner M-SNOW-01')
    })

    it('renders default title for unrecognised flow', () => {
      renderComponent({ dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION })
      expect(screen.getByTestId('dialog-title').textContent).toBe('Change position of miner')
    })

    it('renders bring-back title when container is MAINTENANCE_CONTAINER', () => {
      renderComponent({
        dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE,
        selectedEditSocket: {
          miner: { code: 'M-SNOW-01', tags: [] },
          containerInfo: { container: MAINTENANCE_CONTAINER },
        },
      })
      expect(screen.getByTestId('dialog-title').textContent).toContain(
        'Bring back miner from maintenance mode',
      )
    })

    it('calls getDeviceContainerPosText for bring-back title', () => {
      renderComponent({
        dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE,
        selectedEditSocket: {
          miner: { code: 'M-SNOW-01', tags: [] },
          containerInfo: { container: MAINTENANCE_CONTAINER },
        },
      })
      expect(getDeviceContainerPosText).toHaveBeenCalled()
    })

    it('does not render dialog when currentDialogFlow is empty (title is null)', () => {
      renderComponent({ dialogFlow: '' })
      expect(screen.queryByTestId('dialog-title')).not.toBeInTheDocument()
    })
  })

  describe('close / cancel behaviour', () => {
    it('calls onClose when DialogContent close button is clicked', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.click(screen.getByTestId('close-btn'))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('calls onClose with currentDialogFlow value at time of cancel', () => {
      const onClose = vi.fn()
      renderComponent({ onClose, dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE })
      fireEvent.click(screen.getByTestId('cancel-btn'))
      expect(onClose).toHaveBeenCalledWith(POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE, undefined)
    })

    it('calls onClose with isDontReset=true when cancel is called with true', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.click(screen.getByTestId('cancel-dont-reset-btn'))
      expect(onClose).toHaveBeenCalledWith(POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE, true)
    })

    it('hides dialog after cancel because currentDialogFlow resets to empty', () => {
      renderComponent({ dialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE })
      fireEvent.click(screen.getByTestId('cancel-btn'))
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('calls onClose when Dialog onOpenChange fires with false', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.mouseDown(screen.getByTestId('dialog'))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('does not call onClose before any interaction', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('props forwarding', () => {
    it('forwards isContainerEmpty to PositionChangeDialogContent', () => {
      renderComponent({ isContainerEmpty: true })
      expect(screen.getByTestId('is-container-empty').textContent).toBe('true')
    })

    it('defaults isContainerEmpty to undefined', () => {
      renderComponent()
      expect(screen.getByTestId('is-container-empty').textContent).toBe('undefined')
    })

    it('calls onChangePositionClicked when triggered from content', () => {
      const onChangePositionClicked = vi.fn()
      renderComponent({ onChangePositionClicked })
      fireEvent.click(screen.getByTestId('change-position-btn'))
      expect(onChangePositionClicked).toHaveBeenCalledOnce()
    })

    it('calls onPositionChangedSuccess when triggered from content', () => {
      const onPositionChangedSuccess = vi.fn()
      renderComponent({ onPositionChangedSuccess })
      fireEvent.click(screen.getByTestId('position-changed-btn'))
      expect(onPositionChangedSuccess).toHaveBeenCalledOnce()
    })
  })

  describe('miner resolution', () => {
    it('uses selectedEditSocket miner for shortCode when available', () => {
      renderComponent()
      expect(getMinerShortCode).toHaveBeenCalledWith('M-SNOW-01', ['Production'])
    })

    it('falls back to selectedSocketToReplace miner when selectedEditSocket has no miner', () => {
      renderComponent({
        selectedEditSocket: {
          containerInfo: { container: 'CON-BBR-01' },
          miner: { code: 'M-ICE-02', tags: ['Immersion'] },
        },
        selectedSocketToReplace: {
          miner: { code: 'M-ICE-02', tags: ['Immersion'] },
          containerInfo: { container: 'CON-BBR-02' },
        },
      })
      expect(getMinerShortCode).toHaveBeenCalledWith('M-ICE-02', ['Immersion'])
    })
  })
})
