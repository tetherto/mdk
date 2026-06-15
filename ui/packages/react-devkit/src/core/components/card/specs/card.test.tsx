import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Card, CardBody, CardFooter, CardHeader } from '../index'

describe('card', () => {
  it('renders card with children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders Card.Header in header slot', () => {
    const { container } = render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Body>Body</Card.Body>
      </Card>,
    )
    const header = container.querySelector('.mdk-card__header')
    expect(header).toHaveTextContent('Header')
  })

  it('renders Card.Body in body slot', () => {
    const { container } = render(
      <Card>
        <Card.Body>Body content</Card.Body>
      </Card>,
    )
    const body = container.querySelector('.mdk-card__body')
    expect(body).toHaveTextContent('Body content')
  })

  it('renders Card.Footer in footer slot', () => {
    const { container } = render(
      <Card>
        <Card.Footer>Footer</Card.Footer>
      </Card>,
    )
    const footer = container.querySelector('.mdk-card__footer')
    expect(footer).toHaveTextContent('Footer')
  })

  it('renders all sections together', () => {
    const { container } = render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Body>Body</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card>,
    )
    expect(container.querySelector('.mdk-card__header')).toBeInTheDocument()
    expect(container.querySelector('.mdk-card__body')).toBeInTheDocument()
    expect(container.querySelector('.mdk-card__footer')).toBeInTheDocument()
  })

  it('wraps non-section children in Card.Body', () => {
    const { container } = render(
      <Card>
        <Card.Header>Header</Card.Header>
        <p>Regular content</p>
      </Card>,
    )
    const body = container.querySelector('.mdk-card__body')
    expect(body).toHaveTextContent('Regular content')
  })

  it('renders multiple non-section children in body', () => {
    const { container } = render(
      <Card>
        <p>First</p>
        <p>Second</p>
      </Card>,
    )
    const body = container.querySelector('.mdk-card__body')
    expect(body).toHaveTextContent('FirstSecond')
  })

  it('does not wrap when Card.Body is explicitly used', () => {
    const { container } = render(
      <Card>
        <Card.Body>Explicit body</Card.Body>
      </Card>,
    )
    const bodies = container.querySelectorAll('.mdk-card__body')
    expect(bodies).toHaveLength(1)
  })

  it('applies clickable class when onClick is provided', () => {
    const { container } = render(<Card onClick={() => {}}>Clickable</Card>)
    expect(container.querySelector('.mdk-card--clickable')).toBeInTheDocument()
  })

  it('handles onClick event', () => {
    const handleClick = vi.fn()
    render(<Card onClick={handleClick}>Click me</Card>)
    ;(screen.getByText('Click me').closest('.mdk-card') as HTMLElement | null)?.click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className to card', () => {
    const { container } = render(<Card className="custom-card">Content</Card>)
    expect(container.querySelector('.mdk-card')).toHaveClass('custom-card')
  })

  it('applies custom className to CardHeader', () => {
    const { container } = render(
      <Card>
        <CardHeader className="custom-header">Header</CardHeader>
      </Card>,
    )
    expect(container.querySelector('.mdk-card__header')).toHaveClass('custom-header')
  })

  it('applies custom className to CardBody', () => {
    const { container } = render(
      <Card>
        <CardBody className="custom-body">Body</CardBody>
      </Card>,
    )
    expect(container.querySelector('.mdk-card__body')).toHaveClass('custom-body')
  })

  it('applies custom className to CardFooter', () => {
    const { container } = render(
      <Card>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>,
    )
    expect(container.querySelector('.mdk-card__footer')).toHaveClass('custom-footer')
  })

  it('forwards ref to card element', () => {
    const ref = vi.fn()
    render(<Card ref={ref}>Content</Card>)
    expect(ref).toHaveBeenCalled()
  })

  it('forwards ref to CardHeader', () => {
    const ref = vi.fn()
    render(<CardHeader ref={ref}>Header</CardHeader>)
    expect(ref).toHaveBeenCalled()
  })

  it('forwards ref to CardBody', () => {
    const ref = vi.fn()
    render(<CardBody ref={ref}>Body</CardBody>)
    expect(ref).toHaveBeenCalled()
  })

  it('forwards ref to CardFooter', () => {
    const ref = vi.fn()
    render(<CardFooter ref={ref}>Footer</CardFooter>)
    expect(ref).toHaveBeenCalled()
  })

  it('passes through additional HTML attributes', () => {
    render(
      <Card data-testid="custom-card" aria-label="Custom Card">
        Content
      </Card>,
    )
    const card = screen.getByTestId('custom-card')
    expect(card).toHaveAttribute('aria-label', 'Custom Card')
  })

  it('renders only header when no body or footer', () => {
    const { container } = render(
      <Card>
        <Card.Header>Only Header</Card.Header>
      </Card>,
    )
    expect(container.querySelector('.mdk-card__header')).toBeInTheDocument()
    expect(container.querySelector('.mdk-card__body')).not.toBeInTheDocument()
    expect(container.querySelector('.mdk-card__footer')).not.toBeInTheDocument()
  })

  it('renders only footer when no header or body', () => {
    const { container } = render(
      <Card>
        <Card.Footer>Only Footer</Card.Footer>
      </Card>,
    )
    expect(container.querySelector('.mdk-card__footer')).toBeInTheDocument()
    expect(container.querySelector('.mdk-card__header')).not.toBeInTheDocument()
    expect(container.querySelector('.mdk-card__body')).not.toBeInTheDocument()
  })

  it('handles mixed children correctly', () => {
    const { container } = render(
      <Card>
        <Card.Header>Header</Card.Header>
        <p>Paragraph</p>
        <Card.Body>Explicit Body</Card.Body>
        <div>Div</div>
        <Card.Footer>Footer</Card.Footer>
      </Card>,
    )
    expect(container.querySelector('.mdk-card__header')).toHaveTextContent('Header')
    expect(container.querySelector('.mdk-card__footer')).toHaveTextContent('Footer')
    const body = container.querySelector('.mdk-card__body')
    expect(body).toBeInTheDocument()
  })
})
