import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BitMainImmersionControlBox } from '../control-box/bitmain-immersion-control-box'

describe('bitMainImmersionControlBox', () => {
  it('renders without crashing', () => {
    render(<BitMainImmersionControlBox />)
    expect(document.querySelector('.mdk-bitmain-immersion-control-box')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<BitMainImmersionControlBox title="Test Title" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders left content', () => {
    render(<BitMainImmersionControlBox leftContent={<div>Left Content</div>} />)
    expect(screen.getByText('Left Content')).toBeInTheDocument()
  })

  it('renders right content', () => {
    render(<BitMainImmersionControlBox rightContent={<div>Right Content</div>} />)
    expect(screen.getByText('Right Content')).toBeInTheDocument()
  })

  it('renders bottom content', () => {
    render(<BitMainImmersionControlBox bottomContent={<div>Bottom Content</div>} />)
    expect(screen.getByText('Bottom Content')).toBeInTheDocument()
  })

  it('does not render bottom row when no bottom content', () => {
    const { container } = render(<BitMainImmersionControlBox />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-control-box__bottom'),
    ).not.toBeInTheDocument()
  })

  it('applies secondary variant class', () => {
    const { container } = render(<BitMainImmersionControlBox secondary />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-control-box--secondary'),
    ).toBeInTheDocument()
  })

  it('applies secondary class to left column', () => {
    const { container } = render(<BitMainImmersionControlBox secondary />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-control-box__left--secondary'),
    ).toBeInTheDocument()
  })

  it('applies secondary class to right column', () => {
    const { container } = render(<BitMainImmersionControlBox secondary />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-control-box__right--secondary'),
    ).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<BitMainImmersionControlBox className="custom-class" />)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders all content sections together', () => {
    render(
      <BitMainImmersionControlBox
        title="Complete Box"
        leftContent={<div>Left</div>}
        rightContent={<div>Right</div>}
        bottomContent={<div>Bottom</div>}
      />,
    )

    expect(screen.getByText('Complete Box')).toBeInTheDocument()
    expect(screen.getByText('Left')).toBeInTheDocument()
    expect(screen.getByText('Right')).toBeInTheDocument()
    expect(screen.getByText('Bottom')).toBeInTheDocument()
  })

  it('has correct structure with top section', () => {
    const { container } = render(<BitMainImmersionControlBox />)
    expect(container.querySelector('.mdk-bitmain-immersion-control-box__top')).toBeInTheDocument()
  })

  it('has left and right columns in top section', () => {
    const { container } = render(<BitMainImmersionControlBox />)
    expect(container.querySelector('.mdk-bitmain-immersion-control-box__left')).toBeInTheDocument()
    expect(container.querySelector('.mdk-bitmain-immersion-control-box__right')).toBeInTheDocument()
  })
})
