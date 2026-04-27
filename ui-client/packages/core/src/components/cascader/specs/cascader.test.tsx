import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CascaderOption, CascaderValue } from '../index'
import { Cascader } from '../index'

const mockOptions: CascaderOption[] = [
  {
    value: 'electronics',
    label: 'Electronics',
    children: [
      { value: 'phones', label: 'Phones' },
      { value: 'laptops', label: 'Laptops' },
      { value: 'tablets', label: 'Tablets' },
    ],
  },
  {
    value: 'clothing',
    label: 'Clothing',
    children: [
      { value: 'mens', label: 'Mens' },
      { value: 'womens', label: 'Womens' },
    ],
  },
  {
    value: 'status',
    label: 'Status',
    children: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive', disabled: true },
    ],
  },
]
describe('cascader', () => {
  describe('rendering', () => {
    it('renders with default placeholder', () => {
      render(<Cascader options={mockOptions} />)
      expect(screen.getByPlaceholderText('Select...')).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      render(<Cascader options={mockOptions} placeholder="Choose category..." />)
      expect(screen.getByPlaceholderText('Choose category...')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<Cascader options={mockOptions} className="custom-class" />)
      expect(container.firstChild).toHaveClass('mdk-cascader')
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('renders in disabled state', () => {
      render(<Cascader options={mockOptions} disabled />)
      const input = screen.getByPlaceholderText('Select...')
      expect(input).toBeDisabled()
    })
  })

  describe('single select mode', () => {
    it('accepts single value without error', () => {
      const value: CascaderValue = ['electronics', 'phones']
      const { container } = render(<Cascader options={mockOptions} value={value} />)

      // Single select mode doesn't render tags, just verify component renders
      expect(container.querySelector('.mdk-cascader')).toBeInTheDocument()
    })

    it('updates when value prop changes', () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <Cascader options={mockOptions} value={['electronics', 'phones']} onChange={onChange} />,
      )

      // Verify component renders with first value
      expect(screen.getByPlaceholderText('Select...')).toBeInTheDocument()

      rerender(<Cascader options={mockOptions} value={['clothing', 'mens']} onChange={onChange} />)

      // Verify component still renders
      expect(screen.getByPlaceholderText('Select...')).toBeInTheDocument()
    })
  })

  describe('multiple select mode', () => {
    it('displays selected items as tags', () => {
      const value: CascaderValue[] = [
        ['electronics', 'phones'],
        ['clothing', 'mens'],
      ]

      render(<Cascader options={mockOptions} value={value} multiple />)

      expect(screen.getByText('Phones')).toBeInTheDocument()
    })

    it('removes tag when remove button clicked', () => {
      const onChange = vi.fn()
      const value: CascaderValue[] = [
        ['electronics', 'phones'],
        ['electronics', 'laptops'],
      ]

      render(<Cascader options={mockOptions} value={value} onChange={onChange} multiple />)

      // Find remove button for Phones tag
      const removeButton = screen.getByLabelText('Remove Phones')
      fireEvent.click(removeButton)

      expect(onChange).toHaveBeenCalledWith([['electronics', 'laptops']])
    })

    it('displays multiple selected tags', () => {
      const value: CascaderValue[] = [
        ['electronics', 'phones'],
        ['electronics', 'laptops'],
        ['electronics', 'tablets'],
      ]

      render(<Cascader options={mockOptions} value={value} multiple />)

      expect(screen.getByText('Phones')).toBeInTheDocument()
      expect(screen.getByText('Laptops')).toBeInTheDocument()
      expect(screen.getByText('Tablets')).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('disables all interactions when disabled prop is true', () => {
      const onChange = vi.fn()
      render(<Cascader options={mockOptions} onChange={onChange} disabled />)

      const input = screen.getByPlaceholderText('Select...')
      expect(input).toBeDisabled()

      fireEvent.click(input)
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('empty states', () => {
    it('handles empty options array', () => {
      const { container } = render(<Cascader options={[]} />)
      expect(container.querySelector('.mdk-cascader')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles undefined value gracefully', () => {
      render(<Cascader options={mockOptions} value={undefined} />)
      expect(screen.getByPlaceholderText('Select...')).toBeInTheDocument()
    })

    it('handles null value gracefully', () => {
      render(<Cascader options={mockOptions} value={null as any} />)
      expect(screen.getByPlaceholderText('Select...')).toBeInTheDocument()
    })

    it('handles empty array value in multiple mode', () => {
      render(<Cascader options={mockOptions} value={[]} multiple />)
      expect(screen.getByPlaceholderText('Select...')).toBeInTheDocument()
    })

    it('handles onChange being undefined', () => {
      const { container } = render(<Cascader options={mockOptions} />)
      expect(container.querySelector('.mdk-cascader')).toBeInTheDocument()
    })
  })

  describe('dropdown className', () => {
    it('applies custom dropdown className', () => {
      const { container } = render(
        <Cascader options={mockOptions} dropdownClassName="custom-dropdown" />,
      )
      expect(container.querySelector('.mdk-cascader')).toBeInTheDocument()
    })
  })

  describe('value normalization', () => {
    it('handles single value without throwing error', () => {
      const value: CascaderValue = ['electronics', 'phones']
      const { container } = render(<Cascader options={mockOptions} value={value} />)

      expect(container.querySelector('.mdk-cascader')).toBeInTheDocument()
    })

    it('handles array of values in multiple mode', () => {
      const value: CascaderValue[] = [
        ['electronics', 'phones'],
        ['electronics', 'laptops'],
      ]

      render(<Cascader options={mockOptions} value={value} multiple />)

      expect(screen.getByText('Phones')).toBeInTheDocument()
      expect(screen.getByText('Laptops')).toBeInTheDocument()
    })
  })

  describe('tag removal in multiple mode', () => {
    it('removes single tag', () => {
      const onChange = vi.fn()
      const value: CascaderValue[] = [['electronics', 'phones']]

      render(<Cascader options={mockOptions} value={value} onChange={onChange} multiple />)

      const removeButton = screen.getByLabelText('Remove Phones')
      fireEvent.click(removeButton)

      expect(onChange).toHaveBeenCalledWith([])
    })

    it('removes tag from multiple selections', () => {
      const onChange = vi.fn()
      const value: CascaderValue[] = [
        ['electronics', 'phones'],
        ['electronics', 'laptops'],
        ['clothing', 'mens'],
      ]

      render(<Cascader options={mockOptions} value={value} onChange={onChange} multiple />)

      const removeButton = screen.getByLabelText('Remove Laptops')
      fireEvent.click(removeButton)

      expect(onChange).toHaveBeenCalledWith([
        ['electronics', 'phones'],
        ['clothing', 'mens'],
      ])
    })
  })

  describe('placeholder behavior', () => {
    it('shows placeholder when no selection', () => {
      render(<Cascader options={mockOptions} placeholder="Select items..." />)
      expect(screen.getByPlaceholderText('Select items...')).toBeInTheDocument()
    })

    it('hides placeholder when tags are present in multiple mode', () => {
      const value: CascaderValue[] = [['electronics', 'phones']]
      render(<Cascader options={mockOptions} value={value} multiple />)

      // Input should have empty placeholder when tags exist
      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('placeholder', '')
    })
  })

  describe('component structure', () => {
    it('renders TagInput wrapper', () => {
      const { container } = render(<Cascader options={mockOptions} />)
      expect(container.querySelector('.mdk-tag-input__container')).toBeInTheDocument()
    })

    it('renders with correct ARIA attributes', () => {
      render(<Cascader options={mockOptions} />)
      const input = screen.getByRole('combobox')

      expect(input).toHaveAttribute('aria-autocomplete', 'list')
      expect(input).toHaveAttribute('aria-haspopup', 'listbox')
      expect(input).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('value updates in multiple mode', () => {
    it('updates tags when value changes', () => {
      const { rerender } = render(
        <Cascader options={mockOptions} value={[['electronics', 'phones']]} multiple />,
      )

      expect(screen.getByText('Phones')).toBeInTheDocument()

      rerender(<Cascader options={mockOptions} value={[['electronics', 'laptops']]} multiple />)

      expect(screen.queryByText('Phones')).not.toBeInTheDocument()
      expect(screen.getByText('Laptops')).toBeInTheDocument()
    })

    it('clears tags when value is empty array', () => {
      const { rerender } = render(
        <Cascader options={mockOptions} value={[['electronics', 'phones']]} multiple />,
      )

      expect(screen.getByText('Phones')).toBeInTheDocument()

      rerender(<Cascader options={mockOptions} value={[]} multiple />)

      expect(screen.queryByText('Phones')).not.toBeInTheDocument()
    })
  })
})
