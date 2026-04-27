import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MinerStatusIndicator } from '../mining-status-indicator'
import { MinerStatuses } from '../../../../../../constants/device-constants'

describe('minerStatusIndicator', () => {
  const mockGetFormattedDate = (date: Date) => date.toISOString()

  it('should render with mining status', () => {
    const { container } = render(
      <MinerStatusIndicator
        stats={{ status: MinerStatuses.MINING }}
        getFormattedDate={mockGetFormattedDate}
      />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })

  it('should render with offline status', () => {
    const { container } = render(
      <MinerStatusIndicator
        stats={{ status: MinerStatuses.OFFLINE }}
        getFormattedDate={mockGetFormattedDate}
      />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })

  it('should render with sleeping status', () => {
    const { container } = render(
      <MinerStatusIndicator
        stats={{ status: MinerStatuses.SLEEPING }}
        getFormattedDate={mockGetFormattedDate}
      />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })

  it('should render with error status', () => {
    const { container } = render(
      <MinerStatusIndicator
        stats={{ status: MinerStatuses.ERROR }}
        getFormattedDate={mockGetFormattedDate}
      />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })

  it('should render alert icon when alerts present', () => {
    const alerts = [
      {
        severity: 'high',
        createdAt: new Date().toISOString(),
        name: 'Test Alert',
        description: 'Test Description',
      },
    ]
    const { container } = render(
      <MinerStatusIndicator
        stats={{ status: MinerStatuses.MINING }}
        alerts={alerts}
        getFormattedDate={mockGetFormattedDate}
      />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator--alert')).toBeInTheDocument()
  })

  it('should filter invalid alerts', () => {
    const alerts = [
      {
        severity: 'high',
        createdAt: new Date().toISOString(),
        name: 'Valid Alert',
        description: 'Valid Description',
      },
      { invalid: 'alert' } as any,
      null as any,
    ]
    const { container } = render(
      <MinerStatusIndicator
        stats={{ status: MinerStatuses.MINING }}
        alerts={alerts}
        getFormattedDate={mockGetFormattedDate}
      />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })

  it('should render without tooltip when hideTooltip is true', () => {
    const { container } = render(
      <MinerStatusIndicator
        stats={{ status: MinerStatuses.MINING }}
        hideTooltip={true}
        getFormattedDate={mockGetFormattedDate}
      />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })

  it('should handle empty stats', () => {
    const { container } = render(
      <MinerStatusIndicator stats={{}} getFormattedDate={mockGetFormattedDate} />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })

  it('should handle undefined stats', () => {
    const { container } = render(
      <MinerStatusIndicator stats={undefined} getFormattedDate={mockGetFormattedDate} />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })

  it('should handle empty alerts array', () => {
    const { container } = render(
      <MinerStatusIndicator
        stats={{ status: MinerStatuses.MINING }}
        alerts={[]}
        getFormattedDate={mockGetFormattedDate}
      />,
    )
    expect(container.querySelector('.mdk-mining-status-indicator')).toBeInTheDocument()
  })
})
