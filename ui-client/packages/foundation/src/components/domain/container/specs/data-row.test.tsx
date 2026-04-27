// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataRow } from '../data-row/data-row'

describe('DataRow', () => {
  it('renders all elements', () => {
    render(<DataRow label="Temp" value={45} units="°C" />)
    expect(screen.getByText('Temp')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('°C')).toBeInTheDocument()
  })

  it('returns null for null/undefined values', () => {
    const { container } = render(<DataRow label="Test" value={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders zero value', () => {
    render(<DataRow value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('applies classes and styles', () => {
    const { container } = render(
      <DataRow label="Test" value="val" isHighlighted flash color="red" />,
    )
    expect(container.firstChild).toHaveClass('mdk-data-row--highlighted')
    expect(container.firstChild).toHaveClass('mdk-data-row--flash')
    expect(container.firstChild).toHaveStyle({ color: 'rgb(255, 0, 0)' })
  })
})
