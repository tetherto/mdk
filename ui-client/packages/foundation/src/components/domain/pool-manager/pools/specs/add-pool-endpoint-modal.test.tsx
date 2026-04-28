import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddPoolEndpointModal } from '../add-pool-endpoint-modal/add-pool-endpoint-modal'

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
    DialogFooter: ({ children }: any) => <div>{children}</div>,
  }
})

vi.mock('../../../pool-manager-constants', () => ({
  SHOW_ADDITIONAL_FIELDS: false,
  POOL_ENDPOINT_ROLES_OPTIONS: [
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
  ],
  POOL_ENDPOINT_REGIONS_OPTIONS: [
    { value: 'eu', label: 'EU' },
    { value: 'us', label: 'US' },
  ],
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
}

const renderComponent = (overrides: Partial<typeof defaultProps> & { endpoint?: any } = {}) =>
  render(<AddPoolEndpointModal {...defaultProps} {...overrides} />)

describe('AddPoolEndpointModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('renders when isOpen is true', () => {
      renderComponent()
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('renders nothing when isOpen is false', () => {
      renderComponent({ isOpen: false })
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })
  })

  describe('title', () => {
    it('shows "Add Endpoint" title in add mode', () => {
      renderComponent()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Add Endpoint')
    })

    it('shows "Edit Endpoint" title in edit mode', () => {
      renderComponent({ endpoint: { host: 'a.com', port: '3333', pool: 'p' } })
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Edit Endpoint')
    })
  })

  describe('form fields', () => {
    it('renders Host field', () => {
      renderComponent()
      expect(screen.getAllByLabelText(/host/i)[0]).toBeInTheDocument()
    })

    it('renders Port field', () => {
      renderComponent()
      expect(screen.getAllByLabelText(/port/i)[0]).toBeInTheDocument()
    })

    it('renders Pool field', () => {
      renderComponent()
      expect(screen.getAllByLabelText(/pool/i)[0]).toBeInTheDocument()
    })

    it('renders Save and Cancel buttons', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('does not render Role or Region selects when SHOW_ADDITIONAL_FIELDS is false', () => {
      renderComponent()
      expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/region/i)).not.toBeInTheDocument()
    })
  })

  describe('default values', () => {
    it('starts with empty Host in add mode', () => {
      renderComponent()
      expect(screen.getAllByLabelText(/host/i)[0]).toHaveValue('')
    })

    it('starts with empty Port in add mode', () => {
      renderComponent()
      expect(screen.getAllByLabelText(/port/i)[0]).toHaveValue('')
    })

    it('starts with empty Pool in add mode', () => {
      renderComponent()
      expect(screen.getAllByLabelText(/pool/i)[0]).toHaveValue('')
    })

    it('pre-fills Host from endpoint in edit mode', () => {
      renderComponent({ endpoint: { host: 'pool.example.com', port: '3333', pool: 'my-pool' } })
      expect(screen.getAllByLabelText(/host/i)[0]).toHaveValue('pool.example.com')
    })

    it('pre-fills Pool from endpoint in edit mode', () => {
      renderComponent({ endpoint: { host: 'pool.example.com', port: '3333', pool: 'my-pool' } })
      expect(screen.getAllByLabelText(/pool/i)[0]).toHaveValue('pool.example.com')
    })
  })

  describe('close behaviour', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('calls onClose when DialogContent close button is clicked', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.click(screen.getByTestId('close-btn'))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('calls onClose when Dialog onOpenChange fires with false', () => {
      const onClose = vi.fn()
      renderComponent({ onClose })
      fireEvent.mouseDown(screen.getByTestId('dialog'))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })
})
