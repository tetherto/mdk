import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AlertsTableTitle } from '../alerts-table-title/alerts-table-title'

describe('AlertsTableTitle', () => {
  it('renders the title', () => {
    render(<AlertsTableTitle title="Current Alerts" />)
    expect(screen.getByText('Current Alerts')).toBeInTheDocument()
  })

  it('does not render the subtitle wrapper when subtitle is omitted', () => {
    const { container } = render(<AlertsTableTitle title="Title" />)
    expect(container.querySelector('.mdk-alerts-table-title__subtitle')).not.toBeInTheDocument()
  })

  it('renders the subtitle when provided', () => {
    render(<AlertsTableTitle title="Title" subtitle={<span>extra</span>} />)
    expect(screen.getByText('extra')).toBeInTheDocument()
  })

  it('applies a custom className to the root', () => {
    const { container } = render(<AlertsTableTitle title="Title" className="my-class" />)
    expect(container.firstChild).toHaveClass('mdk-alerts-table-title', 'my-class')
  })
})
