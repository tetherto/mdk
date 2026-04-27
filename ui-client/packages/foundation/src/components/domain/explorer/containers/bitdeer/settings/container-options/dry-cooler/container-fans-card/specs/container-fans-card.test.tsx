import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ContainerFansCard } from '../container-fans-card'

vi.mock('../container-fans-legend', () => ({
  ContainerFanLegend: vi.fn(({ index, enabled }) => (
    <div data-testid={`fan-${index}`} data-enabled={enabled}>
      Fan {index}
    </div>
  )),
}))

describe('containerFansCard', () => {
  it('renders nothing when fansData is undefined', () => {
    const { container } = render(<ContainerFansCard />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when fansData is not an array', () => {
    const { container } = render(<ContainerFansCard fansData={'not an array' as any} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders fan legends for each fan', () => {
    const fansData = [
      { enabled: true, index: 0 },
      { enabled: false, index: 1 },
      { enabled: true, index: 2 },
    ]

    render(<ContainerFansCard fansData={fansData} />)

    expect(screen.getByTestId('fan-1')).toBeInTheDocument()
    expect(screen.getByTestId('fan-2')).toBeInTheDocument()
    expect(screen.getByTestId('fan-3')).toBeInTheDocument()
  })

  it('increments fan index by 1', () => {
    const fansData = [{ enabled: true, index: 0 }]

    render(<ContainerFansCard fansData={fansData} />)

    expect(screen.getByText('Fan 1')).toBeInTheDocument()
  })

  it('passes enabled state correctly', () => {
    const fansData = [
      { enabled: true, index: 0 },
      { enabled: false, index: 1 },
    ]

    const { getByTestId } = render(<ContainerFansCard fansData={fansData} />)

    expect(getByTestId('fan-1')).toHaveAttribute('data-enabled', 'true')
    expect(getByTestId('fan-2')).toHaveAttribute('data-enabled', 'false')
  })

  it('renders grid container', () => {
    const fansData = [{ enabled: true, index: 0 }]
    const { container } = render(<ContainerFansCard fansData={fansData} />)

    expect(container.querySelector('.mdk-container-fans-card')).toBeInTheDocument()
  })

  it('handles empty array', () => {
    const { container } = render(<ContainerFansCard fansData={[]} />)
    expect(container.querySelector('.mdk-container-fans-card')).toBeInTheDocument()
  })
})
