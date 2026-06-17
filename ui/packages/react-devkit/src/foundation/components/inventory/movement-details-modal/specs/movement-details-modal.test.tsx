import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MovementDetailsModal } from '../movement-details-modal'
import type { MovementData } from '../movement-details-modal.types'

vi.mock('@core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@core')>()
  return {
    ...actual,
    Dialog: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({
      title,
      onClose,
      children,
    }: {
      title?: string
      onClose?: () => void
      children?: ReactNode
    }) => (
      <div data-testid="dialog-content">
        <h1>{title}</h1>
        <button type="button" onClick={onClose}>
          close
        </button>
        {children}
      </div>
    ),
  }
})

const movement: MovementData = {
  origin: 'site.warehouse',
  destination: 'workshop.lab',
  previousStatus: 'ok_brand_new',
  newStatus: 'faulty',
  device: {
    code: 'M-1042',
    tags: ['code-M-1042'],
    type: 'antminer',
    info: { site: 'Paraguay', container: 'C-12', serialNum: 'SN-9981', macAddress: 'AA:BB' },
  },
  comments: 'Moved for repair',
}

describe('MovementDetailsModal', () => {
  it('renders nothing when no movement is provided', () => {
    const { container } = render(<MovementDetailsModal isOpen />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the modal title when open with a movement', () => {
    render(<MovementDetailsModal isOpen movement={movement} />)
    expect(screen.getByText('Historical Device Update')).toBeInTheDocument()
  })

  it('renders resolved location and status labels for both sides', () => {
    render(<MovementDetailsModal isOpen movement={movement} />)
    expect(screen.getByText('Site Warehouse')).toBeInTheDocument()
    expect(screen.getByText('Workshop Lab')).toBeInTheDocument()
    expect(screen.getByText('Brand New')).toBeInTheDocument()
    expect(screen.getByText('Faulty')).toBeInTheDocument()
  })

  it('renders the device summary with all attribute rows', () => {
    render(<MovementDetailsModal isOpen movement={movement} />)
    expect(screen.getByText('M-1042')).toBeInTheDocument()
    expect(screen.getByText('antminer')).toBeInTheDocument()
    expect(screen.getByText('Paraguay')).toBeInTheDocument()
    expect(screen.getByText('C-12')).toBeInTheDocument()
    expect(screen.getByText('SN-9981')).toBeInTheDocument()
    expect(screen.getByText('AA:BB')).toBeInTheDocument()
  })

  it('calls onClose when the dialog requests to close', () => {
    const onClose = vi.fn()
    render(<MovementDetailsModal isOpen movement={movement} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders comments when present', () => {
    render(<MovementDetailsModal isOpen movement={movement} />)
    expect(screen.getByText('Moved for repair')).toBeInTheDocument()
  })

  it('does not render dialog content when closed', () => {
    render(<MovementDetailsModal isOpen={false} movement={movement} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })
})
