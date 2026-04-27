import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { IncidentRow } from '../incident-row'

describe('incidentRow', () => {
  const defaultProps = {
    id: 'incident-1',
    title: 'Test Incident',
    body: 'This is the incident body',
    subtitle: 'Test subtitle',
    severity: 'high' as const,
  }

  it('should render all content fields', () => {
    render(<IncidentRow {...defaultProps} />)
    expect(screen.getByText('Test Incident')).toBeInTheDocument()
    expect(screen.getByText('This is the incident body')).toBeInTheDocument()
    expect(screen.getByText('Test subtitle')).toBeInTheDocument()
  })

  it('should render severity indicator', () => {
    const { container } = render(<IncidentRow {...defaultProps} />)
    expect(container.querySelector('.mdk-active-incidents-card__dot--high')).toBeInTheDocument()
  })

  it('should render arrow when onClick is provided', () => {
    const { container } = render(<IncidentRow {...defaultProps} onClick={() => {}} />)
    expect(container.querySelector('.mdk-active-incidents-card__arrow')).toBeInTheDocument()
  })

  it('should not render arrow when onClick is not provided', () => {
    const { container } = render(<IncidentRow {...defaultProps} />)
    expect(container.querySelector('.mdk-active-incidents-card__arrow')).not.toBeInTheDocument()
  })

  it('should call onClick with id when clicked', () => {
    const handleClick = vi.fn()
    render(<IncidentRow {...defaultProps} onClick={handleClick} />)

    const contentElement = screen
      .getByText('Test Incident')
      .closest('.mdk-active-incidents-card__row-content')
    fireEvent.click(contentElement!)

    expect(handleClick).toHaveBeenCalledWith('incident-1')
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should add clickable class when onClick is provided', () => {
    const { container } = render(<IncidentRow {...defaultProps} onClick={() => {}} />)
    expect(
      container.querySelector('.mdk-active-incidents-card__row--clickable'),
    ).toBeInTheDocument()
  })

  it('should not add clickable class when onClick is not provided', () => {
    const { container } = render(<IncidentRow {...defaultProps} />)
    expect(
      container.querySelector('.mdk-active-incidents-card__row--clickable'),
    ).not.toBeInTheDocument()
  })

  it('should render with different severities', () => {
    const { container: criticalContainer } = render(
      <IncidentRow {...defaultProps} severity="critical" />,
    )
    expect(
      criticalContainer.querySelector('.mdk-active-incidents-card__dot--critical'),
    ).toBeInTheDocument()

    const { container: mediumContainer } = render(
      <IncidentRow {...defaultProps} severity="medium" />,
    )
    expect(
      mediumContainer.querySelector('.mdk-active-incidents-card__dot--medium'),
    ).toBeInTheDocument()
  })

  it('should have correct displayName', () => {
    expect(IncidentRow.displayName).toBe('IncidentRow')
  })
})
