import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_HEADER_PREFERENCES } from '../../../../constants/header-controls.constants'
import { HeaderControlsSettings } from '../header-controls'
import { WEBAPP_SHORT_NAME } from '../../../../constants'

describe('HeaderControlsSettings', () => {
  const defaultProps = {
    preferences: DEFAULT_HEADER_PREFERENCES,
    onToggle: vi.fn(),
    onReset: vi.fn(),
  }

  it('renders description text', () => {
    render(<HeaderControlsSettings {...defaultProps} />)
    expect(screen.getByText(/Customize which metrics/)).toBeInTheDocument()
  })

  it('renders all header items', () => {
    render(<HeaderControlsSettings {...defaultProps} />)
    expect(screen.getByText('Pool Miners')).toBeInTheDocument()
    expect(screen.getByText(`${WEBAPP_SHORT_NAME} Miners`)).toBeInTheDocument()
    expect(screen.getByText('Pool Hashrate')).toBeInTheDocument()
    expect(screen.getByText(`${WEBAPP_SHORT_NAME} Hashrate`)).toBeInTheDocument()
    expect(screen.getByText('Consumption')).toBeInTheDocument()
    expect(screen.getByText('Efficiency')).toBeInTheDocument()
  })

  it('calls onReset when reset button clicked', () => {
    render(<HeaderControlsSettings {...defaultProps} />)
    fireEvent.click(screen.getByText('Reset to Default'))
    expect(defaultProps.onReset).toHaveBeenCalledOnce()
  })
})
