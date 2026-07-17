import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MultiSelect, type MultiSelectOption } from '../index'

const fruitOptions: MultiSelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]

const optionsWithDisabled: MultiSelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'cherry', label: 'Cherry' },
]

const openPopover = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('combobox'))
  })
}

describe('MultiSelect', () => {
  describe('placeholder + chips', () => {
    it('renders the placeholder when no value is selected', () => {
      render(<MultiSelect options={fruitOptions} placeholder="Pick fruits" />)
      expect(screen.getByRole('combobox')).toHaveTextContent('Pick fruits')
    })

    it('renders a chip per selected value with their option labels', () => {
      render(<MultiSelect options={fruitOptions} value={['apple', 'cherry']} />)
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Apple')
      expect(trigger).toHaveTextContent('Cherry')
      expect(trigger).not.toHaveTextContent('Banana')
    })

    it('falls back to the raw value when an option is missing from the options list', () => {
      render(<MultiSelect options={fruitOptions} value={['durian']} />)
      expect(screen.getByRole('combobox')).toHaveTextContent('durian')
    })
  })

  describe('controlled vs uncontrolled state', () => {
    it('uses defaultValue when value is omitted (uncontrolled)', () => {
      render(<MultiSelect options={fruitOptions} defaultValue={['banana']} />)
      expect(screen.getByRole('combobox')).toHaveTextContent('Banana')
    })

    it('treats an explicit value as controlled even when defaultValue is also provided', () => {
      render(<MultiSelect options={fruitOptions} value={['apple']} defaultValue={['banana']} />)
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Apple')
      expect(trigger).not.toHaveTextContent('Banana')
    })
  })

  describe('toggling options', () => {
    it('fires onValueChange with the next array when an option is toggled on', async () => {
      const onValueChange = vi.fn()
      render(<MultiSelect options={fruitOptions} onValueChange={onValueChange} />)
      await openPopover()
      const banana = await screen.findByRole('option', { name: /banana/i })
      await act(async () => {
        fireEvent.click(banana)
      })
      expect(onValueChange).toHaveBeenCalledWith(['banana'])
    })

    it('removes the value when an already-selected option is toggled off', async () => {
      const onValueChange = vi.fn()
      render(
        <MultiSelect
          options={fruitOptions}
          value={['apple', 'banana']}
          onValueChange={onValueChange}
        />,
      )
      await openPopover()
      const apple = await screen.findByRole('option', { name: /apple/i })
      await act(async () => {
        fireEvent.click(apple)
      })
      expect(onValueChange).toHaveBeenCalledWith(['banana'])
    })

    it('keeps the popover open after toggling an option', async () => {
      render(<MultiSelect options={fruitOptions} defaultValue={[]} />)
      await openPopover()
      const banana = await screen.findByRole('option', { name: /banana/i })
      await act(async () => {
        fireEvent.click(banana)
      })
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('toggles an option when the row receives Enter', async () => {
      const onValueChange = vi.fn()
      render(<MultiSelect options={fruitOptions} onValueChange={onValueChange} />)
      await openPopover()
      const cherry = await screen.findByRole('option', { name: /cherry/i })
      await act(async () => {
        fireEvent.keyDown(cherry, { key: 'Enter' })
      })
      expect(onValueChange).toHaveBeenCalledWith(['cherry'])
    })

    it('toggles an option when the row receives Space', async () => {
      const onValueChange = vi.fn()
      render(<MultiSelect options={fruitOptions} onValueChange={onValueChange} />)
      await openPopover()
      const cherry = await screen.findByRole('option', { name: /cherry/i })
      await act(async () => {
        fireEvent.keyDown(cherry, { key: ' ' })
      })
      expect(onValueChange).toHaveBeenCalledWith(['cherry'])
    })
  })

  describe('chip removal + clear-all', () => {
    it('removes only the targeted value when its chip x button is clicked', async () => {
      const onValueChange = vi.fn()
      render(
        <MultiSelect
          options={fruitOptions}
          value={['apple', 'banana', 'cherry']}
          onValueChange={onValueChange}
        />,
      )
      const trigger = screen.getByRole('combobox')
      const bananaChipClear = within(trigger).getByRole('button', { name: /remove banana/i })
      await act(async () => {
        fireEvent.click(bananaChipClear)
      })
      expect(onValueChange).toHaveBeenCalledWith(['apple', 'cherry'])
    })

    it('shows a clear-all button only when >= 2 values are selected', () => {
      const { rerender } = render(<MultiSelect options={fruitOptions} value={['apple']} />)
      expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
      rerender(<MultiSelect options={fruitOptions} value={['apple', 'banana']} />)
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })

    it('clear-all fires onValueChange with an empty array', async () => {
      const onValueChange = vi.fn()
      render(
        <MultiSelect
          options={fruitOptions}
          value={['apple', 'banana']}
          onValueChange={onValueChange}
        />,
      )
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
      })
      expect(onValueChange).toHaveBeenCalledWith([])
    })

    it('removes a chip when its clear control is activated with Enter', async () => {
      const onValueChange = vi.fn()
      render(
        <MultiSelect
          options={fruitOptions}
          value={['apple', 'banana']}
          onValueChange={onValueChange}
        />,
      )
      const trigger = screen.getByRole('combobox')
      const bananaChipClear = within(trigger).getByRole('button', { name: /remove banana/i })
      bananaChipClear.focus()
      await act(async () => {
        fireEvent.keyDown(bananaChipClear, { key: 'Enter' })
      })
      expect(onValueChange).toHaveBeenCalledWith(['apple'])
    })

    it('removes a chip when its clear control is activated with Space', async () => {
      const onValueChange = vi.fn()
      render(
        <MultiSelect
          options={fruitOptions}
          value={['apple', 'banana']}
          onValueChange={onValueChange}
        />,
      )
      const trigger = screen.getByRole('combobox')
      const bananaChipClear = within(trigger).getByRole('button', { name: /remove banana/i })
      bananaChipClear.focus()
      await act(async () => {
        fireEvent.keyDown(bananaChipClear, { key: ' ' })
      })
      expect(onValueChange).toHaveBeenCalledWith(['apple'])
    })

    it('clear-all fires onValueChange with an empty array when activated with Enter', async () => {
      const onValueChange = vi.fn()
      render(
        <MultiSelect
          options={fruitOptions}
          value={['apple', 'banana']}
          onValueChange={onValueChange}
        />,
      )
      const clearAll = screen.getByRole('button', { name: /clear all/i })
      clearAll.focus()
      await act(async () => {
        fireEvent.keyDown(clearAll, { key: 'Enter' })
      })
      expect(onValueChange).toHaveBeenCalledWith([])
    })

    it('clear-all fires onValueChange with an empty array when activated with Space', async () => {
      const onValueChange = vi.fn()
      render(
        <MultiSelect
          options={fruitOptions}
          value={['apple', 'banana']}
          onValueChange={onValueChange}
        />,
      )
      const clearAll = screen.getByRole('button', { name: /clear all/i })
      clearAll.focus()
      await act(async () => {
        fireEvent.keyDown(clearAll, { key: ' ' })
      })
      expect(onValueChange).toHaveBeenCalledWith([])
    })
  })

  describe('disabled state', () => {
    it('does not open the popover when the trigger is disabled', async () => {
      render(<MultiSelect options={fruitOptions} disabled />)
      await act(async () => {
        fireEvent.click(screen.getByRole('combobox'))
      })
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('does not fire onValueChange when a disabled option is clicked', async () => {
      const onValueChange = vi.fn()
      render(<MultiSelect options={optionsWithDisabled} onValueChange={onValueChange} />)
      await openPopover()
      const bananaRow = await screen.findByRole('option', { name: /banana/i })
      await act(async () => {
        fireEvent.click(bananaRow)
      })
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it('still fires onValueChange for non-disabled options in the same list', async () => {
      const onValueChange = vi.fn()
      render(<MultiSelect options={optionsWithDisabled} onValueChange={onValueChange} />)
      await openPopover()
      const cherry = await screen.findByRole('option', { name: /cherry/i })
      await act(async () => {
        fireEvent.click(cherry)
      })
      expect(onValueChange).toHaveBeenCalledWith(['cherry'])
    })
  })

  describe('empty options', () => {
    it('renders the emptyMessage when options is an empty array', async () => {
      render(<MultiSelect options={[]} emptyMessage="Nothing to pick" />)
      await openPopover()
      expect(await screen.findByText('Nothing to pick')).toBeInTheDocument()
    })
  })

  describe('maxSelectedDisplay overflow', () => {
    it('collapses the remaining selections into a +N more chip when maxSelectedDisplay is exceeded', () => {
      render(
        <MultiSelect
          options={fruitOptions}
          value={['apple', 'banana', 'cherry']}
          maxSelectedDisplay={2}
        />,
      )
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Apple')
      expect(trigger).toHaveTextContent('Banana')
      expect(trigger).toHaveTextContent('+1 more')
      expect(trigger).not.toHaveTextContent('Cherry')
    })

    it('renders every chip when maxSelectedDisplay is undefined', () => {
      render(<MultiSelect options={fruitOptions} value={['apple', 'banana', 'cherry']} />)
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Apple')
      expect(trigger).toHaveTextContent('Banana')
      expect(trigger).toHaveTextContent('Cherry')
      expect(trigger).not.toHaveTextContent('more')
    })
  })
})
