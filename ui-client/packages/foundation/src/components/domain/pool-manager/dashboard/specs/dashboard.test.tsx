import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Alert } from '../../../device-explorer'
import { PoolManagerDashboard } from '../dashboard'
import type { DashboardStats } from '../dashboard-types'

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...actual,
    Button: vi.fn(({ children, onClick }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    )),
    Divider: vi.fn(() => <hr data-testid="divider" />),
  }
})

vi.mock('@radix-ui/react-icons', () => ({
  ArrowRightIcon: () => <svg data-testid="arrow-right-icon" />,
}))

vi.mock('date-fns/formatDistance', () => ({
  formatDistance: vi.fn(() => 'about 5 minutes'),
}))

vi.mock('../dashboard-constants', () => ({
  MAX_ALERTS_DISPLAYED: 5,
  navigationBlocks: [
    {
      icon: <svg data-testid="pools-icon" />,
      title: 'Pools',
      description: 'Manage pool configurations',
      navText: 'Configure Pools',
      url: '/pool-manager/pools',
    },
    {
      icon: <svg data-testid="site-icon" />,
      title: 'Site Overview',
      description: 'View site layout and assign pools at site/unit/miner level',
      navText: 'View Layout',
      url: '/pool-manager/sites-overview',
    },
    {
      icon: <svg data-testid="miner-icon" />,
      title: 'Miner Explorer',
      description: 'Search and bulk-assign pools to miners',
      navText: 'Explore Miners',
      url: '/pool-manager/miner-explorer',
    },
  ],
}))

const STATS: DashboardStats = {
  items: [
    { label: 'Total Miners', value: 1240 },
    { label: 'Configured Miners', value: 1102, secondaryValue: '88.87%' },
    { label: 'Errors', value: 14, type: 'ERROR' },
  ],
}

const ALERTS: Alert[] = [
  {
    id: '1',
    code: 'SN-001',
    severity: 'critical',
    description: 'Pool connection failed',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    name: '',
  },
  {
    id: '2',
    code: 'SN-042',
    severity: 'high',
    description: 'All pools dead',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    name: '',
  },
]

const defaultProps = {
  onNavigationClick: vi.fn(),
  onViewAllAlerts: vi.fn(),
}

const renderComponent = (props: Partial<Parameters<typeof PoolManagerDashboard>[0]> = {}) =>
  render(<PoolManagerDashboard {...defaultProps} {...props} />)

describe('PoolManagerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Root ────────────────────────────────────────────────────────────────

  describe('root', () => {
    it('renders root element with correct class', () => {
      const { container } = renderComponent()
      expect(container.querySelector('.mdk-pm-dashboard')).toBeInTheDocument()
    })
  })

  // ── Stat blocks ──────────────────────────────────────────────────────────

  describe('stat blocks', () => {
    it('renders stat blocks when stats provided and not loading', () => {
      const { container } = renderComponent({ stats: STATS })
      expect(container.querySelector('.mdk-pm-dashboard__stat-blocks')).toBeInTheDocument()
    })

    it('renders correct number of stat blocks', () => {
      const { container } = renderComponent({ stats: STATS })
      expect(container.querySelectorAll('.mdk-pm-dashboard__stat-block')).toHaveLength(3)
    })

    it('renders stat labels', () => {
      renderComponent({ stats: STATS })
      expect(screen.getByText('Total Miners')).toBeInTheDocument()
      expect(screen.getByText('Configured Miners')).toBeInTheDocument()
      expect(screen.getByText('Errors')).toBeInTheDocument()
    })

    it('renders stat values', () => {
      renderComponent({ stats: STATS })
      expect(screen.getByText('1240')).toBeInTheDocument()
      expect(screen.getByText('1102')).toBeInTheDocument()
      expect(screen.getByText('14')).toBeInTheDocument()
    })

    it('renders secondary value when provided', () => {
      renderComponent({ stats: STATS })
      expect(screen.getByText(/88\.87%/)).toBeInTheDocument()
    })

    it('does not render secondary value when not provided', () => {
      renderComponent({ stats: STATS })
      const allStatValues = screen.getAllByText(/\d+/)
      const secondaryValues = allStatValues.filter((el) => el.className.includes('stat-secondary'))
      expect(secondaryValues).toHaveLength(1)
    })

    it('renders status dot with data-type when stat.type provided', () => {
      const { container } = renderComponent({ stats: STATS })
      const statusDot = container.querySelector('.mdk-pm-dashboard__stat-status')
      expect(statusDot).toBeInTheDocument()
      expect(statusDot).toHaveAttribute('data-type', 'error')
    })

    it('does not render status dot when stat.type not provided', () => {
      const statsNoType: DashboardStats = {
        items: [{ label: 'Total Miners', value: 100 }],
      }
      const { container } = renderComponent({ stats: statsNoType })
      expect(container.querySelector('.mdk-pm-dashboard__stat-status')).not.toBeInTheDocument()
    })

    it('does not render stat blocks when stats is undefined', () => {
      const { container } = renderComponent()
      expect(container.querySelector('.mdk-pm-dashboard__stat-blocks')).not.toBeInTheDocument()
    })

    it('does not render stat blocks when isStatsLoading=true', () => {
      const { container } = renderComponent({ stats: STATS, isStatsLoading: true })
      expect(container.querySelector('.mdk-pm-dashboard__stat-blocks')).not.toBeInTheDocument()
    })

    it('renders divider after stat blocks', () => {
      renderComponent({ stats: STATS })
      const dividers = screen.getAllByTestId('divider')
      expect(dividers.length).toBeGreaterThanOrEqual(1)
    })

    it('does not render divider when stats not provided', () => {
      renderComponent()
      expect(screen.getAllByTestId('divider')).toHaveLength(1)
    })
  })

  // ── Navigation blocks ────────────────────────────────────────────────────

  describe('navigation blocks', () => {
    it('renders all 3 nav blocks', () => {
      const { container } = renderComponent()
      expect(container.querySelectorAll('.mdk-pm-dashboard__nav-block')).toHaveLength(3)
    })

    it('renders nav block titles', () => {
      renderComponent()
      expect(screen.getByText('Pools')).toBeInTheDocument()
      expect(screen.getByText('Site Overview')).toBeInTheDocument()
      expect(screen.getByText('Miner Explorer')).toBeInTheDocument()
    })

    it('renders nav block descriptions', () => {
      renderComponent()
      expect(screen.getByText('Manage pool configurations')).toBeInTheDocument()
      expect(screen.getByText('Search and bulk-assign pools to miners')).toBeInTheDocument()
    })

    it('renders nav action text', () => {
      renderComponent()
      expect(screen.getByText('Configure Pools')).toBeInTheDocument()
      expect(screen.getByText('View Layout')).toBeInTheDocument()
      expect(screen.getByText('Explore Miners')).toBeInTheDocument()
    })

    it('renders arrow icon in each nav action', () => {
      renderComponent()
      expect(screen.getAllByTestId('arrow-right-icon')).toHaveLength(3)
    })

    it('renders nav block icons', () => {
      renderComponent()
      expect(screen.getByTestId('pools-icon')).toBeInTheDocument()
      expect(screen.getByTestId('site-icon')).toBeInTheDocument()
      expect(screen.getByTestId('miner-icon')).toBeInTheDocument()
    })

    it('always renders the second divider', () => {
      const { container } = renderComponent()
      expect(container.querySelectorAll('[data-testid="divider"]')).toHaveLength(1)
    })
  })

  // ── Alerts ───────────────────────────────────────────────────────────────

  describe('alerts', () => {
    it('renders alerts title', () => {
      renderComponent()
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument()
    })

    it('renders empty state when no alerts', () => {
      renderComponent({ alerts: [] })
      expect(screen.getByText('No recent alerts')).toBeInTheDocument()
    })

    it('does not render empty state when alerts present', () => {
      renderComponent({ alerts: ALERTS })
      expect(screen.queryByText('No recent alerts')).not.toBeInTheDocument()
    })

    it('renders alert descriptions', () => {
      renderComponent({ alerts: ALERTS })
      expect(screen.getByText(/Pool connection failed/)).toBeInTheDocument()
      expect(screen.getByText(/All pools dead/)).toBeInTheDocument()
    })

    it('renders miner codes', () => {
      renderComponent({ alerts: ALERTS })
      expect(screen.getByText(/SN-001/)).toBeInTheDocument()
      expect(screen.getByText(/SN-042/)).toBeInTheDocument()
    })

    it('renders alert time via formatDistance', () => {
      renderComponent({ alerts: ALERTS })
      expect(screen.getAllByText('about 5 minutes')).toHaveLength(2)
    })

    it('renders status dot with correct data-severity', () => {
      const { container } = renderComponent({ alerts: ALERTS })
      const dots = container.querySelectorAll('.mdk-pm-dashboard__alert-status')
      expect(dots[0]).toHaveAttribute('data-severity', 'critical')
      expect(dots[1]).toHaveAttribute('data-severity', 'high')
    })

    it('limits alerts to MAX_ALERTS_DISPLAYED (5)', () => {
      const manyAlerts: Alert[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        code: `SN-${i}`,
        severity: 'low' as const,
        description: `Alert ${i}`,
        createdAt: new Date().toISOString(),
      }))
      const { container } = renderComponent({ alerts: manyAlerts })
      expect(container.querySelectorAll('.mdk-pm-dashboard__alert-row')).toHaveLength(5)
    })

    it('renders View All Alerts button', () => {
      renderComponent()
      expect(screen.getByText('View All Alerts')).toBeInTheDocument()
    })

    it('calls onViewAllAlerts when button clicked', () => {
      const onViewAllAlerts = vi.fn()
      renderComponent({ onViewAllAlerts })
      fireEvent.click(screen.getByText('View All Alerts'))
      expect(onViewAllAlerts).toHaveBeenCalledTimes(1)
    })
    it('defaults alerts to empty array when not provided', () => {
      renderComponent()
      expect(screen.getByText('No recent alerts')).toBeInTheDocument()
    })
  })
})
