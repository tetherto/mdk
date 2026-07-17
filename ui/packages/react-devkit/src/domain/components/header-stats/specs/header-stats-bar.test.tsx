import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeaderStatsBar } from '../header-stats-bar'

describe('HeaderStatsBar', () => {
  describe('rendering', () => {
    it('renders the wrapper with the base class', () => {
      const { container } = render(
        <HeaderStatsBar>
          <span data-testid="child">a</span>
        </HeaderStatsBar>,
      )

      expect(container.querySelector('.mdk-header-stats-bar')).toBeInTheDocument()
    })

    it('renders each provided child', () => {
      render(
        <HeaderStatsBar>
          <span data-testid="child-1">A</span>
          <span data-testid="child-2">B</span>
          <span data-testid="child-3">C</span>
        </HeaderStatsBar>,
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })
  })

  describe('dividers', () => {
    it('renders one divider per rendered child', () => {
      const { container } = render(
        <HeaderStatsBar>
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </HeaderStatsBar>,
      )

      expect(container.querySelectorAll('.mdk-header-stats-bar__divider')).toHaveLength(3)
    })

    it('renders a single divider when there is only one child', () => {
      const { container } = render(
        <HeaderStatsBar>
          <span>only</span>
        </HeaderStatsBar>,
      )

      expect(container.querySelectorAll('.mdk-header-stats-bar__divider')).toHaveLength(1)
    })

    it('filters out falsy children before counting dividers', () => {
      const { container } = render(
        <HeaderStatsBar>
          <span>A</span>
          {false}
          {null}
          <span>B</span>
        </HeaderStatsBar>,
      )

      expect(container.querySelectorAll('.mdk-header-stats-bar__divider')).toHaveLength(2)
    })

    it('renders no dividers when every child is falsy', () => {
      const { container } = render(
        <HeaderStatsBar>
          {false}
          {null}
        </HeaderStatsBar>,
      )

      expect(container.querySelectorAll('.mdk-header-stats-bar__divider')).toHaveLength(0)
    })
  })

  describe('className', () => {
    it('merges a custom className with the base class', () => {
      const { container } = render(
        <HeaderStatsBar className="custom">
          <span>x</span>
        </HeaderStatsBar>,
      )

      const wrapper = container.querySelector('.mdk-header-stats-bar')
      expect(wrapper).toHaveClass('mdk-header-stats-bar')
      expect(wrapper).toHaveClass('custom')
    })

    it('renders without a className', () => {
      const { container } = render(
        <HeaderStatsBar>
          <span>x</span>
        </HeaderStatsBar>,
      )

      const wrapper = container.querySelector('.mdk-header-stats-bar')
      expect(wrapper?.className).not.toContain('undefined')
    })
  })
})
