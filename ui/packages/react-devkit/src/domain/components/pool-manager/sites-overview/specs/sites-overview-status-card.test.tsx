import { UNITS } from '@primitives/index'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SITE_OVERVIEW_STATUS_LABELS, SITE_OVERVIEW_STATUSES } from '../../pool-manager-constants'
import { SitesOverviewStatusCard } from '../sites-overview-status-card'

describe('SitesOverviewStatusCard', () => {
  const defaultProps = {
    unit: 'Unit-01',
    hashrate: `150 ${UNITS.HASHRATE_TH_S}`,
    miners: '5/5',
    pool: 'AntPool',
    overrides: 0,
    checked: false,
    onSelect: vi.fn(),
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all basic information correctly', () => {
    render(<SitesOverviewStatusCard {...defaultProps} />)

    expect(screen.getByText('Unit-01')).toBeInTheDocument()
    expect(screen.getByText('AntPool')).toBeInTheDocument()
    expect(screen.getByText(`150 ${UNITS.HASHRATE_TH_S}`)).toBeInTheDocument()
    expect(screen.getByText('5/5')).toBeInTheDocument()
  })

  it('renders the correct status label and color', () => {
    const statusKey = SITE_OVERVIEW_STATUSES.EMPTY

    render(<SitesOverviewStatusCard {...defaultProps} status={statusKey} />)

    const expectedLabel = SITE_OVERVIEW_STATUS_LABELS[statusKey]

    if (!expectedLabel) {
      throw new Error(
        `Status label for key "${statusKey}" is undefined in SITE_OVERVIEW_STATUS_LABELS`,
      )
    }

    const badge = screen.getByText(expectedLabel)
    expect(badge).toBeInTheDocument()
  })

  it('handles card click event', () => {
    render(<SitesOverviewStatusCard {...defaultProps} />)

    const card = screen.getByText('Unit-01').closest('.mdk-pm-status-card')
    fireEvent.click(card!)

    expect(defaultProps.onClick).toHaveBeenCalledTimes(1)
  })

  it('calls onSelect and stops propagation when checkbox is clicked', () => {
    render(<SitesOverviewStatusCard {...defaultProps} selectable={true} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(defaultProps.onSelect).toHaveBeenCalledWith(true)
    expect(defaultProps.onClick).not.toHaveBeenCalled()
  })

  it('hides checkbox when selectable is false', () => {
    render(<SitesOverviewStatusCard {...defaultProps} selectable={false} />)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('applies highlight class when overrides are present', () => {
    const { container } = render(<SitesOverviewStatusCard {...defaultProps} overrides={5} />)

    const overrideItem = container.querySelector('.mdk-pm-status-card__info-item--highlight')

    expect(overrideItem).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('does not apply highlight class when overrides are 0 or null', () => {
    const { container } = render(<SitesOverviewStatusCard {...defaultProps} overrides={0} />)

    const highlightItem = container.querySelector('.mdk-pm-status-card__info-item--highlight')
    expect(highlightItem).not.toBeInTheDocument()
  })
})
