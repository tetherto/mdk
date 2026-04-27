import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FireStatusBox } from '../fire-status-box/fire-status-box'

vi.mock('@mdk/core', () => ({
  Indicator: vi.fn(({ color, children }) => <div data-color={color}>{children}</div>),
}))

describe('FireStatusBox', () => {
  it('renders all items', () => {
    const data = { smokeDetector: 0, waterIngressDetector: 0, coolingFanStatus: 1 }
    render(<FireStatusBox data={data} />)
    expect(screen.getByText('Smoke Detector 1')).toBeInTheDocument()
    expect(screen.getByText('Water Ingress Detector')).toBeInTheDocument()
    expect(screen.getByText('Fan Status')).toBeInTheDocument()
  })

  it('shows Normal for no detection', () => {
    const data = { smokeDetector: 0, waterIngressDetector: 0, coolingFanStatus: 0 }
    render(<FireStatusBox data={data} />)
    expect(screen.getAllByText('Normal')).toHaveLength(2)
    expect(screen.getByText('Off')).toBeInTheDocument()
  })

  it('shows Detected for detection', () => {
    const data = { smokeDetector: 1, waterIngressDetector: 1, coolingFanStatus: 1 }
    render(<FireStatusBox data={data} />)
    expect(screen.getAllByText('Detected')).toHaveLength(2)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('handles undefined data', () => {
    render(<FireStatusBox />)
    expect(screen.getAllByText('Normal')).toHaveLength(2)
    expect(screen.getByText('Off')).toBeInTheDocument()
  })

  it('handles string values', () => {
    const data = { smokeDetector: 'yes', waterIngressDetector: '', coolingFanStatus: '1' }
    render(<FireStatusBox data={data} />)
    expect(screen.getByText('Detected')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
  })
})
