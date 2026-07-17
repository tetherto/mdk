import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MultiLevelSelect } from '../index'

const { Section } = MultiLevelSelect

describe('MultiLevelSelect.Section', () => {
  it('starts collapsed by default and expands when the toggle is clicked (uncontrolled)', () => {
    const onToggle = vi.fn()
    const { container } = render(
      <Section sectionTitle="Weeks" onToggle={onToggle}>
        <span>Item</span>
      </Section>,
    )

    const body = container.querySelector('.mdk-multi-level-select__section-body')
    expect(body).toHaveClass('mdk-multi-level-select__section-body--collapsed')
    expect(screen.getByRole('button', { name: '+' })).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByRole('button', { name: '+' }))

    expect(body).not.toHaveClass('mdk-multi-level-select__section-body--collapsed')
    expect(screen.getByRole('button', { name: '−' })).toHaveAttribute('aria-expanded', 'true')
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenLastCalledWith(true)
  })

  it('respects defaultOpen for the initial uncontrolled state', () => {
    const { container } = render(
      <Section sectionTitle="Months" defaultOpen>
        <span>Item</span>
      </Section>,
    )

    const body = container.querySelector('.mdk-multi-level-select__section-body')
    expect(body).not.toHaveClass('mdk-multi-level-select__section-body--collapsed')
    expect(screen.getByRole('button', { name: '−' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('uses the controlled open prop and does not keep internal state when toggled', () => {
    const onToggle = vi.fn()
    const { rerender } = render(
      <Section sectionTitle="Days" open={false} onToggle={onToggle}>
        <span>Item</span>
      </Section>,
    )

    expect(screen.getByRole('button', { name: '+' })).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onToggle).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('button', { name: '+' })).toHaveAttribute('aria-expanded', 'false')

    rerender(
      <Section sectionTitle="Days" open onToggle={onToggle}>
        <span>Item</span>
      </Section>,
    )
    expect(screen.getByRole('button', { name: '−' })).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(screen.getByRole('button', { name: '−' }))
    expect(onToggle).toHaveBeenLastCalledWith(false)
  })

  it('calls preventDefault on pointerdown for the section header', () => {
    const { container } = render(
      <Section sectionTitle="Header">
        <span>Item</span>
      </Section>,
    )

    const header = container.querySelector('.mdk-multi-level-select__section-header') as HTMLElement
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')

    header.dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalled()
  })

  it('calls preventDefault and stopPropagation on pointerdown for the toggle button', () => {
    render(
      <Section sectionTitle="Toggles">
        <span>Item</span>
      </Section>,
    )

    const toggle = screen.getByRole('button', { name: '+' })
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')
    const stopPropagation = vi.spyOn(event, 'stopPropagation')

    toggle.dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalled()
    expect(stopPropagation).toHaveBeenCalled()
  })
})
