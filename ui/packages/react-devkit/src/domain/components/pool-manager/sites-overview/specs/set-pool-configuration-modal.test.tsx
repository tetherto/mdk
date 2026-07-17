import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SetPoolConfigurationModal } from '../set-pool-configuration/set-pool-configuration-modal'

vi.mock(
  '@domain/components/pool-manager/sites-overview/set-pool-configuration/set-pool-configuration',
  () => ({
    SetPoolConfiguration: vi.fn(() => <div data-testid="inner-form">Inner Form Content</div>),
  }),
)

describe('SetPoolConfigurationModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()
  const mockPoolConfig = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal when isOpen is true', () => {
    render(
      <SetPoolConfigurationModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        poolConfig={mockPoolConfig}
      />,
    )

    expect(screen.getByText('Selected Units')).toBeInTheDocument()
    expect(screen.getByTestId('inner-form')).toBeInTheDocument()
  })

  it('does not render the modal when isOpen is false', () => {
    render(
      <SetPoolConfigurationModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        poolConfig={mockPoolConfig}
      />,
    )

    expect(screen.queryByText('Selected Units')).not.toBeInTheDocument()
    expect(screen.queryByTestId('inner-form')).not.not.toBeInTheDocument()
  })

  it('handles the onOpenChange logic correctly', async () => {
    render(
      <SetPoolConfigurationModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        poolConfig={mockPoolConfig}
      />,
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
