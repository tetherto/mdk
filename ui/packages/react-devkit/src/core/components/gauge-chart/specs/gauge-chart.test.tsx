import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { GaugeChart } from '../index'

describe('gaugeChart', () => {
  it('renders the SVG gauge with an accessible title', () => {
    render(<GaugeChart percent={0.5} id="gauge" />)
    const svg = screen.getByRole('img', { name: /gauge: 50%/i })
    expect(svg).toBeInTheDocument()
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('renders the percentage text by default and hides it when hideText is true', () => {
    const { rerender } = render(<GaugeChart percent={0.42} id="gauge" />)
    expect(screen.getByText('42%')).toBeInTheDocument()

    rerender(<GaugeChart percent={0.42} id="gauge" hideText />)
    expect(screen.queryByText('42%')).not.toBeInTheDocument()
  })

  it('clamps percent into the [0, 1] range', () => {
    const { rerender } = render(<GaugeChart percent={1.7} id="gauge" />)
    expect(screen.getByRole('img', { name: /gauge: 100%/i })).toBeInTheDocument()

    rerender(<GaugeChart percent={-0.3} id="gauge" />)
    expect(screen.getByRole('img', { name: /gauge: 0%/i })).toBeInTheDocument()
  })

  it('renders one path per arc segment matching nrOfLevels', () => {
    const { container } = render(
      <GaugeChart percent={0.5} id="gauge" nrOfLevels={5} colors={['#aaaaaa', '#bbbbbb']} />,
    )
    const segmentPaths = container.querySelectorAll('svg > g > path')
    expect(segmentPaths).toHaveLength(5)
  })

  it('uses the supplied colors when their count equals nrOfLevels', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff']
    const { container } = render(
      <GaugeChart percent={0.5} id="gauge" nrOfLevels={3} colors={colors} />,
    )
    const fills = Array.from(container.querySelectorAll('svg > g > path')).map((node) =>
      node.getAttribute('fill'),
    )
    expect(fills).toEqual(colors)
  })

  it('applies className and height to the wrapper element', () => {
    const { container } = render(
      <GaugeChart percent={0.5} className="my-extra-class" height={250} />,
    )
    const wrapper = container.querySelector('.mdk-gauge-chart')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('my-extra-class')
    expect(wrapper).toHaveStyle({ height: '250px' })
  })

  it('accepts string heights such as "auto"', () => {
    const { container } = render(<GaugeChart percent={0.5} height="auto" />)
    expect(container.querySelector('.mdk-gauge-chart')).toHaveStyle({ height: 'auto' })
  })

  it('forwards ref to the wrapper element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<GaugeChart ref={ref} percent={0.5} />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
    expect(ref.current).toHaveClass('mdk-gauge-chart')
  })

  it('renders a needle and a hub element', () => {
    const { container } = render(<GaugeChart percent={0.5} id="gauge" />)
    expect(container.querySelector('svg polygon')).toBeInTheDocument()
    expect(container.querySelector('svg circle')).toBeInTheDocument()
  })
})
