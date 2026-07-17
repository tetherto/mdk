import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Label } from '../index'

describe('label', () => {
  it('renders label with text', () => {
    render(<Label>Email Address</Label>)
    expect(screen.getByText('Email Address')).toBeInTheDocument()
  })

  it('associates with input via htmlFor attribute', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    )
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Label className="custom-label">Custom</Label>)
    const label = container.querySelector('label')
    expect(label).toHaveClass('custom-label')
    expect(label).toHaveClass('mdk-label')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Label ref={ref}>Label</Label>)
    expect(ref).toHaveBeenCalled()
  })

  it('passes through additional HTML attributes', () => {
    render(<Label data-testid="custom-label">Test Label</Label>)
    expect(screen.getByTestId('custom-label')).toBeInTheDocument()
  })

  it('renders children correctly', () => {
    render(
      <Label>
        Required <span style={{ color: 'red' }}>*</span>
      </Label>,
    )
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('works with nested components', () => {
    render(
      <Label htmlFor="name">
        <strong>Full Name</strong>
      </Label>,
    )
    const strong = screen.getByText('Full Name')
    expect(strong.tagName).toBe('STRONG')
  })
})
