import { COLOR } from '@tetherto/mdk-core-ui'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BaseStatusIndicator } from '../base-status-indicator/base-status-indicator'

describe('baseStatusIndicator', () => {
  it('renders active state with check icon', () => {
    const { container } = render(<BaseStatusIndicator isActive={true} />)

    expect(container.querySelector('.mdk-status-indicator--active')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders inactive state with cross icon', () => {
    const { container } = render(<BaseStatusIndicator isActive={false} />)

    expect(container.querySelector('.mdk-status-indicator--inactive')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies custom color when active', () => {
    const { container } = render(<BaseStatusIndicator isActive={true} color={COLOR.RED} />)

    const icon = container.querySelector('.mdk-status-indicator__icon')
    expect(icon).toHaveStyle({ color: COLOR.RED })
  })

  it('applies flash type class when inactive', () => {
    const { container } = render(<BaseStatusIndicator isActive={false} type="flash" />)

    expect(container.querySelector('.mdk-status-indicator__icon--flash')).toBeInTheDocument()
  })

  it('applies sound type class when inactive', () => {
    const { container } = render(<BaseStatusIndicator isActive={false} type="sound" />)

    expect(container.querySelector('.mdk-status-indicator__icon--sound')).toBeInTheDocument()
  })

  it('defaults to inactive when isActive not provided', () => {
    const { container } = render(<BaseStatusIndicator />)

    expect(container.querySelector('.mdk-status-indicator--inactive')).toBeInTheDocument()
  })

  it('defaults to flash type when type not provided', () => {
    const { container } = render(<BaseStatusIndicator isActive={false} />)

    expect(container.querySelector('.mdk-status-indicator__icon--flash')).toBeInTheDocument()
  })

  it('does not apply type class when active', () => {
    const { container } = render(<BaseStatusIndicator isActive={true} type="sound" />)

    expect(container.querySelector('.mdk-status-indicator__icon--flash')).not.toBeInTheDocument()
    expect(container.querySelector('.mdk-status-indicator__icon--sound')).not.toBeInTheDocument()
  })
})
