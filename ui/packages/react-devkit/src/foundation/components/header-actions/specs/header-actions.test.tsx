import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AlarmsBellButton } from '../alarms-bell-button'
import { ProfileMenu } from '../profile-menu'

describe('AlarmsBellButton', () => {
  it('renders without a badge when no counts are provided', () => {
    const { container } = render(<AlarmsBellButton />)
    expect(container.querySelector('.mdk-alarms-bell-button__badge')).toBeNull()
  })

  it('renders all three severity rows when counts are provided', () => {
    render(<AlarmsBellButton counts={{ critical: 2, high: 5, medium: 11 }} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
  })

  it('renders only the severities that are defined', () => {
    const { container } = render(<AlarmsBellButton counts={{ high: 3 }} />)
    expect(container.querySelector('.mdk-alarms-bell-button__badge-row--critical')).toBeNull()
    expect(container.querySelector('.mdk-alarms-bell-button__badge-row--high')).toBeInTheDocument()
    expect(container.querySelector('.mdk-alarms-bell-button__badge-row--medium')).toBeNull()
  })

  it('invokes onClick when the button is clicked', () => {
    const onClick = vi.fn()
    render(<AlarmsBellButton counts={{ critical: 1 }} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies a custom aria-label', () => {
    render(<AlarmsBellButton label="Open alerts" />)
    expect(screen.getByRole('button', { name: 'Open alerts' })).toBeInTheDocument()
  })
})

describe('ProfileMenu', () => {
  it('renders the trigger button with the default accessible label', () => {
    render(<ProfileMenu items={[{ label: 'Sign out', onSelect: () => {} }]} />)
    expect(screen.getByRole('button', { name: 'Profile menu' })).toBeInTheDocument()
  })

  it('accepts a custom icon for the trigger', () => {
    render(
      <ProfileMenu
        items={[{ label: 'Sign out', onSelect: () => {} }]}
        icon={<span data-testid="custom-avatar" />}
      />,
    )
    expect(screen.getByTestId('custom-avatar')).toBeInTheDocument()
  })

  it('applies a custom className and aria-label on the trigger', () => {
    render(
      <ProfileMenu
        items={[{ label: 'Sign out', onSelect: () => {} }]}
        className="extra-class"
        label="Account menu"
      />,
    )
    const button = screen.getByRole('button', { name: 'Account menu' })
    expect(button.className).toMatch(/extra-class/)
  })

  it('accepts items that exercise the danger / description / icon branches without throwing on mount', () => {
    expect(() =>
      render(
        <ProfileMenu
          user="alice@example.com"
          items={[
            {
              label: 'Account',
              onSelect: () => {},
              icon: <span data-testid="item-icon" />,
              description: 'Manage profile',
            },
            { label: 'Sign out', onSelect: () => {}, danger: true, disabled: true },
          ]}
        />,
      ),
    ).not.toThrow()
  })
})
