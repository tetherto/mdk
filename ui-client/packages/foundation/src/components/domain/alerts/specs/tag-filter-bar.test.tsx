import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TagFilterBar } from '../tag-filter-bar/tag-filter-bar'

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...actual,
    cn: (...args: Array<string | undefined>) => args.filter(Boolean).join(' '),
    ListViewFilter: ({
      options,
      onChange,
      localFilters,
    }: {
      options: Array<{ value: string; label: string }>
      onChange: (selections: Array<[string, string]>) => void
      localFilters?: Record<string, unknown>
    }) => (
      <div data-testid="list-view-filter" data-filters={JSON.stringify(localFilters ?? {})}>
        <span data-testid="lvf-options">{options.map((o) => o.value).join(',')}</span>
        <button
          type="button"
          data-testid="lvf-emit"
          onClick={() => onChange([['severity', 'critical']])}
        >
          emit
        </button>
        <button
          type="button"
          data-testid="lvf-emit-multi"
          onClick={() =>
            onChange([
              ['severity', 'critical'],
              ['severity', 'high'],
              ['status', 'mining'],
            ])
          }
        >
          emit-multi
        </button>
      </div>
    ),
    TagInput: ({
      value,
      onTagsChange,
      placeholder,
      className,
    }: {
      value: string[]
      onTagsChange: (tags: string[]) => void
      placeholder?: string
      className?: string
    }) => (
      <div data-testid="tag-input" className={className}>
        <input
          data-testid="tag-input-field"
          placeholder={placeholder}
          defaultValue={value?.join(',')}
          onChange={(e) => onTagsChange(e.target.value ? e.target.value.split(',') : [])}
        />
      </div>
    ),
  }
})

const defaultProps = {
  filterTags: [] as string[],
  localFilters: {},
  onSearchTagsChange: vi.fn(),
  onLocalFiltersChange: vi.fn(),
}

const renderBar = (props: Partial<typeof defaultProps> = {}) =>
  render(<TagFilterBar {...defaultProps} {...props} />)

describe('TagFilterBar', () => {
  it('renders ListViewFilter with default options', () => {
    renderBar()
    expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    expect(screen.getByTestId('lvf-options')).toHaveTextContent('status,severity,type')
  })

  it('renders TagInput with placeholder', () => {
    renderBar()
    expect(screen.getByPlaceholderText('Search / filter devices')).toBeInTheDocument()
  })

  it('forwards a custom placeholder to TagInput', () => {
    renderBar({ placeholder: 'Search now' })
    expect(screen.getByPlaceholderText('Search now')).toBeInTheDocument()
  })

  it('passes filterTags as TagInput value', () => {
    renderBar({ filterTags: ['ip-1', 'mac-x'] })
    expect(screen.getByTestId('tag-input-field')).toHaveValue('ip-1,mac-x')
  })

  it('passes localFilters down to ListViewFilter', () => {
    renderBar({ localFilters: { severity: ['critical'] } })
    expect(screen.getByTestId('list-view-filter')).toHaveAttribute(
      'data-filters',
      JSON.stringify({ severity: ['critical'] }),
    )
  })

  it('groups single ListViewFilter selection', () => {
    const onLocalFiltersChange = vi.fn()
    renderBar({ onLocalFiltersChange })
    fireEvent.click(screen.getByTestId('lvf-emit'))
    expect(onLocalFiltersChange).toHaveBeenCalledWith({ severity: ['critical'] })
  })

  it('groups multiple ListViewFilter selections by key', () => {
    const onLocalFiltersChange = vi.fn()
    renderBar({ onLocalFiltersChange })
    fireEvent.click(screen.getByTestId('lvf-emit-multi'))
    expect(onLocalFiltersChange).toHaveBeenCalledWith({
      severity: ['critical', 'high'],
      status: ['mining'],
    })
  })

  it('calls onSearchTagsChange when TagInput changes', () => {
    const onSearchTagsChange = vi.fn()
    renderBar({ onSearchTagsChange })
    fireEvent.change(screen.getByTestId('tag-input-field'), {
      target: { value: 'foo,bar' },
    })
    expect(onSearchTagsChange).toHaveBeenCalledWith(['foo', 'bar'])
  })

  it('overrides type filter children when typeFiltersForSite is provided', () => {
    renderBar({
      typeFiltersForSite: [
        { value: 'site-type-a', label: 'Site Type A' },
        { value: 'site-type-b', label: 'Site Type B' },
      ],
    })
    expect(screen.getByTestId('lvf-options')).toHaveTextContent('status,severity,type')
  })

  it('falls back to default options when typeFiltersForSite is empty', () => {
    renderBar({ typeFiltersForSite: [] })
    expect(screen.getByTestId('lvf-options')).toHaveTextContent('status,severity,type')
  })
})
