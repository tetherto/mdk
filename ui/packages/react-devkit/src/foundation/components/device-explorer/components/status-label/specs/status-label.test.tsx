import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusLabel } from '../status-label'

describe('statusLabel', () => {
  it('should render children', () => {
    render(<StatusLabel>Status Content</StatusLabel>)
    expect(screen.getByText('Status Content')).toBeInTheDocument()
  })

  it('should apply error status class', () => {
    const { container } = render(<StatusLabel status="error">Error</StatusLabel>)
    const element = container.querySelector('.mdk-device-explorer__status-label')
    expect(element).toHaveClass('mdk-device-explorer__status-label--error')
  })

  it('should apply offline status class', () => {
    const { container } = render(<StatusLabel status="offline">Offline</StatusLabel>)
    const element = container.querySelector('.mdk-device-explorer__status-label')
    expect(element).toHaveClass('mdk-device-explorer__status-label--offline')
  })

  it('should apply sleep status class', () => {
    const { container } = render(<StatusLabel status="sleep">Sleep</StatusLabel>)
    const element = container.querySelector('.mdk-device-explorer__status-label')
    expect(element).toHaveClass('mdk-device-explorer__status-label--sleep')
  })

  it('should render without status prop', () => {
    const { container } = render(<StatusLabel>No Status</StatusLabel>)
    const element = container.querySelector('.mdk-device-explorer__status-label')
    expect(element).toBeInTheDocument()
    expect(element).not.toHaveClass('mdk-device-explorer__status-label--error')
    expect(element).not.toHaveClass('mdk-device-explorer__status-label--offline')
    expect(element).not.toHaveClass('mdk-device-explorer__status-label--sleep')
  })
})
