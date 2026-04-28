import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeviceExplorerToolbar } from '../device-explorer-toolbar'
import type { DeviceExplorerDeviceType } from '../types'

vi.mock('@tetherto/mdk-core-ui', async () => {
  const actual = await vi.importActual('@tetherto/mdk-core-ui')
  return {
    ...actual,
    ListViewFilter: vi.fn(({ onChange, className }) => (
      <div data-testid="list-view-filter" className={className}>
        <button onClick={() => onChange([['status', 'active']])}>Apply Filter</button>
      </div>
    )),
    TagInput: vi.fn(({ allowCustomTags, placeholder, onTagsChange, value, variant, className }) => (
      <div data-testid="tag-input" className={className}>
        <input
          data-testid="tag-input-field"
          placeholder={placeholder}
          value={value?.join(', ') || ''}
          onChange={(e) => onTagsChange(e.target.value.split(', '))}
        />
        <span data-testid="tag-input-variant">{variant}</span>
        <span data-testid="tag-input-custom">{String(allowCustomTags)}</span>
      </div>
    )),
    Tabs: vi.fn(({ value, onValueChange, className, children }) => (
      <div data-testid="tabs" className={className} data-value={value}>
        <div onClick={() => onValueChange('miner')}>{children}</div>
      </div>
    )),
    TabsList: vi.fn(({ variant, className, children }) => (
      <div data-testid="tabs-list" className={className} data-variant={variant}>
        {children}
      </div>
    )),
    TabsTrigger: vi.fn(({ value, variant, className, children }) => (
      <button
        data-testid={`tab-trigger-${value}`}
        className={className}
        data-variant={variant}
        data-value={value}
      >
        {children}
      </button>
    )),
  }
})

describe('DeviceExplorerToolbar', () => {
  const mockProps = {
    filters: {},
    filterOptions: [],
    onFiltersChange: vi.fn(),
    searchOptions: [],
    searchTags: [],
    onSearchTagsChange: vi.fn(),
    deviceType: 'container' as DeviceExplorerDeviceType,
    onDeviceTypeChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders toolbar container', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)
      expect(container.querySelector('.mdk-device-explorer__toolbar')).toBeInTheDocument()
    })

    it('renders all device type tabs', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByText('Containers')).toBeInTheDocument()
      expect(screen.getByText('Miners')).toBeInTheDocument()
      expect(screen.getByText('Cabinets')).toBeInTheDocument()
    })

    it('renders three tab triggers', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tab-trigger-container')).toBeInTheDocument()
      expect(screen.getByTestId('tab-trigger-miner')).toBeInTheDocument()
      expect(screen.getByTestId('tab-trigger-cabinet')).toBeInTheDocument()
    })

    it('renders search input', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

    it('renders tabs container', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    })

    it('renders tabs list', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument()
    })
  })

  describe('filter rendering', () => {
    it('does not render filter when filterOptions is empty', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)
      expect(
        container.querySelector('.mdk-device-explorer__toolbar__filter'),
      ).not.toBeInTheDocument()
    })

    it('renders filter when filterOptions are provided', () => {
      const propsWithFilters = {
        ...mockProps,
        filterOptions: [{ label: 'Status', value: 'status', children: [] }],
      }
      const { container } = render(<DeviceExplorerToolbar {...propsWithFilters} />)
      expect(container.querySelector('.mdk-device-explorer__toolbar__filter')).toBeInTheDocument()
    })

    it('renders filter with multiple options', () => {
      const propsWithFilters = {
        ...mockProps,
        filterOptions: [
          { label: 'Status', value: 'status', children: [] },
          { label: 'Type', value: 'type', children: [] },
        ],
      }
      render(<DeviceExplorerToolbar {...propsWithFilters} />)
      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })

    it('passes filters to ListViewFilter', () => {
      const filters = { status: 'active', type: 'container' }
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      render(
        <DeviceExplorerToolbar {...mockProps} filters={filters} filterOptions={filterOptions} />,
      )
      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })
  })

  describe('search input', () => {
    it('renders with correct placeholder', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      const input = screen.getByPlaceholderText('Search')
      expect(input).toBeInTheDocument()
    })

    it('renders with search variant', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tag-input-variant')).toHaveTextContent('search')
    })

    it('has allowCustomTags enabled', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tag-input-custom')).toHaveTextContent('true')
    })

    it('renders with empty search tags by default', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      const input = screen.getByTestId('tag-input-field')
      expect(input).toHaveValue('')
    })

    it('renders with provided search tags', () => {
      const searchTags = ['tag1', 'tag2']
      render(<DeviceExplorerToolbar {...mockProps} searchTags={searchTags} />)
      const input = screen.getByTestId('tag-input-field')
      expect(input).toHaveValue('tag1, tag2')
    })

    it('passes search options to TagInput', () => {
      const searchOptions = [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
      ]
      render(<DeviceExplorerToolbar {...mockProps} searchOptions={searchOptions} />)
      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

    it('has correct CSS class', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)
      expect(container.querySelector('.mdk-device-explorer__toolbar__search')).toBeInTheDocument()
    })
  })

  describe('device type tabs', () => {
    it('renders with container device type', () => {
      render(<DeviceExplorerToolbar {...mockProps} deviceType="container" />)
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'container')
    })

    it('renders with miner device type', () => {
      render(<DeviceExplorerToolbar {...mockProps} deviceType="miner" />)
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'miner')
    })

    it('renders with cabinet device type', () => {
      render(<DeviceExplorerToolbar {...mockProps} deviceType="cabinet" />)
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'cabinet')
    })

    it('tabs list has side variant', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tabs-list')).toHaveAttribute('data-variant', 'side')
    })

    it('tab triggers have side variant', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tab-trigger-container')).toHaveAttribute('data-variant', 'side')
      expect(screen.getByTestId('tab-trigger-miner')).toHaveAttribute('data-variant', 'side')
      expect(screen.getByTestId('tab-trigger-cabinet')).toHaveAttribute('data-variant', 'side')
    })

    it('tab triggers have correct values', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tab-trigger-container')).toHaveAttribute('data-value', 'container')
      expect(screen.getByTestId('tab-trigger-miner')).toHaveAttribute('data-value', 'miner')
      expect(screen.getByTestId('tab-trigger-cabinet')).toHaveAttribute('data-value', 'cabinet')
    })

    it('has correct CSS classes', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)
      expect(container.querySelector('.mdk-device-explorer__toolbar__tabs')).toBeInTheDocument()
      expect(
        container.querySelector('.mdk-device-explorer__toolbar__tabs-list'),
      ).toBeInTheDocument()
      expect(
        container.querySelector('.mdk-device-explorer__toolbar__tab-trigger'),
      ).toBeInTheDocument()
    })
  })

  describe('callbacks', () => {
    it('calls onFiltersChange when filter changes', () => {
      const onFiltersChange = vi.fn()
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      render(
        <DeviceExplorerToolbar
          {...mockProps}
          filterOptions={filterOptions}
          onFiltersChange={onFiltersChange}
        />,
      )

      fireEvent.click(screen.getByText('Apply Filter'))
      expect(onFiltersChange).toHaveBeenCalledWith([['status', 'active']])
    })

    it('calls onSearchTagsChange when search tags change', () => {
      const onSearchTagsChange = vi.fn()
      render(<DeviceExplorerToolbar {...mockProps} onSearchTagsChange={onSearchTagsChange} />)

      const input = screen.getByTestId('tag-input-field')
      fireEvent.change(input, { target: { value: 'tag1, tag2' } })

      expect(onSearchTagsChange).toHaveBeenCalledWith(['tag1', 'tag2'])
    })
  })

  describe('component props', () => {
    it('passes localFilters to ListViewFilter', () => {
      const filters = { status: ['active', 'inactive'] }
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      render(
        <DeviceExplorerToolbar {...mockProps} filters={filters} filterOptions={filterOptions} />,
      )

      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })

    it('passes options to ListViewFilter', () => {
      const filterOptions = [
        { label: 'Status', value: 'status', children: [] },
        { label: 'Location', value: 'location', children: [] },
      ]
      render(<DeviceExplorerToolbar {...mockProps} filterOptions={filterOptions} />)

      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })

    it('passes value to TagInput', () => {
      const searchTags = ['container-1', 'container-2']
      render(<DeviceExplorerToolbar {...mockProps} searchTags={searchTags} />)

      const input = screen.getByTestId('tag-input-field')
      expect(input).toHaveValue('container-1, container-2')
    })

    it('passes options to TagInput', () => {
      const searchOptions = [
        { label: 'Container 1', value: 'container-1' },
        { label: 'Container 2', value: 'container-2' },
      ]
      render(<DeviceExplorerToolbar {...mockProps} searchOptions={searchOptions} />)

      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

    it('passes value to Tabs', () => {
      render(<DeviceExplorerToolbar {...mockProps} deviceType="miner" />)
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'miner')
    })
  })

  describe('edge cases', () => {
    it('handles empty filters object', () => {
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      const { container } = render(
        <DeviceExplorerToolbar {...mockProps} filters={{}} filterOptions={filterOptions} />,
      )

      expect(container.querySelector('.mdk-device-explorer__toolbar__filter')).toBeInTheDocument()
    })

    it('handles single filter option', () => {
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      render(<DeviceExplorerToolbar {...mockProps} filterOptions={filterOptions} />)

      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })

    it('handles single search tag', () => {
      const searchTags = ['single-tag']
      render(<DeviceExplorerToolbar {...mockProps} searchTags={searchTags} />)

      const input = screen.getByTestId('tag-input-field')
      expect(input).toHaveValue('single-tag')
    })

    it('handles single search option', () => {
      const searchOptions = [{ label: 'Option 1', value: 'opt1' }]
      render(<DeviceExplorerToolbar {...mockProps} searchOptions={searchOptions} />)

      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

    it('renders correctly when all arrays are empty', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)

      expect(container.querySelector('.mdk-device-explorer__toolbar')).toBeInTheDocument()
      expect(
        container.querySelector('.mdk-device-explorer__toolbar__filter'),
      ).not.toBeInTheDocument()
    })
  })

  describe('integration', () => {
    it('renders all components together', () => {
      const props = {
        filters: { status: 'active' },
        filterOptions: [{ label: 'Status', value: 'status', children: [] }],
        onFiltersChange: vi.fn(),
        searchOptions: [{ label: 'Search 1', value: 'search1' }],
        searchTags: ['tag1'],
        onSearchTagsChange: vi.fn(),
        deviceType: 'container' as DeviceExplorerDeviceType,
        onDeviceTypeChange: vi.fn(),
      }

      render(<DeviceExplorerToolbar {...props} />)

      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(4) // 3 tabs + 1 filter button
    })

    it('all callbacks can be triggered', () => {
      const onFiltersChange = vi.fn()
      const onSearchTagsChange = vi.fn()

      const props = {
        ...mockProps,
        filterOptions: [{ label: 'Status', value: 'status', children: [] }],
        onFiltersChange,
        onSearchTagsChange,
      }

      render(<DeviceExplorerToolbar {...props} />)

      fireEvent.click(screen.getByText('Apply Filter'))
      expect(onFiltersChange).toHaveBeenCalled()

      const input = screen.getByTestId('tag-input-field')
      fireEvent.change(input, { target: { value: 'new tag' } })
      expect(onSearchTagsChange).toHaveBeenCalled()
    })
  })
})
