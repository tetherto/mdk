import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FeatureFlagsSettings } from '../feature-flags'

describe('FeatureFlagsSettings', () => {
  const defaultProps = {
    featureFlags: { poolStats: true, reporting: false },
    isEditingEnabled: true,
    onSave: vi.fn(),
  }

  it('renders flag names', () => {
    render(<FeatureFlagsSettings {...defaultProps} />)
    expect(screen.getByText('poolStats')).toBeInTheDocument()
    expect(screen.getByText('reporting')).toBeInTheDocument()
  })

  it('shows empty state when editing is disabled', () => {
    render(<FeatureFlagsSettings {...defaultProps} isEditingEnabled={false} />)
    expect(screen.getByText('Update feature flags not enabled')).toBeInTheDocument()
  })

  it('calls onSave when save button clicked', () => {
    render(<FeatureFlagsSettings {...defaultProps} />)
    fireEvent.click(screen.getByText('Save'))
    expect(defaultProps.onSave).toHaveBeenCalledOnce()
  })

  it('adds a new flag via input', () => {
    render(<FeatureFlagsSettings {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Add new feature flag/)
    fireEvent.change(input, { target: { value: 'newFlag' } })
    fireEvent.click(screen.getByText('Add flag'))
    expect(screen.getByText('newFlag')).toBeInTheDocument()
  })

  it('deletes a flag', () => {
    render(<FeatureFlagsSettings {...defaultProps} />)
    const deleteButtons = screen.getAllByLabelText(/Delete/)
    fireEvent.click(deleteButtons[0])
    expect(screen.queryByText('poolStats')).not.toBeInTheDocument()
  })
})
