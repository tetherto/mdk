import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Ebitda } from '../ebitda'
import type { EbitdaProps } from '../ebitda'

const buildProps = (overrides: Partial<EbitdaProps> = {}): EbitdaProps => ({
  metrics: null,
  ebitdaChartInput: null,
  btcProducedChartInput: null,
  hasBtcProducedAllZeros: false,
  showEbitdaBarChart: true,
  currentBTCPrice: 50_000,
  datePicker: <div data-testid="date-picker" />,
  hasDateSelection: true,
  ...overrides,
})

describe('Ebitda composite page', () => {
  it('renders the title and date-picker slot', () => {
    render(<Ebitda {...buildProps()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'EBITDA' })).toBeInTheDocument()
    expect(screen.getByTestId('date-picker')).toBeInTheDocument()
  })

  it('shows the loading spinner when isLoading is true', () => {
    render(<Ebitda {...buildProps({ isLoading: true })} />)
    const region = screen.getByText('EBITDA').closest('.mdk-ebitda')
    expect(region?.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('shows the Set Monthly Cost link when setCostHref is provided', () => {
    render(<Ebitda {...buildProps({ setCostHref: '/cost' })} />)
    expect(screen.getByRole('link', { name: /set monthly cost/i })).toHaveAttribute('href', '/cost')
  })

  it('hides the Set Monthly Cost link when setCostHref is omitted', () => {
    render(<Ebitda {...buildProps()} />)
    expect(screen.queryByRole('link', { name: /set monthly cost/i })).not.toBeInTheDocument()
  })

  it('renders the period-selection hint when hasDateSelection is false', () => {
    render(<Ebitda {...buildProps({ hasDateSelection: false })} />)
    expect(screen.getByText(/please select a time period/i)).toBeInTheDocument()
  })

  it('renders the error banner when errors are present', () => {
    render(<Ebitda {...buildProps({ errors: ['timeout'] })} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/error loading ebitda data/i)
    expect(screen.getByText('• timeout')).toBeInTheDocument()
  })

  it('shows the no-data fallback when hasDateSelection is true but metrics is null', () => {
    render(<Ebitda {...buildProps()} />)
    expect(screen.getByRole('status')).toHaveTextContent(/no data available/i)
  })
})
