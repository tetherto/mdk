import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PoolManagerSiteOverviewDetailsProps } from '../pool-manager-site-overview-details'
import { PoolManagerSiteOverviewDetails } from '../pool-manager-site-overview-details'

vi.mock('@primitives/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives/index')>()
  return {
    ...actual,
    Loader: vi.fn(() => <div data-testid="loader" />),
    Button: vi.fn(({ children, onClick, icon }) => (
      <button data-testid="back-btn" onClick={onClick}>
        {icon}
        {children}
      </button>
    )),
  }
})

vi.mock('@radix-ui/react-icons', () => ({
  ArrowLeftIcon: vi.fn(() => <svg data-testid="arrow-left-icon" />),
}))

vi.mock('@domain/components/pool-manager/site-overview-details/site-overview-details-container', () => ({
  SiteOverviewDetailsContainer: vi.fn(({ unit, poolConfig }) => (
    <div
      data-testid="site-overview-details-container"
      data-unit-id={(unit as { id?: string } | undefined)?.id ?? ''}
      data-pool-config-length={poolConfig?.length ?? 0}
    />
  )),
}))

const makeProps = (
  overrides: Partial<PoolManagerSiteOverviewDetailsProps> = {},
): PoolManagerSiteOverviewDetailsProps => ({
  unit: { id: 'unit-1', type: 'container-bd' } as never,
  unitName: 'BD Container 01',
  poolConfig: [],
  isLoading: false,
  backButtonClick: vi.fn(),
  ...overrides,
})

const renderComponent = (overrides: Partial<PoolManagerSiteOverviewDetailsProps> = {}) =>
  render(<PoolManagerSiteOverviewDetails {...makeProps(overrides)} />)

describe('PoolManagerSiteOverviewDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the root wrapper', () => {
      const { container } = renderComponent()
      expect(container.querySelector('.mdk-pm-sod')).toBeInTheDocument()
    })

    it('renders the header', () => {
      const { container } = renderComponent()
      expect(container.querySelector('.mdk-pm-sod__header')).toBeInTheDocument()
    })

    it('renders back button with "Site Overview" label', () => {
      renderComponent()
      expect(screen.getByTestId('back-btn')).toHaveTextContent('Site Overview')
    })

    it('renders ArrowLeftIcon inside back button', () => {
      renderComponent()
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
    })
  })

  // ── Unit name ───────────────────────────────────────────────────────────────

  describe('unit name', () => {
    it('renders unit name in subtitle when provided', () => {
      renderComponent({ unitName: 'My Container' })
      expect(screen.getByText('/ My Container', { exact: false })).toBeInTheDocument()
    })

    it('renders nothing extra in subtitle when unitName is empty string', () => {
      renderComponent({ unitName: '' })
      expect(screen.queryByText(/\//)).not.toBeInTheDocument()
    })

    it('renders nothing extra in subtitle when unitName is undefined', () => {
      renderComponent({ unitName: undefined })
      expect(screen.queryByText(/\//)).not.toBeInTheDocument()
    })
  })

  // ── Loading state ───────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders Loader when isLoading is true', () => {
      renderComponent({ isLoading: true })
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('does not render SiteOverviewDetailsContainer when isLoading is true', () => {
      renderComponent({ isLoading: true })
      expect(screen.queryByTestId('site-overview-details-container')).not.toBeInTheDocument()
    })

    it('renders SiteOverviewDetailsContainer when isLoading is false', () => {
      renderComponent({ isLoading: false })
      expect(screen.getByTestId('site-overview-details-container')).toBeInTheDocument()
    })

    it('does not render Loader when isLoading is false', () => {
      renderComponent({ isLoading: false })
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument()
    })

    it('renders SiteOverviewDetailsContainer when isLoading is undefined', () => {
      renderComponent({ isLoading: undefined })
      expect(screen.getByTestId('site-overview-details-container')).toBeInTheDocument()
    })
  })

  describe('props forwarding', () => {
    it('passes unit to SiteOverviewDetailsContainer', () => {
      renderComponent({ unit: { id: 'unit-42' } as never })
      expect(screen.getByTestId('site-overview-details-container').dataset.unitId).toBe('unit-42')
    })

    it('passes poolConfig length to SiteOverviewDetailsContainer', () => {
      renderComponent({ poolConfig: [{} as never, {} as never, {} as never] })
      expect(screen.getByTestId('site-overview-details-container').dataset.poolConfigLength).toBe(
        '3',
      )
    })

    it('passes empty poolConfig to SiteOverviewDetailsContainer', () => {
      renderComponent({ poolConfig: [] })
      expect(screen.getByTestId('site-overview-details-container').dataset.poolConfigLength).toBe(
        '0',
      )
    })
  })

  describe('back button', () => {
    it('calls backButtonClick when back button is clicked', () => {
      const backButtonClick = vi.fn()
      renderComponent({ backButtonClick })
      fireEvent.click(screen.getByTestId('back-btn'))
      expect(backButtonClick).toHaveBeenCalledOnce()
    })

    it('does not call backButtonClick when not clicked', () => {
      const backButtonClick = vi.fn()
      renderComponent({ backButtonClick })
      expect(backButtonClick).not.toHaveBeenCalled()
    })
  })
})
