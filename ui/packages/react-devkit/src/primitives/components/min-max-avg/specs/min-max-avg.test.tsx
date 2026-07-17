import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MinMaxAvg } from '../index'

describe('MinMaxAvg', () => {
  it('renders Min, Max, and Avg with values', () => {
    render(<MinMaxAvg min="1 TH/s" max="10 TH/s" avg="5 TH/s" />)

    expect(screen.getByText('Min')).toBeInTheDocument()
    expect(screen.getByText('1 TH/s')).toBeInTheDocument()
    expect(screen.getByText('Max')).toBeInTheDocument()
    expect(screen.getByText('10 TH/s')).toBeInTheDocument()
    expect(screen.getByText('Avg')).toBeInTheDocument()
    expect(screen.getByText('5 TH/s')).toBeInTheDocument()
  })

  it('renders nothing when all values are empty', () => {
    const { container } = render(<MinMaxAvg />)

    expect(container.firstChild).toBeNull()
  })

  it('skips entries with empty string values', () => {
    render(<MinMaxAvg min="1" avg="2" />)

    expect(screen.getByText('Min')).toBeInTheDocument()
    expect(screen.queryByText('Max')).not.toBeInTheDocument()
    expect(screen.getByText('Avg')).toBeInTheDocument()
  })
})
