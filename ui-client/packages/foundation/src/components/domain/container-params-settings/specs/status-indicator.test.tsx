import { COLOR } from '@tetherto/core'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FlashStatusIndicator, SoundStatusIndicator } from '../status-indicator'

describe('flashStatusIndicator', () => {
  it('renders flash indicator when active', () => {
    const { container } = render(<FlashStatusIndicator isFlashing={true} color={COLOR.RED} />)

    expect(container.querySelector('.mdk-status-indicator--active')).toBeInTheDocument()
  })

  it('renders flash indicator when inactive', () => {
    const { container } = render(<FlashStatusIndicator isFlashing={false} />)

    expect(container.querySelector('.mdk-status-indicator--inactive')).toBeInTheDocument()
    expect(container.querySelector('.mdk-status-indicator__icon--flash')).toBeInTheDocument()
  })

  it('applies custom color when flashing', () => {
    const { container } = render(<FlashStatusIndicator isFlashing={true} color={COLOR.GREEN} />)

    const icon = container.querySelector('.mdk-status-indicator__icon')
    expect(icon).toHaveStyle({ color: COLOR.GREEN })
  })
})

describe('soundStatusIndicator', () => {
  it('renders sound indicator when active', () => {
    const { container } = render(<SoundStatusIndicator isSuperflashing={true} color={COLOR.RED} />)

    expect(container.querySelector('.mdk-status-indicator--active')).toBeInTheDocument()
  })

  it('renders sound indicator when inactive', () => {
    const { container } = render(<SoundStatusIndicator isSuperflashing={false} />)

    expect(container.querySelector('.mdk-status-indicator--inactive')).toBeInTheDocument()
    expect(container.querySelector('.mdk-status-indicator__icon--sound')).toBeInTheDocument()
  })

  it('applies custom color when superflashing', () => {
    const { container } = render(
      <SoundStatusIndicator isSuperflashing={true} color={COLOR.ORANGE} />,
    )

    const icon = container.querySelector('.mdk-status-indicator__icon')
    expect(icon).toHaveStyle({ color: COLOR.ORANGE })
  })
})
