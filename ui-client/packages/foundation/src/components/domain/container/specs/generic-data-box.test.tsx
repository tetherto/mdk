import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataRow } from '../data-row/data-row'
import { GenericDataBox } from '../generic-data-box/generic-data-box'

vi.mock('../data-row/data-row', () => ({
  DataRow: vi.fn(({ label, value }) => (
    <div data-testid="data-row">
      {label}: {String(value)}
    </div>
  )),
}))

describe('GenericDataBox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all data rows', () => {
    const data = [
      { label: 'Temp', value: 45, units: '°C' },
      { label: 'Status', value: 'OK' },
    ]
    render(<GenericDataBox data={data} />)
    expect(screen.getAllByTestId('data-row')).toHaveLength(2)
  })

  it('uses fallbackValue for undefined values', () => {
    const data = [{ label: 'Missing', value: undefined }]
    render(<GenericDataBox data={data} fallbackValue="--" />)

    expect(DataRow).toHaveBeenCalledWith(
      expect.objectContaining({ value: '--' }),
      expect.anything(),
    )
  })

  it('prefers units over unit', () => {
    const data = [{ label: 'Test', value: 100, units: '°C', unit: '°F' }]
    render(<GenericDataBox data={data} />)

    expect(DataRow).toHaveBeenCalledWith(
      expect.objectContaining({ units: '°C' }),
      expect.anything(),
    )
  })

  it('passes all props to DataRow', () => {
    const data = [
      { label: 'Alert', value: 'Critical', isHighlighted: true, color: 'red', flash: true },
    ]
    render(<GenericDataBox data={data} />)

    expect(DataRow).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Alert',
        value: 'Critical',
        isHighlighted: true,
        color: 'red',
        flash: true,
      }),
      expect.anything(),
    )
  })
})
