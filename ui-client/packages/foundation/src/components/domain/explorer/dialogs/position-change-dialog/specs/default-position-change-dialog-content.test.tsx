import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../../constants/dialog'
import { DefaultPositionChangeDialogContent } from '../default-position-change-dialog-content/default-position-change-dialog-content'

describe('DefaultPositionChangeDialogContent', () => {
  const mockSetCurrentDialogFlow = vi.fn()
  const mockOnChangePositionClicked = vi.fn()

  const defaultProps = {
    setCurrentDialogFlow: mockSetCurrentDialogFlow,
    onChangePositionClicked: mockOnChangePositionClicked,
  }

  it('renders all three action buttons', () => {
    render(<DefaultPositionChangeDialogContent {...defaultProps} />)

    expect(screen.getByText('Change Position')).toBeInTheDocument()
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
    expect(screen.getByText('Change Miner info')).toBeInTheDocument()
  })

  it('navigates to CONTAINER_SELECTION and calls click handler when "Change Position" is clicked', () => {
    render(<DefaultPositionChangeDialogContent {...defaultProps} />)

    const button = screen.getByText('Change Position')
    fireEvent.click(button)

    expect(mockSetCurrentDialogFlow).toHaveBeenCalledWith(
      POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION,
    )
    expect(mockOnChangePositionClicked).toHaveBeenCalled()
  })

  it('navigates to MAINTENANCE when "Maintenance" is clicked', () => {
    render(<DefaultPositionChangeDialogContent {...defaultProps} />)

    const button = screen.getByText('Maintenance')
    fireEvent.click(button)

    expect(mockSetCurrentDialogFlow).toHaveBeenCalledWith(POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE)
  })

  it('navigates to CHANGE_INFO when "Change Miner info" is clicked', () => {
    render(<DefaultPositionChangeDialogContent {...defaultProps} />)

    const button = screen.getByText('Change Miner info')
    fireEvent.click(button)

    expect(mockSetCurrentDialogFlow).toHaveBeenCalledWith(POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO)
  })
})
