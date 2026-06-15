import { timezoneStore } from '@tetherto/mdk-ui-core'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DATE, LABEL } from '../constants'
import { DataLabel } from '../index'

describe('dataLabel', () => {
  const originalTimezone = timezoneStore.getState().timezone

  beforeEach(() => {
    timezoneStore.getState().setTimezone('UTC')
  })

  afterEach(() => {
    timezoneStore.getState().setTimezone(originalTimezone)
  })

  it('renders default PERIOD label with formatted date range in UTC', () => {
    const start = new Date('2025-01-06T12:00:00.000Z')
    const end = new Date('2025-03-15T12:00:00.000Z')

    render(<DataLabel startDate={start} endDate={end} />)

    expect(screen.getByText(`${LABEL.DEFAULT}:`)).toBeInTheDocument()
    expect(screen.getByText('06/01/25')).toBeInTheDocument()
    expect(screen.getByText('15/03/25')).toBeInTheDocument()
    expect(screen.getByText(DATE.SEPARATOR)).toBeInTheDocument()
  })

  it('renders fallback for missing or invalid dates', () => {
    render(<DataLabel startDate={null} endDate={null} />)

    const fallbacks = screen.getAllByText(DATE.FALLBACK)
    expect(fallbacks).toHaveLength(2)
  })

  it('renders fallback for invalid Date values', () => {
    render(<DataLabel startDate={new Date(Number.NaN)} endDate={undefined} />)

    const fallbacks = screen.getAllByText(DATE.FALLBACK)
    expect(fallbacks).toHaveLength(2)
  })

  it('supports a custom label', () => {
    render(
      <DataLabel
        label="REPORT"
        startDate={new Date('2025-01-01T00:00:00.000Z')}
        endDate={new Date('2025-01-31T00:00:00.000Z')}
      />,
    )

    expect(screen.getByText('REPORT:')).toBeInTheDocument()
    expect(screen.queryByText(`${LABEL.DEFAULT}:`)).not.toBeInTheDocument()
  })

  it('applies BEM structure', () => {
    const { container } = render(
      <DataLabel
        startDate={new Date('2025-06-01T00:00:00.000Z')}
        endDate={new Date('2025-06-30T00:00:00.000Z')}
      />,
    )

    expect(container.querySelector('.mdk-data-label')).toBeInTheDocument()
    expect(container.querySelector('.mdk-data-label__header')).toBeInTheDocument()
    expect(container.querySelectorAll('.mdk-data-label__date')).toHaveLength(2)
    expect(container.querySelector('.mdk-data-label__separator')).toBeInTheDocument()
  })

  it('formats dates using the active timezone store value', () => {
    timezoneStore.getState().setTimezone('America/New_York')
    const start = new Date('2025-07-04T06:00:00.000Z')

    render(<DataLabel startDate={start} endDate={start} />)

    expect(screen.getAllByText('04/07/25')).toHaveLength(2)
  })
})
