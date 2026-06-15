import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContentBox } from '../content-box/content-box'

describe('contentBox', () => {
  it('should render children', () => {
    render(<ContentBox>Test Content</ContentBox>)

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render title when provided', () => {
    render(<ContentBox title="Test Title">Content</ContentBox>)

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Title')
  })

  it('should not render title when not provided', () => {
    render(<ContentBox>Content</ContentBox>)

    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<ContentBox className="custom-class">Content</ContentBox>)

    const contentBox = container.querySelector('.mdk-content-box')
    expect(contentBox).toHaveClass('custom-class')
  })

  it('should render with both title and className', () => {
    const { container } = render(
      <ContentBox title="Power" className="power-box">
        <p>100 kW</p>
      </ContentBox>,
    )

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Power')
    expect(screen.getByText('100 kW')).toBeInTheDocument()

    const contentBox = container.querySelector('.mdk-content-box')
    expect(contentBox).toHaveClass('power-box')
  })

  it('should handle empty children', () => {
    const { container } = render(<ContentBox title="Empty" />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Empty')

    const content = container.querySelector('.mdk-content-box__content')
    expect(content).toBeEmptyDOMElement()
  })

  it('should render complex children', () => {
    render(
      <ContentBox title="Complex">
        <div>
          <p>Paragraph 1</p>
          <span>Span text</span>
        </div>
      </ContentBox>,
    )

    expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
    expect(screen.getByText('Span text')).toBeInTheDocument()
  })
})
