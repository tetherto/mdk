import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChartExpandAction } from '../chart-expand-action'

describe('ChartExpandAction', () => {
  it('labels itself "Expand chart" when collapsed', () => {
    render(<ChartExpandAction isExpanded={false} />)
    const button = screen.getByRole('button', { name: 'Expand chart' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('labels itself "Collapse chart" when expanded', () => {
    render(<ChartExpandAction isExpanded />)
    const button = screen.getByRole('button', { name: 'Collapse chart' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('fires onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<ChartExpandAction isExpanded={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Expand chart' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
