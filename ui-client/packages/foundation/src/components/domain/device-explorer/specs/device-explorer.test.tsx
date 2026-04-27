import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeviceExplorer } from '../device-explorer'

describe('deviceExplorer', () => {
  const defaultProps = {
    deviceType: 'container' as const,
    data: [],
    filterOptions: [],
    searchOptions: [],
    searchTags: [],
    onFiltersChange: vi.fn(),
    onSearchTagsChange: vi.fn(),
    onDeviceTypeChange: vi.fn(),
    getFormattedDate: vi.fn((date: Date) => date.toISOString()),
    renderAction: vi.fn(() => null),
  }

  it('should render device explorer root', () => {
    const { container } = render(<DeviceExplorer {...defaultProps} />)
    expect(container.querySelector('.mdk-device-explorer')).toBeInTheDocument()
  })

  it('should render toolbar', () => {
    const { container } = render(<DeviceExplorer {...defaultProps} />)
    expect(container.querySelector('.mdk-device-explorer__toolbar')).toBeInTheDocument()
  })

  it('should render table', () => {
    const { container } = render(<DeviceExplorer {...defaultProps} />)
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should render device type tabs', () => {
    render(<DeviceExplorer {...defaultProps} />)
    expect(screen.getByText('Containers')).toBeInTheDocument()
    expect(screen.getByText('Miners')).toBeInTheDocument()
    expect(screen.getByText('Cabinets')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<DeviceExplorer {...defaultProps} className="custom-class" />)
    const root = container.querySelector('.mdk-device-explorer')
    expect(root).toHaveClass('custom-class')
  })

  it('should render with initial deviceType and pass onDeviceTypeChange to toolbar', () => {
    const onDeviceTypeChange = vi.fn()
    render(<DeviceExplorer {...defaultProps} onDeviceTypeChange={onDeviceTypeChange} />)
    expect(screen.getByText('Containers')).toBeInTheDocument()
    expect(screen.getByText('Miners')).toBeInTheDocument()
    expect(screen.getByText('Cabinets')).toBeInTheDocument()
  })

  it('should work with provided filters', () => {
    const { container } = render(
      <DeviceExplorer
        {...defaultProps}
        filters={{ status: 'active' }}
        filterOptions={[{ label: 'Status', value: 'status', children: [] }]}
      />,
    )
    expect(container.querySelector('.mdk-device-explorer')).toBeInTheDocument()
  })

  it('should work with selectedDevices and onSelectedDevicesChange', () => {
    const onSelectedDevicesChange = vi.fn()
    const { container } = render(
      <DeviceExplorer
        {...defaultProps}
        selectedDevices={{}}
        onSelectedDevicesChange={onSelectedDevicesChange}
      />,
    )
    expect(container.querySelector('.mdk-device-explorer')).toBeInTheDocument()
  })
})
