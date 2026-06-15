import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Typography } from '../index'

describe('typography', () => {
  it('renders with children', () => {
    render(<Typography>Text content</Typography>)
    expect(screen.getByText('Text content')).toBeInTheDocument()
  })

  it('renders heading1 variant as h1 element', () => {
    const { container } = render(<Typography variant="heading1">Heading 1</Typography>)
    expect(container.querySelector('h1')).toHaveTextContent('Heading 1')
  })

  it('renders heading2 variant as h2 element', () => {
    const { container } = render(<Typography variant="heading2">Heading 2</Typography>)
    expect(container.querySelector('h2')).toHaveTextContent('Heading 2')
  })

  it('renders heading3 variant as h3 element', () => {
    const { container } = render(<Typography variant="heading3">Heading 3</Typography>)
    expect(container.querySelector('h3')).toHaveTextContent('Heading 3')
  })

  it('renders body variant as p element', () => {
    const { container } = render(<Typography variant="body">Body text</Typography>)
    expect(container.querySelector('p')).toHaveTextContent('Body text')
  })

  it('renders secondary variant as p element', () => {
    const { container } = render(<Typography variant="secondary">Secondary text</Typography>)
    expect(container.querySelector('p')).toHaveTextContent('Secondary text')
  })

  it('renders caption variant as span element', () => {
    const { container } = render(<Typography variant="caption">Caption text</Typography>)
    expect(container.querySelector('span')).toHaveTextContent('Caption text')
  })

  it('defaults to body variant', () => {
    const { container } = render(<Typography>Default</Typography>)
    expect(container.querySelector('p')).toHaveTextContent('Default')
    expect(container.querySelector('.mdk-typography--body')).toBeInTheDocument()
  })

  it('applies variant classes correctly', () => {
    const { container } = render(<Typography variant="heading1">Heading</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--heading1')
  })

  it('applies size classes when provided', () => {
    const { container, rerender } = render(<Typography size="xs">Extra Small</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--size-xs')

    rerender(<Typography size="sm">Small</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--size-sm')

    rerender(<Typography size="md">Medium</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--size-md')

    rerender(<Typography size="lg">Large</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--size-lg')

    rerender(<Typography size="xl">Extra Large</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--size-xl')

    rerender(<Typography size="2xl">2XL</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--size-2xl')

    rerender(<Typography size="3xl">3XL</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--size-3xl')

    rerender(<Typography size="4xl">4XL</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--size-4xl')
  })

  it('applies weight classes when provided', () => {
    const { container, rerender } = render(<Typography weight="light">Light</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--weight-light')

    rerender(<Typography weight="normal">Normal</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--weight-normal')

    rerender(<Typography weight="medium">Medium</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--weight-medium')

    rerender(<Typography weight="semibold">Semibold</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--weight-semibold')

    rerender(<Typography weight="bold">Bold</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--weight-bold')
  })

  it('applies align classes when provided', () => {
    const { container, rerender } = render(<Typography align="left">Left</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--align-left')

    rerender(<Typography align="center">Center</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--align-center')

    rerender(<Typography align="right">Right</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--align-right')
  })

  it('applies color classes correctly', () => {
    const { container } = render(<Typography color="primary">Primary</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--color-primary')
  })

  it('defaults to default color', () => {
    const { container } = render(<Typography>Text</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--color-default')
  })

  it('applies truncate class when truncate is true', () => {
    const { container } = render(<Typography truncate>Truncated text</Typography>)
    expect(container.firstChild).toHaveClass('mdk-typography--truncate')
  })

  it('does not apply truncate class by default', () => {
    const { container } = render(<Typography>Not truncated</Typography>)
    expect(container.firstChild).not.toHaveClass('mdk-typography--truncate')
  })

  it('applies custom className', () => {
    const { container } = render(<Typography className="custom-text">Custom</Typography>)
    expect(container.firstChild).toHaveClass('custom-text')
    expect(container.firstChild).toHaveClass('mdk-typography')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Typography ref={ref}>With Ref</Typography>)
    expect(ref).toHaveBeenCalled()
  })

  it('passes through additional HTML attributes', () => {
    render(<Typography data-testid="custom-typography">Test</Typography>)
    expect(screen.getByTestId('custom-typography')).toBeInTheDocument()
  })

  it('combines multiple style props', () => {
    const { container } = render(
      <Typography
        variant="heading1"
        size="xl"
        weight="bold"
        align="center"
        color="primary"
        truncate
      >
        Combined
      </Typography>,
    )
    expect(container.firstChild).toHaveClass('mdk-typography--heading1')
    expect(container.firstChild).toHaveClass('mdk-typography--size-xl')
    expect(container.firstChild).toHaveClass('mdk-typography--weight-bold')
    expect(container.firstChild).toHaveClass('mdk-typography--align-center')
    expect(container.firstChild).toHaveClass('mdk-typography--color-primary')
    expect(container.firstChild).toHaveClass('mdk-typography--truncate')
  })

  it('renders nested elements correctly', () => {
    render(
      <Typography>
        Text with <strong>bold</strong> and <em>italic</em>
      </Typography>,
    )
    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(screen.getByText('italic')).toBeInTheDocument()
  })
})
