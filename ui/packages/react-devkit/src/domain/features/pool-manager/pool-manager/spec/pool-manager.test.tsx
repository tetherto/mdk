// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POOL_MANAGER_ROUTES } from '../../../../components/pool-manager/dashboard/dashboard-constants'
import type { Device } from '../../../../types'
import { PoolManager } from '../pool-manager'

vi.mock('../../../../components/pool-manager/dashboard/dashboard', () => ({
  PoolManagerDashboard: ({
    onNavigationClick,
    onViewAllAlerts,
  }: {
    onNavigationClick: (url: string) => void
    onViewAllAlerts: () => void
  }) => (
    <div data-testid="dashboard">
      <button type="button" onClick={() => onNavigationClick(POOL_MANAGER_ROUTES.POOL_ENDPOINTS)}>
        nav-pools
      </button>
      <button type="button" onClick={() => onNavigationClick(POOL_MANAGER_ROUTES.SITES_OVERVIEW)}>
        nav-sites
      </button>
      <button type="button" onClick={() => onNavigationClick(POOL_MANAGER_ROUTES.MINER_EXPLORER)}>
        nav-miners
      </button>
      <button type="button" onClick={onViewAllAlerts}>
        view-alerts
      </button>
    </div>
  ),
}))

vi.mock('../../pools/pool-manager-pools', () => ({
  PoolManagerPools: ({ backButtonClick }: { backButtonClick: () => void }) => (
    <div data-testid="pools-view">
      <button type="button" onClick={backButtonClick}>
        pools-back
      </button>
    </div>
  ),
}))

vi.mock('../../miner-explorer/pool-manager-miner-explorer', () => ({
  PoolManagerMinerExplorer: ({
    miners,
    backButtonClick,
  }: {
    miners: Device[]
    backButtonClick: () => void
  }) => (
    <div data-testid="miners-view">
      <span>miners:{miners.length}</span>
      <button type="button" onClick={backButtonClick}>
        miners-back
      </button>
    </div>
  ),
}))

vi.mock('../../sites-overview/pool-manager-sites-overview', () => ({
  PoolManagerSitesOverview: ({
    onCardClick,
    backButtonClick,
  }: {
    onCardClick: (unitId: string) => void
    backButtonClick: () => void
  }) => (
    <div data-testid="sites-view">
      <button type="button" onClick={() => onCardClick('unit-1')}>
        open-site
      </button>
      <button type="button" onClick={backButtonClick}>
        sites-back
      </button>
    </div>
  ),
}))

vi.mock('../../site-overview-details/pool-manager-site-overview-details', () => ({
  PoolManagerSiteOverviewDetails: ({
    unit,
    backButtonClick,
  }: {
    unit: Device
    backButtonClick: () => void
  }) => (
    <div data-testid="site-detail-view">
      <span>unit:{unit.id}</span>
      <button type="button" onClick={backButtonClick}>
        detail-back
      </button>
    </div>
  ),
}))

const siteDevices = [{ id: 'unit-1', type: 'container', info: { container: 'C1' } }] as Device[]

const renderWrapper = (props: Partial<React.ComponentProps<typeof PoolManager>> = {}) =>
  render(<PoolManager poolConfig={[]} {...props} />)

describe('PoolManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the dashboard by default', () => {
    renderWrapper()
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })

  it('honors an initial view', () => {
    renderWrapper({ initialView: 'pools' })
    expect(screen.getByTestId('pools-view')).toBeInTheDocument()
  })

  it('navigates from the dashboard to the pools view and back', () => {
    renderWrapper()
    fireEvent.click(screen.getByText('nav-pools'))
    expect(screen.getByTestId('pools-view')).toBeInTheDocument()
    fireEvent.click(screen.getByText('pools-back'))
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })

  it('opens the miner explorer with the supplied miners', () => {
    renderWrapper({ miners: [{ id: 'm1' }, { id: 'm2' }] as Device[] })
    fireEvent.click(screen.getByText('nav-miners'))
    expect(screen.getByTestId('miners-view')).toBeInTheDocument()
    expect(screen.getByText('miners:2')).toBeInTheDocument()
  })

  it('drills from sites overview into a resolved site detail and back', () => {
    renderWrapper({ siteDevices })
    fireEvent.click(screen.getByText('nav-sites'))
    fireEvent.click(screen.getByText('open-site'))
    expect(screen.getByTestId('site-detail-view')).toBeInTheDocument()
    expect(screen.getByText('unit:unit-1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('detail-back'))
    expect(screen.getByTestId('sites-view')).toBeInTheDocument()
  })

  it('falls back to sites overview when the selected unit cannot be resolved', () => {
    renderWrapper()
    fireEvent.click(screen.getByText('nav-sites'))
    fireEvent.click(screen.getByText('open-site'))
    expect(screen.queryByTestId('site-detail-view')).not.toBeInTheDocument()
    expect(screen.getByTestId('sites-view')).toBeInTheDocument()
  })

  it('notifies onViewChange and onSiteSelect', () => {
    const onViewChange = vi.fn()
    const onSiteSelect = vi.fn()
    renderWrapper({ siteDevices, onViewChange, onSiteSelect })
    fireEvent.click(screen.getByText('nav-sites'))
    expect(onViewChange).toHaveBeenCalledWith('sites-overview')
    fireEvent.click(screen.getByText('open-site'))
    expect(onSiteSelect).toHaveBeenCalledWith('unit-1')
    expect(onViewChange).toHaveBeenCalledWith('site-detail')
  })

  it('fires onViewAllAlerts from the dashboard', () => {
    const onViewAllAlerts = vi.fn()
    renderWrapper({ onViewAllAlerts })
    fireEvent.click(screen.getByText('view-alerts'))
    expect(onViewAllAlerts).toHaveBeenCalledTimes(1)
  })

  it('syncs internal state when the controlled view prop changes', () => {
    const { rerender } = render(<PoolManager poolConfig={[]} view="dashboard" />)
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()

    rerender(<PoolManager poolConfig={[]} view="pools" />)
    expect(screen.getByTestId('pools-view')).toBeInTheDocument()

    rerender(<PoolManager poolConfig={[]} view="miner-explorer" />)
    expect(screen.getByTestId('miners-view')).toBeInTheDocument()
  })
})
