import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ImportExportSettings } from '../import-export'

describe('ImportExportSettings', () => {
  const defaultProps = {
    onExport: vi.fn(),
    onImport: vi.fn(),
  }

  it('renders description', () => {
    render(<ImportExportSettings {...defaultProps} />)
    expect(screen.getByText(/Save or restore all OS-level configuration/)).toBeInTheDocument()
  })

  it('renders export and import buttons', () => {
    render(<ImportExportSettings {...defaultProps} />)
    expect(screen.getByText('Export JSON')).toBeInTheDocument()
    expect(screen.getByText('Import JSON')).toBeInTheDocument()
  })

  it('calls onExport when export button clicked', () => {
    render(<ImportExportSettings {...defaultProps} />)
    fireEvent.click(screen.getByText('Export JSON'))
    expect(defaultProps.onExport).toHaveBeenCalledOnce()
  })

  it('opens import modal when import button clicked', () => {
    render(<ImportExportSettings {...defaultProps} />)
    fireEvent.click(screen.getByText('Import JSON'))
    expect(screen.getByText('Import OS Settings')).toBeInTheDocument()
  })

  it('renders warning text', () => {
    render(<ImportExportSettings {...defaultProps} />)
    expect(screen.getByText(/Warning: Importing settings will overwrite/)).toBeInTheDocument()
  })
})
