import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EnergyReport } from '../energy-report'
import { ENERGY_REPORT_TAB_TYPES } from '../energy-report.constants'

describe('EnergyReport composite', () => {
  it('renders the three tab triggers', () => {
    render(<EnergyReport />)
    const tabs = screen.getAllByRole('tab').map((el) => el.textContent)
    expect(tabs).toEqual(['Site View', 'Miner Type View', 'Miner Unit View'])
  })

  it('defaults to Site View', () => {
    render(<EnergyReport />)
    expect(screen.getByRole('tab', { name: 'Site View' })).toHaveAttribute('data-state', 'active')
  })

  it('honors defaultTab', () => {
    render(<EnergyReport defaultTab={ENERGY_REPORT_TAB_TYPES.MINER_TYPE_VIEW} />)
    expect(screen.getByRole('tab', { name: 'Miner Type View' })).toHaveAttribute(
      'data-state',
      'active',
    )
  })

  it('shows site date controls only on site tab', () => {
    render(<EnergyReport />)
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })
})
