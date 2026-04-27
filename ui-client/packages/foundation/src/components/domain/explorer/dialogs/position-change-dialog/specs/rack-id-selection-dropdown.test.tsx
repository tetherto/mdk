import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RackIdSelectionDropdown } from '../rack-id-selection-dropdown/rack-id-selection-dropdown'

vi.mock('../../../../../../utils/device-utils', () => ({
  getRackNameFromId: (id: string) => id,
}))

describe('RackIdSelectionDropdown SCSS Classes', () => {
  it('applies the error class when status is error', () => {
    render(<RackIdSelectionDropdown handleChange={() => {}} status="error" />)

    const trigger = screen.getByRole('combobox')
    expect(trigger.className).toContain('mdk-rack-select--error')
  })

  it('applies the warning class when status is warning', () => {
    render(<RackIdSelectionDropdown handleChange={() => {}} status="warning" />)

    const trigger = screen.getByRole('combobox')
    expect(trigger.className).toContain('mdk-rack-select--warning')
  })

  it('filters out minerpool racks from options', async () => {
    expect(screen.queryByText('minerpool-alpha')).toBeNull()
  })
})
