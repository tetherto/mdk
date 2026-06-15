import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AlertConfirmationModal } from '../current-alerts/alert-confirmation-modal/alert-confirmation-modal'

describe('AlertConfirmationModal', () => {
  it('renders the confirmation copy when open', () => {
    render(<AlertConfirmationModal isOpen onOk={vi.fn()} />)
    expect(screen.getByText(/Sound notifications for Critical alerts/i)).toBeInTheDocument()
  })

  it('renders the "Understood" button when open', () => {
    render(<AlertConfirmationModal isOpen onOk={vi.fn()} />)
    expect(screen.getByRole('button', { name: /understood/i })).toBeInTheDocument()
  })

  it('does not render the modal body when closed', () => {
    render(<AlertConfirmationModal isOpen={false} onOk={vi.fn()} />)
    expect(screen.queryByText(/Sound notifications for Critical alerts/i)).not.toBeInTheDocument()
  })

  it('calls onOk when the "Understood" button is clicked', () => {
    const onOk = vi.fn()
    render(<AlertConfirmationModal isOpen onOk={onOk} />)
    fireEvent.click(screen.getByRole('button', { name: /understood/i }))
    expect(onOk).toHaveBeenCalledOnce()
  })
})
