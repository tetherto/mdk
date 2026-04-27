import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../../constants/dialog'
import { PositionChangeDialogContent } from '../position-change-dialog-content'

vi.mock('../confirm-change-position-dialog/confirm-change-position-dialog-content', () => ({
  ConfirmChangePositionDialogContent: ({ onCancel, onSave, isContainerEmpty }: any) => (
    <div data-testid="confirm-change-position">
      <span data-testid="is-container-empty">{String(isContainerEmpty)}</span>
      <button onClick={onCancel}>cancel</button>
      <button onClick={onSave}>save</button>
    </div>
  ),
}))

vi.mock('../container-selection-dialog-content/container-selection-dialog-content', () => ({
  ContainerSelectionDialogContent: ({ onCancel }: any) => (
    <div data-testid="container-selection">
      <button onClick={() => onCancel()}>cancel</button>
    </div>
  ),
}))

vi.mock('../../add-replace-miner-dialog/add-replace-miner-dialog-content', () => ({
  AddReplaceMinerDialogContent: ({ onCancel, currentDialogFlow }: any) => (
    <div data-testid="add-replace-miner">
      <span data-testid="current-flow">{currentDialogFlow}</span>
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}))

vi.mock('../remove-miner-dialog/remove-miner-dialog-content', () => ({
  RemoveMinerDialogContent: ({ onCancel }: any) => (
    <div data-testid="remove-miner">
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}))

vi.mock('../maintenance-dialog-content/maintenance-dialog-content', () => ({
  MaintenanceDialogContent: ({ onCancel }: any) => (
    <div data-testid="maintenance">
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}))

vi.mock('../default-position-change-dialog-content/default-position-change-dialog-content', () => ({
  DefaultPositionChangeDialogContent: ({ onChangePositionClicked, setCurrentDialogFlow }: any) => (
    <div data-testid="default">
      <button onClick={onChangePositionClicked}>change position</button>
      <button onClick={() => setCurrentDialogFlow('some-flow')}>set flow</button>
    </div>
  ),
}))

const defaultProps = {
  onCancel: vi.fn(),
  onPositionChangedSuccess: vi.fn(),
  onChangePositionClicked: vi.fn(),
  setCurrentDialogFlow: vi.fn(),
  selectedEditSocket: { miner: { id: 'miner-1' } },
  selectedSocketToReplace: { miner: { id: 'miner-2' } },
  isContainerEmpty: false,
}

const renderComponent = (
  overrides: Partial<typeof defaultProps> & { currentDialogFlow?: string } = {},
) => render(<PositionChangeDialogContent {...defaultProps} {...overrides} />)

describe('PositionChangeDialogContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('default flow', () => {
    it('renders DefaultPositionChangeDialogContent when currentDialogFlow is undefined', () => {
      renderComponent()
      expect(screen.getByTestId('default')).toBeInTheDocument()
    })

    it('renders DefaultPositionChangeDialogContent for an unrecognised flow', () => {
      renderComponent({ currentDialogFlow: 'unknown-flow' })
      expect(screen.getByTestId('default')).toBeInTheDocument()
    })

    it('calls onChangePositionClicked when triggered from default content', () => {
      const onChangePositionClicked = vi.fn()
      renderComponent({ onChangePositionClicked })
      fireEvent.click(screen.getByText('change position'))
      expect(onChangePositionClicked).toHaveBeenCalledOnce()
    })

    it('calls setCurrentDialogFlow when triggered from default content', () => {
      const setCurrentDialogFlow = vi.fn()
      renderComponent({ setCurrentDialogFlow })
      fireEvent.click(screen.getByText('set flow'))
      expect(setCurrentDialogFlow).toHaveBeenCalledWith('some-flow')
    })

    it('does not crash when setCurrentDialogFlow is undefined', () => {
      renderComponent({ setCurrentDialogFlow: undefined })
      expect(() => fireEvent.click(screen.getByText('set flow'))).not.toThrow()
    })
  })

  describe(POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION, () => {
    it('renders ConfirmChangePositionDialogContent', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION })
      expect(screen.getByTestId('confirm-change-position')).toBeInTheDocument()
    })

    it('forwards isContainerEmpty', () => {
      renderComponent({
        currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION,
        isContainerEmpty: true,
      })
      expect(screen.getByTestId('is-container-empty').textContent).toBe('true')
    })

    it('defaults isContainerEmpty to false', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION })
      expect(screen.getByTestId('is-container-empty').textContent).toBe('false')
    })

    it('calls onCancel when cancel is triggered', () => {
      const onCancel = vi.fn()
      renderComponent({
        currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION,
        onCancel,
      })
      fireEvent.click(screen.getByText('cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onPositionChangedSuccess when save is triggered', () => {
      const onPositionChangedSuccess = vi.fn()
      renderComponent({
        currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION,
        onPositionChangedSuccess,
      })
      fireEvent.click(screen.getByText('save'))
      expect(onPositionChangedSuccess).toHaveBeenCalledOnce()
    })

    it('does not crash when onPositionChangedSuccess is undefined', () => {
      renderComponent({
        currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION,
        onPositionChangedSuccess: undefined,
      })
      expect(() => fireEvent.click(screen.getByText('save'))).not.toThrow()
    })
  })

  describe(POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION, () => {
    it('renders ContainerSelectionDialogContent', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION })
      expect(screen.getByTestId('container-selection')).toBeInTheDocument()
    })

    it('calls onCancel when cancel is triggered', () => {
      const onCancel = vi.fn()
      renderComponent({
        currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION,
        onCancel,
      })
      fireEvent.click(screen.getByText('cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe(POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER, () => {
    it('renders AddReplaceMinerDialogContent', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER })
      expect(screen.getByTestId('add-replace-miner')).toBeInTheDocument()
    })

    it('forwards currentDialogFlow to AddReplaceMinerDialogContent', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER })
      expect(screen.getByTestId('current-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER,
      )
    })

    it('calls onCancel when cancel is triggered', () => {
      const onCancel = vi.fn()
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER, onCancel })
      fireEvent.click(screen.getByText('cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe(POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO, () => {
    it('renders AddReplaceMinerDialogContent', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO })
      expect(screen.getByTestId('add-replace-miner')).toBeInTheDocument()
    })

    it('forwards currentDialogFlow to AddReplaceMinerDialogContent', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO })
      expect(screen.getByTestId('current-flow').textContent).toBe(
        POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO,
      )
    })

    it('calls onCancel when cancel is triggered', () => {
      const onCancel = vi.fn()
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO, onCancel })
      fireEvent.click(screen.getByText('cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe(POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_REMOVE, () => {
    it('renders RemoveMinerDialogContent', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_REMOVE })
      expect(screen.getByTestId('remove-miner')).toBeInTheDocument()
    })

    it('calls onCancel when cancel is triggered', () => {
      const onCancel = vi.fn()
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_REMOVE, onCancel })
      fireEvent.click(screen.getByText('cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe(POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE, () => {
    it('renders MaintenanceDialogContent', () => {
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE })
      expect(screen.getByTestId('maintenance')).toBeInTheDocument()
    })

    it('calls onCancel when cancel is triggered', () => {
      const onCancel = vi.fn()
      renderComponent({ currentDialogFlow: POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE, onCancel })
      fireEvent.click(screen.getByText('cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe('onCancel safety', () => {
    const flowsWithCancel = [
      POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION,
      POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER,
      POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO,
      POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_REMOVE,
      POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE,
    ]

    flowsWithCancel.forEach((flow) => {
      it(`does not crash when onCancel is undefined in ${flow} flow`, () => {
        renderComponent({ currentDialogFlow: flow, onCancel: undefined })
        expect(() => fireEvent.click(screen.getByText('cancel'))).not.toThrow()
      })
    })
  })
})
