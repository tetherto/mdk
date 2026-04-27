import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AddUserModal } from '../add-user-modal'

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'read_only_user', label: 'Read Only User' },
]

describe('AddUserModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    roles,
    onSubmit: vi.fn().mockResolvedValue(undefined),
  }

  it('renders form fields', () => {
    render(<AddUserModal {...defaultProps} />)
    expect(screen.getByText('Add New User')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', () => {
    render(<AddUserModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(defaultProps.onClose).toHaveBeenCalledOnce()
  })

  it('does not call onSubmit when form is empty', async () => {
    render(<AddUserModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Add User'))
    await waitFor(() => {
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })
  })
})
