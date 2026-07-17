import { CURRENCY, UNITS } from '@primitives'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { CostSummaryDisplayMetrics } from '../build-cost-summary-view-model'
import { CostMetrics } from '../cost-metrics'

const USD_PER_MWH = `${CURRENCY.USD}/${UNITS.ENERGY_MWH}`

const buildMetrics = (
  overrides: Partial<CostSummaryDisplayMetrics> = {},
): CostSummaryDisplayMetrics => ({
  allInCost: { label: 'All-in Cost', unit: USD_PER_MWH, value: 18, isHighlighted: true },
  energyCost: { label: 'Energy Cost', unit: USD_PER_MWH, value: 12 },
  operationsCost: { label: 'Operations Cost', unit: USD_PER_MWH, value: 6 },
  ...overrides,
})

describe('CostMetrics', () => {
  it('renders one tile per cost metric in display order', () => {
    render(<CostMetrics metrics={buildMetrics()} />)

    const labels = screen
      .getAllByText(/Cost$/i)
      .filter((el) => el.classList.contains('mdk-single-stat-card__name'))
      .map((el) => el.textContent)

    expect(labels).toEqual(['All-in Cost', 'Energy Cost', 'Operations Cost'])
  })

  it('renders every tile with the highlighted variant for consistent value sizing', () => {
    const { container } = render(<CostMetrics metrics={buildMetrics()} />)

    expect(container.querySelectorAll('.mdk-single-stat-card--highlighted')).toHaveLength(3)
    expect(container.querySelectorAll('.mdk-single-stat-card--primary')).toHaveLength(0)
  })

  it('applies the primary accent color only to the highlighted metric tile', () => {
    const { container } = render(<CostMetrics metrics={buildMetrics()} />)

    const cards = container.querySelectorAll<HTMLElement>('.mdk-single-stat-card')
    expect(cards[0]?.style.getPropertyValue('--stat-color')).toBe('var(--mdk-color-primary)')
    expect(cards[1]?.style.getPropertyValue('--stat-color')).toBe('inherit')
    expect(cards[2]?.style.getPropertyValue('--stat-color')).toBe('inherit')
  })

  it('drops the accent color when no metric is flagged isHighlighted', () => {
    const metrics = buildMetrics({
      allInCost: { label: 'All-in Cost', unit: USD_PER_MWH, value: 18 },
    })
    const { container } = render(<CostMetrics metrics={metrics} />)

    const cards = container.querySelectorAll<HTMLElement>('.mdk-single-stat-card')
    cards.forEach((card) => {
      expect(card.style.getPropertyValue('--stat-color')).toBe('inherit')
    })
  })
})
