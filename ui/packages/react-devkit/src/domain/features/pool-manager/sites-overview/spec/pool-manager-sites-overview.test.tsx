import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PoolManagerSitesOverview } from '../pool-manager-sites-overview' // Adjusted path

vi.mock('../sites-overview-status-card-list', () => ({
  SitesOverviewStatusCardList: vi.fn(({ units, isLoading, error }) => (
    <div data-testid="mock-status-card-list">
      <span>Unit Count: {units?.length ?? 0}</span>
      {isLoading && <span>Loading...</span>}
      {error && <span>Error State</span>}
    </div>
  )),
}))

describe('PoolManagerSitesOverview', () => {
  const mockBackButtonClick = vi.fn()
  const mockOnCardClick = vi.fn()

  const defaultProps = {
    units: [],
    poolConfig: [],
    isLoading: false,
    error: null,
    backButtonClick: mockBackButtonClick,
    onCardClick: mockOnCardClick,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the header title and back button', () => {
    render(<PoolManagerSitesOverview {...defaultProps} />)
    expect(screen.getByText('Site Overview')).toBeInTheDocument()
  })

  it('calls backButtonClick when the back button is clicked', () => {
    render(<PoolManagerSitesOverview {...defaultProps} />)
    const backButton = screen.getByRole('button', { name: /pool manager/i })
    fireEvent.click(backButton)
    expect(mockBackButtonClick).toHaveBeenCalledTimes(1)
  })
})
