import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChangeConfirmationModal } from '../change-confirmation-modal'

describe('ChangeConfirmationModal', () => {
  const defaultProps = {
    open: true,
    title: 'Confirm Action',
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    children: 'Are you sure?',
  }

  it('renders title and children', () => {
    render(<ChangeConfirmationModal {...defaultProps} />)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ChangeConfirmationModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Confirm'))
    expect(defaultProps.onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onClose when cancel button is clicked', () => {
    render(<ChangeConfirmationModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(defaultProps.onClose).toHaveBeenCalledOnce()
  })

  it('uses custom confirmText', () => {
    render(<ChangeConfirmationModal {...defaultProps} confirmText="Delete" />)
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})
