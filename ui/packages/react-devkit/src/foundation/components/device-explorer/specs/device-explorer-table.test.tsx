import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DeviceExplorerTable } from '../device-explorer-table'
import type { DeviceExplorerDeviceData } from '../types'

describe('deviceExplorerTable', () => {
  const mockGetFormattedDate = vi.fn((date: Date) => date.toISOString())
  const mockRenderAction = vi.fn(() => <button type="button">Action</button>)

  const defaultProps = {
    data: [] as DeviceExplorerDeviceData[],
    deviceType: 'container' as const,
    selections: {},
    onSelectionsChange: vi.fn(),
    getFormattedDate: mockGetFormattedDate,
    renderAction: mockRenderAction,
    sorting: [],
    onSortingChange: vi.fn(),
  }

  it('should render table wrapper with correct class', () => {
    const { container } = render(<DeviceExplorerTable {...defaultProps} />)
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should render with miner device type', () => {
    const { container } = render(<DeviceExplorerTable {...defaultProps} deviceType="miner" />)
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should render with cabinet device type', () => {
    const { container } = render(<DeviceExplorerTable {...defaultProps} deviceType="cabinet" />)
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should pass data to table', () => {
    const data: DeviceExplorerDeviceData[] = [{ id: 'dev-1', type: 'container', last: {} }]
    const { container } = render(<DeviceExplorerTable {...defaultProps} data={data} />)
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should accept sorting and onSortingChange', () => {
    const onSortingChange = vi.fn()
    const { container } = render(
      <DeviceExplorerTable
        {...defaultProps}
        sorting={[{ id: 'id', desc: false }]}
        onSortingChange={onSortingChange}
      />,
    )
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should accept selections and onSelectionsChange', () => {
    const onSelectionsChange = vi.fn()
    const { container } = render(
      <DeviceExplorerTable
        {...defaultProps}
        selections={{ '0': true }}
        onSelectionsChange={onSelectionsChange}
      />,
    )
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })
})
