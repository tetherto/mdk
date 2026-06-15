import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MdkWordmark } from '../index'

describe('MdkWordmark', () => {
  describe('rendering', () => {
    it('renders an <svg> element with the base class', () => {
      const { container } = render(<MdkWordmark />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('mdk-wordmark')
    })

    it('renders the MDK text inside the SVG', () => {
      const { container } = render(<MdkWordmark />)

      expect(container.querySelector('text')?.textContent).toBe('MDK')
    })
  })

  describe('size variants', () => {
    it("uses size 'md' and height 32 by default", () => {
      const { container } = render(<MdkWordmark />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('mdk-wordmark--md')
      expect(svg).toHaveAttribute('height', '32')
    })

    it('applies sm modifier and height 24', () => {
      const { container } = render(<MdkWordmark size="sm" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('mdk-wordmark--sm')
      expect(svg).toHaveAttribute('height', '24')
    })

    it('applies lg modifier and height 64', () => {
      const { container } = render(<MdkWordmark size="lg" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('mdk-wordmark--lg')
      expect(svg).toHaveAttribute('height', '64')
    })
  })

  describe('title / accessible label', () => {
    it("defaults the aria-label and <title> to 'MDK'", () => {
      render(<MdkWordmark />)

      const svg = screen.getByRole('img', { name: 'MDK' })
      expect(svg).toHaveAttribute('aria-label', 'MDK')
      expect(svg.querySelector('title')?.textContent).toBe('MDK')
    })

    it('honours a custom title prop', () => {
      render(<MdkWordmark title="Custom Brand" />)

      const svg = screen.getByRole('img', { name: 'Custom Brand' })
      expect(svg).toHaveAttribute('aria-label', 'Custom Brand')
      expect(svg.querySelector('title')?.textContent).toBe('Custom Brand')
    })
  })

  describe('className', () => {
    it('merges a custom className with the base class', () => {
      const { container } = render(<MdkWordmark className="extra" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('mdk-wordmark')
      expect(svg).toHaveClass('extra')
    })

    it('renders cleanly without a className', () => {
      const { container } = render(<MdkWordmark />)

      const svg = container.querySelector('svg')
      expect(svg?.className.baseVal ?? svg?.getAttribute('class') ?? '').not.toContain('undefined')
    })
  })
})
