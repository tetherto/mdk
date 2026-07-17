import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteOverviewDetailsLegend } from '../site-overview-details-legend/site-overview-details-legend'

describe('SiteOverviewDetailsLegend', () => {
  describe('rendering', () => {
    it('renders the legend wrapper', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      expect(container.querySelector('.mdk-site-overview-details-legend')).toBeInTheDocument()
    })

    it('renders exactly 4 legend items', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      expect(container.querySelectorAll('.mdk-site-overview-details-legend__item')).toHaveLength(4)
    })
  })

  describe('labels', () => {
    it('renders "Offline" label', () => {
      render(<SiteOverviewDetailsLegend />)
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('renders "Empty" label', () => {
      render(<SiteOverviewDetailsLegend />)
      expect(screen.getByText('Empty')).toBeInTheDocument()
    })

    it('renders "Not Mining (Sleep + Error)" label', () => {
      render(<SiteOverviewDetailsLegend />)
      expect(screen.getByText('Not Mining (Sleep + Error)')).toBeInTheDocument()
    })

    it('renders "Online" label', () => {
      render(<SiteOverviewDetailsLegend />)
      expect(screen.getByText('Online')).toBeInTheDocument()
    })
  })

  describe('status modifier classes', () => {
    it('applies offline status class', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      expect(
        container.querySelector('.mdk-site-overview-details-legend__item--offline'),
      ).toBeInTheDocument()
    })

    it('applies empty status class', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      expect(
        container.querySelector('.mdk-site-overview-details-legend__item--empty'),
      ).toBeInTheDocument()
    })

    it('applies not_mining status class', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      expect(
        container.querySelector('.mdk-site-overview-details-legend__item--not_mining'),
      ).toBeInTheDocument()
    })

    it('applies mining status class', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      expect(
        container.querySelector('.mdk-site-overview-details-legend__item--mining'),
      ).toBeInTheDocument()
    })
  })

  describe('bordered modifier', () => {
    it('applies bordered class only to the "Empty" item', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      const bordered = container.querySelectorAll(
        '.mdk-site-overview-details-legend__item--bordered',
      )
      expect(bordered).toHaveLength(1)
      expect(bordered[0]).toHaveTextContent('Empty')
    })

    it('does not apply bordered class to "Offline" item', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      const offline = container.querySelector('.mdk-site-overview-details-legend__item--offline')
      expect(offline).not.toHaveClass('mdk-site-overview-details-legend__item--bordered')
    })

    it('does not apply bordered class to "Not Mining" item', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      const notMining = container.querySelector(
        '.mdk-site-overview-details-legend__item--not_mining',
      )
      expect(notMining).not.toHaveClass('mdk-site-overview-details-legend__item--bordered')
    })

    it('does not apply bordered class to "Online" item', () => {
      const { container } = render(<SiteOverviewDetailsLegend />)
      const mining = container.querySelector('.mdk-site-overview-details-legend__item--mining')
      expect(mining).not.toHaveClass('mdk-site-overview-details-legend__item--bordered')
    })
  })

  describe('item order', () => {
    it('renders items in correct order: Offline, Empty, Not Mining, Online', () => {
      render(<SiteOverviewDetailsLegend />)
      const items = screen.getAllByText(/Offline|Empty|Not Mining|Online/)
      expect(items[0]).toHaveTextContent('Offline')
      expect(items[1]).toHaveTextContent('Empty')
      expect(items[2]).toHaveTextContent('Not Mining (Sleep + Error)')
      expect(items[3]).toHaveTextContent('Online')
    })
  })
})
