import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Hashrate } from '../hashrate'
import { HASHRATE_TAB_TYPES } from '../hashrate.constants'

describe('Hashrate composite', () => {
  it('renders the three tab triggers in declaration order', () => {
    render(<Hashrate />)

    const tabs = screen.getAllByRole('tab').map((el) => el.textContent)
    expect(tabs).toEqual(['Site View', 'Miner Type View', 'Mining Unit View'])
  })

  it('defaults to the Site View tab as the active trigger', () => {
    render(<Hashrate />)

    const siteTab = screen.getByRole('tab', { name: 'Site View' })
    expect(siteTab).toHaveAttribute('data-state', 'active')
  })

  it('honors a different defaultTab when provided', () => {
    render(<Hashrate defaultTab={HASHRATE_TAB_TYPES.MINER_TYPE_VIEW} />)

    expect(screen.getByRole('tab', { name: 'Miner Type View' })).toHaveAttribute(
      'data-state',
      'active',
    )
  })

  it('forwards per-tab props to the child views', () => {
    render(
      <Hashrate
        miningUnitView={{ isLoading: true }}
        defaultTab={HASHRATE_TAB_TYPES.MINING_UNIT_VIEW}
      />,
    )

    expect(screen.getByText('Hashrate by Mining Unit')).toBeInTheDocument()
  })
})
