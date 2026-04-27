import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { IncidentSeverity } from '../incident-severity'

describe('incidentSeverity', () => {
  it('should render with critical severity', () => {
    const { container } = render(<IncidentSeverity severity="critical" />)
    const element = container.querySelector('.mdk-active-incidents-card__dot')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('mdk-active-incidents-card__dot--critical')
  })

  it('should render with high severity', () => {
    const { container } = render(<IncidentSeverity severity="high" />)
    const element = container.querySelector('.mdk-active-incidents-card__dot')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('mdk-active-incidents-card__dot--high')
  })

  it('should render with medium severity', () => {
    const { container } = render(<IncidentSeverity severity="medium" />)
    const element = container.querySelector('.mdk-active-incidents-card__dot')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('mdk-active-incidents-card__dot--medium')
  })

  it('should always have base class', () => {
    const { container } = render(<IncidentSeverity severity="critical" />)
    const element = container.querySelector('.mdk-active-incidents-card__dot')
    expect(element).toHaveClass('mdk-active-incidents-card__dot')
  })
})
