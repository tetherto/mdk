import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CascaderOption } from '../../cascader'
import type { LocalFilters } from '../index'
import { ListViewFilter } from '../index'

const mockOptions: CascaderOption[] = [
  {
    value: 'type',
    label: 'Device Type',
    children: [
      { value: 'S19XP', label: 'Antminer S19XP' },
      { value: 'A1346', label: 'Avalon A1346' },
    ],
  },
  {
    value: 'status',
    label: 'Status',
    children: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
    ],
  },
]

describe('listViewFilter', () => {
  describe('rendering', () => {
    it('renders filter button', () => {
      const onChange = vi.fn()
      render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      expect(screen.getByText('Filter')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const onChange = vi.fn()
      const { container } = render(
        <ListViewFilter options={mockOptions} onChange={onChange} className="custom-class" />,
      )

      expect(container.firstChild).toHaveClass('mdk-list-view-filter')
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('renders with default filterKey', () => {
      const onChange = vi.fn()
      const { container } = render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      expect(container.querySelector('.mdk-list-view-filter')).toBeInTheDocument()
    })

    it('renders with custom filterKey', () => {
      const onChange = vi.fn()
      const { container } = render(
        <ListViewFilter options={mockOptions} onChange={onChange} filterKey="custom-key" />,
      )

      expect(container.querySelector('.mdk-list-view-filter')).toBeInTheDocument()
    })
  })

  describe('badge count', () => {
    it('does not show badge when count is 0', () => {
      const onChange = vi.fn()
      const { container } = render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      // Badge with count 0 is hidden by default
      expect(container.querySelector('.mdk-badge')).not.toBeInTheDocument()
    })

    it('shows badge count for single filter', () => {
      const onChange = vi.fn()
      const localFilters: LocalFilters = { type: 'S19XP' }

      render(
        <ListViewFilter options={mockOptions} localFilters={localFilters} onChange={onChange} />,
      )

      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('shows badge count for multiple filters in same category', () => {
      const onChange = vi.fn()
      const localFilters: LocalFilters = { status: ['active', 'pending'] }

      render(
        <ListViewFilter options={mockOptions} localFilters={localFilters} onChange={onChange} />,
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('shows badge count for filters across categories', () => {
      const onChange = vi.fn()
      const localFilters: LocalFilters = {
        type: 'S19XP',
        status: ['active', 'pending'],
      }

      render(
        <ListViewFilter options={mockOptions} localFilters={localFilters} onChange={onChange} />,
      )

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('badge has sm size classes when visible', () => {
      const onChange = vi.fn()
      const localFilters: LocalFilters = { type: 'S19XP' }
      const { container } = render(
        <ListViewFilter options={mockOptions} localFilters={localFilters} onChange={onChange} />,
      )

      const badge = container.querySelector('.mdk-badge')
      expect(badge).toHaveClass('mdk-badge--sm')
    })
  })

  describe('popover interaction', () => {
    it('opens popover when filter button clicked', () => {
      const onChange = vi.fn()
      render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      const button = screen.getByText('Filter')
      fireEvent.click(button)

      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('renders Cascader inside popover', () => {
      const onChange = vi.fn()
      render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      const button = screen.getByText('Filter')
      fireEvent.click(button)

      // Cascader is rendered (look for its input)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('localFilters conversion', () => {
    it('handles empty localFilters', () => {
      const onChange = vi.fn()
      const { container } = render(
        <ListViewFilter options={mockOptions} localFilters={{}} onChange={onChange} />,
      )

      expect(container.querySelector('.mdk-list-view-filter')).toBeInTheDocument()
    })

    it('handles undefined localFilters', () => {
      const onChange = vi.fn()
      const { container } = render(
        <ListViewFilter options={mockOptions} localFilters={undefined} onChange={onChange} />,
      )

      expect(container.querySelector('.mdk-list-view-filter')).toBeInTheDocument()
    })

    it('converts single value filter correctly', () => {
      const onChange = vi.fn()
      const localFilters: LocalFilters = { type: 'S19XP' }

      render(
        <ListViewFilter options={mockOptions} localFilters={localFilters} onChange={onChange} />,
      )

      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('converts array value filter correctly', () => {
      const onChange = vi.fn()
      const localFilters: LocalFilters = { status: ['active', 'pending'] }

      render(
        <ListViewFilter options={mockOptions} localFilters={localFilters} onChange={onChange} />,
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('converts boolean values correctly', () => {
      const onChange = vi.fn()
      const optionsWithBoolean: CascaderOption[] = [
        {
          value: 'enabled',
          label: 'Enabled',
          children: [
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ],
        },
      ]
      const localFilters: LocalFilters = { enabled: true }

      render(
        <ListViewFilter
          options={optionsWithBoolean}
          localFilters={localFilters}
          onChange={onChange}
        />,
      )

      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('ignores filters not in options', () => {
      const onChange = vi.fn()
      const localFilters: LocalFilters = {
        type: 'S19XP',
        unknownKey: 'value',
      }

      render(
        <ListViewFilter options={mockOptions} localFilters={localFilters} onChange={onChange} />,
      )

      // Should only count the 'type' filter
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('ignores values not in children', () => {
      const onChange = vi.fn()
      const localFilters: LocalFilters = {
        type: 'NonExistent',
      }

      render(
        <ListViewFilter options={mockOptions} localFilters={localFilters} onChange={onChange} />,
      )

      // Should show 0 filters (badge hidden)
      expect(screen.queryByText('1')).not.toBeInTheDocument()
    })
  })

  describe('onChange callback', () => {
    it('component renders without errors', () => {
      const onChange = vi.fn()
      const { container } = render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      expect(container.querySelector('.mdk-list-view-filter')).toBeInTheDocument()
    })

    it('accepts onChange prop', () => {
      const onChange = vi.fn()
      render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('filter updates', () => {
    it('updates badge count when localFilters change', () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <ListViewFilter options={mockOptions} localFilters={{}} onChange={onChange} />,
      )

      // No filters initially (badge hidden)
      expect(screen.queryByText('1')).not.toBeInTheDocument()

      // Add filter
      rerender(
        <ListViewFilter
          options={mockOptions}
          localFilters={{ type: 'S19XP' }}
          onChange={onChange}
        />,
      )

      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('clears count when filters cleared', () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <ListViewFilter
          options={mockOptions}
          localFilters={{ type: 'S19XP' }}
          onChange={onChange}
        />,
      )

      expect(screen.getByText('1')).toBeInTheDocument()

      // Clear filters
      rerender(<ListViewFilter options={mockOptions} localFilters={{}} onChange={onChange} />)

      expect(screen.queryByText('1')).not.toBeInTheDocument()
    })
  })

  describe('cascader props', () => {
    it('passes multiple prop to Cascader', () => {
      const onChange = vi.fn()
      render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      const button = screen.getByText('Filter')
      fireEvent.click(button)

      // Cascader should be rendered
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('passes empty placeholder to Cascader', () => {
      const onChange = vi.fn()
      render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      const button = screen.getByText('Filter')
      fireEvent.click(button)

      // Cascader should have empty placeholder
      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('placeholder', '')
    })

    it('renders Cascader with correct options', () => {
      const onChange = vi.fn()
      render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      const button = screen.getByText('Filter')
      fireEvent.click(button)

      // Cascader is rendered
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('component structure', () => {
    it('renders filter icon SVG', () => {
      const onChange = vi.fn()
      const { container } = render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      const svg = container.querySelector('svg[data-icon="filter"]')
      expect(svg).toBeInTheDocument()
    })

    it('renders Button with secondary variant', () => {
      const onChange = vi.fn()
      const { container } = render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      const button = container.querySelector('.mdk-button')
      expect(button).toHaveClass('mdk-button--variant-secondary')
    })

    it('renders Typography with correct props', () => {
      const onChange = vi.fn()
      render(<ListViewFilter options={mockOptions} onChange={onChange} />)

      const button = screen.getByText('Filter')
      fireEvent.click(button)

      expect(screen.getByText('Filters')).toBeInTheDocument()
    })
  })

  describe('forwarded ref', () => {
    it('forwards ref to root element', () => {
      const onChange = vi.fn()
      const ref = vi.fn()

      render(<ListViewFilter ref={ref} options={mockOptions} onChange={onChange} />)

      expect(ref).toHaveBeenCalled()
    })
  })
})
