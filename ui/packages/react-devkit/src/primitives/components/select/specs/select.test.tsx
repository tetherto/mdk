import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../index'

describe('Select', () => {
  it('treats value={undefined} as controlled with no selection (defaultValue does not drive the visible value)', () => {
    render(
      <Select value={undefined} defaultValue="picked" onValueChange={vi.fn()}>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="picked">Picked item</SelectItem>
        </SelectContent>
      </Select>,
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('Pick one')
    expect(trigger).not.toHaveTextContent('Picked item')
  })

  it('uses defaultValue for the initial selection when the value prop is omitted (uncontrolled)', () => {
    render(
      <Select defaultValue="picked">
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="picked">Picked item</SelectItem>
        </SelectContent>
      </Select>,
    )

    expect(screen.getByRole('combobox')).toHaveTextContent('Picked item')
  })
})
