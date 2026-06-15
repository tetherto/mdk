import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MinersSummaryBox } from '../miners-summary-box/miners-summary-box'

describe('MinersSummaryBox', () => {
  const defaultParams = [
    { label: 'Efficiency', value: '32.5 W/TH/S' },
    { label: 'Hash Rate', value: '1.24 PH/s' },
    { label: 'Max Temp', value: '72 °C' },
    { label: 'Avg Temp', value: '65 °C' },
  ]

  it('renders all params', () => {
    render(<MinersSummaryBox params={defaultParams} />)

    expect(screen.getByText('Efficiency')).toBeInTheDocument()
    expect(screen.getByText('32.5 W/TH/S')).toBeInTheDocument()
    expect(screen.getByText('Hash Rate')).toBeInTheDocument()
    expect(screen.getByText('1.24 PH/s')).toBeInTheDocument()
    expect(screen.getByText('Max Temp')).toBeInTheDocument()
    expect(screen.getByText('72 °C')).toBeInTheDocument()
    expect(screen.getByText('Avg Temp')).toBeInTheDocument()
    expect(screen.getByText('65 °C')).toBeInTheDocument()
  })

  it('applies --small modifier when value length > 12', () => {
    const params = [{ label: 'Test', value: '1234567890123' }]
    const { container } = render(<MinersSummaryBox params={params} />)

    const label = container.querySelector('.mdk-miners-summary-box__label')
    expect(label).toHaveClass('mdk-miners-summary-box__label--small')
  })

  it('applies --tiny modifier when value length > 15', () => {
    const params = [{ label: 'Test', value: '1234567890123456' }]
    const { container } = render(<MinersSummaryBox params={params} />)

    const label = container.querySelector('.mdk-miners-summary-box__label')
    expect(label).toHaveClass('mdk-miners-summary-box__label--tiny')
  })

  it('does not apply size modifier for short values', () => {
    const params = [{ label: 'Test', value: '72 °C' }]
    const { container } = render(<MinersSummaryBox params={params} />)

    const label = container.querySelector('.mdk-miners-summary-box__label')
    expect(label).not.toHaveClass('mdk-miners-summary-box__label--small')
    expect(label).not.toHaveClass('mdk-miners-summary-box__label--tiny')
  })

  it('applies custom className', () => {
    const { container } = render(
      <MinersSummaryBox params={defaultParams} className="custom-class" />,
    )

    const root = container.querySelector('.mdk-miners-summary-box')
    expect(root).toHaveClass('custom-class')
  })

  it('renders empty when params is empty', () => {
    const { container } = render(<MinersSummaryBox params={[]} />)

    const root = container.querySelector('.mdk-miners-summary-box')
    expect(root).toBeEmptyDOMElement()
  })
})
