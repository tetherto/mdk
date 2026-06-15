import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import * as Separator from '../index'

describe('separator', () => {
  it('exports Separator components from Radix UI', () => {
    expect(Separator.Root).toBeDefined()
    expect(Separator.Separator).toBeDefined()
  })

  it('renders horizontal separator by default', () => {
    const { container } = render(<Separator.Root />)
    const separator = container.firstChild
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('renders vertical separator when orientation is vertical', () => {
    const { container } = render(<Separator.Root orientation="vertical" />)
    const separator = container.firstChild
    expect(separator).toHaveAttribute('data-orientation', 'vertical')
  })

  it('applies separator role by default (decorative is true by default)', () => {
    const { container } = render(<Separator.Root />)
    const separator = container.firstChild
    // Radix UI Separator has role="separator" by default
    expect(separator).toHaveAttribute('role', 'separator')
  })

  it('applies separator role when decorative is false', () => {
    const { container } = render(<Separator.Root decorative={false} />)
    const separator = container.firstChild
    expect(separator).toHaveAttribute('role', 'separator')
  })
})
