import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AddReplaceMinerDialog } from '../add-replace-miner-dialog'
import * as helper from '../helper'

vi.mock('../add-replace-miner-dialog-content', () => ({
  AddReplaceMinerDialogContent: ({ onCancel }: { onCancel: VoidFunction }) => (
    <div>
      <div data-testid="mock-content">Miner Content</div>
      <button onClick={onCancel}>Cancel Button</button>
    </div>
  ),
}))

vi.mock('../helper', () => ({
  getTitle: vi.fn(() => 'Mocked Title'),
}))

describe('AddReplaceMinerDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    selectedSocketToReplace: {},
    selectedEditSocket: {},
    currentDialogFlow: 'add',
    isDirectToMaintenanceMode: false,
    minersType: 'S19',
    isContainerEmpty: false,
  }

  it('should render the dialog with the correct title when open is true', () => {
    render(<AddReplaceMinerDialog {...defaultProps} />)

    // Check if title from helper is rendered
    expect(screen.getByText('Mocked Title')).toBeInTheDocument()
    // Check if child content is rendered
    expect(screen.getByTestId('mock-content')).toBeInTheDocument()
  })

  it('should not render anything when open is false', () => {
    render(<AddReplaceMinerDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Mocked Title')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-content')).not.toBeInTheDocument()
  })

  it('should call onClose when the internal content triggers onCancel', () => {
    render(<AddReplaceMinerDialog {...defaultProps} />)

    const cancelButton = screen.getByText('Cancel Button')
    fireEvent.click(cancelButton)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when Radix onOpenChange is triggered (closing)', () => {
    const mockOnClose = vi.fn()
    render(<AddReplaceMinerDialog {...defaultProps} onClose={mockOnClose} />)

    // Radix Dialog content usually has a close button with a cross icon.
    // If your DialogHeader has a close button, we find it by role or icon.
    // Alternatively, we test the portal behavior by hitting Escape
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should pass correct arguments to getTitle helper', () => {
    render(<AddReplaceMinerDialog {...defaultProps} />)

    expect(helper.getTitle).toHaveBeenCalledWith({
      selectedSocketToReplace: defaultProps.selectedSocketToReplace,
      selectedEditSocket: defaultProps.selectedEditSocket,
      currentDialogFlow: defaultProps.currentDialogFlow,
      isDirectToMaintenanceMode: defaultProps.isDirectToMaintenanceMode,
    })
  })
})
