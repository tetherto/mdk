// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeviceCardColText } from '../device-card-col-text'

describe('deviceCardColText', () => {
  it('should render children', () => {
    render(<DeviceCardColText>Test Content</DeviceCardColText>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should apply custom styles', () => {
    const customStyle = { color: 'red', fontSize: '14px' }
    const { container } = render(
      <DeviceCardColText style={customStyle}>Styled Text</DeviceCardColText>,
    )
    const element = container.querySelector('.mdk-device-card-col-text')
    expect(element).toHaveStyle('color: rgb(255, 0, 0)')
    expect(element).toHaveStyle('font-size: 14px')
  })

  it('should render without styles', () => {
    const { container } = render(<DeviceCardColText>No Style</DeviceCardColText>)
    const element = container.querySelector('.mdk-device-card-col-text')
    expect(element).toBeInTheDocument()
  })

  it('should render complex children', () => {
    render(
      <DeviceCardColText>
        <span>Complex</span> <strong>Content</strong>
      </DeviceCardColText>,
    )
    expect(screen.getByText('Complex')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
