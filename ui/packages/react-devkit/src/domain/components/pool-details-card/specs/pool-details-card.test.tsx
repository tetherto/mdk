import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PoolDetailsCard } from '../index'
import type { PoolDetailItem } from '../index'

const details: PoolDetailItem[] = [
  { title: 'URL', value: 'stratum+tcp://eu.example.pool:3333' },
  { title: 'Worker', value: 'rig-01' },
  { title: 'Fee', value: '1.5 %' },
  { title: 'Active workers', value: 42 },
  { title: 'Pool status', value: 'Healthy' },
]

describe('PoolDetailsCard', () => {
  describe('rendering', () => {
    it('renders the wrapper with the base class', () => {
      const { container } = render(<PoolDetailsCard details={details} />)

      expect(container.querySelector('.mdk-pool-details-card')).toBeInTheDocument()
    })

    it('renders the list region', () => {
      const { container } = render(<PoolDetailsCard details={details} />)

      expect(container.querySelector('.mdk-pool-details-card__list')).toBeInTheDocument()
    })

    it('forwards ref to the root element', () => {
      const ref = { current: null as HTMLDivElement | null }
      render(<PoolDetailsCard ref={ref} details={details} />)

      expect(ref.current).not.toBeNull()
      expect(ref.current).toHaveClass('mdk-pool-details-card')
    })

    it('forwards extra props to the root element', () => {
      const { container } = render(<PoolDetailsCard details={details} data-testid="my-card" />)

      expect(container.querySelector('[data-testid="my-card"]')).toBeInTheDocument()
    })

    it('merges a custom className alongside the base class', () => {
      const { container } = render(<PoolDetailsCard details={details} className="extra" />)

      const root = container.querySelector('.mdk-pool-details-card')
      expect(root).toHaveClass('extra')
    })

    it('exposes a stable displayName', () => {
      expect(PoolDetailsCard.displayName).toBe('PoolDetailsCard')
    })
  })

  describe('label / header', () => {
    it('does not render the header when label is omitted', () => {
      const { container } = render(<PoolDetailsCard details={details} />)

      expect(container.querySelector('.mdk-pool-details-card__header')).not.toBeInTheDocument()
    })

    it('does not render the header when label is empty string', () => {
      const { container } = render(<PoolDetailsCard details={details} label="" />)

      expect(container.querySelector('.mdk-pool-details-card__header')).not.toBeInTheDocument()
    })

    it('renders the header and label text when label is provided', () => {
      const { container } = render(<PoolDetailsCard details={details} label="Primary pool" />)

      expect(container.querySelector('.mdk-pool-details-card__header')).toBeInTheDocument()
      expect(screen.getByText('Primary pool')).toBeInTheDocument()
    })

    it('does not apply the underline modifier by default', () => {
      const { container } = render(<PoolDetailsCard details={details} label="Primary pool" />)

      const header = container.querySelector('.mdk-pool-details-card__header')
      expect(header).not.toHaveClass('mdk-pool-details-card__header--underline')
    })

    it('applies the underline modifier when underline=true', () => {
      const { container } = render(
        <PoolDetailsCard details={details} label="Primary pool" underline />,
      )

      const header = container.querySelector('.mdk-pool-details-card__header')
      expect(header).toHaveClass('mdk-pool-details-card__header--underline')
    })

    it('does not apply the underline modifier when underline=false', () => {
      const { container } = render(
        <PoolDetailsCard details={details} label="Primary pool" underline={false} />,
      )

      const header = container.querySelector('.mdk-pool-details-card__header')
      expect(header).not.toHaveClass('mdk-pool-details-card__header--underline')
    })
  })

  describe('empty state', () => {
    it('renders the empty-state placeholder when details is empty', () => {
      const { container } = render(<PoolDetailsCard details={[]} />)

      expect(container.querySelector('.mdk-pool-details-card__empty')).toBeInTheDocument()
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('does not render any list items when details is empty', () => {
      const { container } = render(<PoolDetailsCard details={[]} />)

      expect(container.querySelectorAll('.mdk-pool-details-card__item')).toHaveLength(0)
    })
  })

  describe('populated list', () => {
    it('renders one item per detail entry', () => {
      const { container } = render(<PoolDetailsCard details={details} />)

      expect(container.querySelectorAll('.mdk-pool-details-card__item')).toHaveLength(
        details.length,
      )
    })

    it('renders each item title with a trailing colon', () => {
      render(<PoolDetailsCard details={details} />)

      expect(screen.getByText('URL:')).toBeInTheDocument()
      expect(screen.getByText('Worker:')).toBeInTheDocument()
      expect(screen.getByText('Fee:')).toBeInTheDocument()
    })

    it('renders string values as-is', () => {
      render(<PoolDetailsCard details={details} />)

      expect(screen.getByText('stratum+tcp://eu.example.pool:3333')).toBeInTheDocument()
      expect(screen.getByText('rig-01')).toBeInTheDocument()
    })

    it('stringifies numeric values', () => {
      render(<PoolDetailsCard details={[{ title: 'Active workers', value: 42 }]} />)

      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('stringifies the numeric value 0', () => {
      render(<PoolDetailsCard details={[{ title: 'Errors', value: 0 }]} />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('renders a dash placeholder when value is undefined', () => {
      const { container } = render(<PoolDetailsCard details={[{ title: 'Missing' }]} />)

      const value = container.querySelector('.mdk-pool-details-card__item-value')
      expect(value?.textContent).toBe('-')
    })

    it('renders a dash placeholder when value is an empty string', () => {
      const { container } = render(<PoolDetailsCard details={[{ title: 'Blank', value: '' }]} />)

      const value = container.querySelector('.mdk-pool-details-card__item-value')
      expect(value?.textContent).toBe('-')
    })
  })
})
