import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MinerExplorerToolbarProps } from '../miner-explorer-toolbar'
import { MinerExplorerToolbar } from '../miner-explorer-toolbar'

vi.mock('@mdk/core', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...originalModule,
    TagInput: vi.fn(({ value, onTagsChange, placeholder, className }) => (
      <div data-testid="tag-input" className={className}>
        <input
          data-testid="tag-input-field"
          placeholder={placeholder}
          defaultValue={value?.join(',')}
          onChange={(e) => onTagsChange(e.target.value ? e.target.value.split(',') : [])}
        />
      </div>
    )),
    Select: vi.fn(({ value, onValueChange, children }) => (
      <div data-testid="select" data-value={value}>
        {children}
        <button data-testid="select-clear" onClick={() => onValueChange('')} />
      </div>
    )),
    SelectTrigger: vi.fn(({ children, className }) => (
      <div data-testid="select-trigger" className={className}>
        {children}
      </div>
    )),
    SelectValue: vi.fn(({ placeholder }) => <span data-testid="select-value">{placeholder}</span>),
    SelectContent: vi.fn(({ children }) => <div data-testid="select-content">{children}</div>),
    SelectItem: vi.fn(({ value, children }) => (
      <button
        data-testid={`select-item-${value}`}
        onClick={(e) => {
          e.currentTarget
            .closest('[data-testid="select"]')
            ?.dispatchEvent(new CustomEvent('select-change', { detail: value, bubbles: true }))
        }}
      >
        {children}
      </button>
    )),
  }
})

const MODEL_OPTIONS = [
  { key: 'miner-am-s19xp', label: 'Antminer S19XP' },
  { key: 'miner-wm-m30sp', label: 'Whatsminer M30SP' },
]

const defaultProps: MinerExplorerToolbarProps = {
  searchTags: [],
  pools: [],
  onSearchTagsChange: vi.fn(),
  modelFilter: null,
  statusFilter: null,
  poolFilter: null,
  onModelChange: vi.fn(),
  onStatusChange: vi.fn(),
  onPoolChange: vi.fn(),
}

const renderToolbar = (props: Partial<MinerExplorerToolbarProps> = {}) =>
  render(<MinerExplorerToolbar {...defaultProps} {...props} />)

describe('MinerExplorerToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('root', () => {
    it('renders the toolbar root element', () => {
      const { container } = renderToolbar()
      expect(container.querySelector('.mdk-pm-miner-explorer__toolbar')).toBeInTheDocument()
    })

    it('renders the search row', () => {
      const { container } = renderToolbar()
      expect(
        container.querySelector('.mdk-pm-miner-explorer__toolbar__search-row'),
      ).toBeInTheDocument()
    })

    it('renders the filters row', () => {
      const { container } = renderToolbar()
      expect(
        container.querySelector('.mdk-pm-miner-explorer__toolbar__filters'),
      ).toBeInTheDocument()
    })
  })

  describe('TagInput', () => {
    it('renders the tag input', () => {
      renderToolbar()
      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

    it('renders with correct placeholder', () => {
      renderToolbar()
      expect(screen.getByPlaceholderText('Search by ID, IP, MAC, Serial')).toBeInTheDocument()
    })

    it('passes searchTags as value', () => {
      renderToolbar({ searchTags: ['tag1', 'tag2'] })
      expect(screen.getByTestId('tag-input-field')).toHaveValue('tag1,tag2')
    })

    it('has correct className', () => {
      renderToolbar()
      expect(screen.getByTestId('tag-input')).toHaveClass('mdk-pm-miner-explorer__toolbar__search')
    })

    it('calls onSearchTagsChange when tags change', () => {
      const onSearchTagsChange = vi.fn()
      renderToolbar({ onSearchTagsChange })
      fireEvent.change(screen.getByTestId('tag-input-field'), {
        target: { value: 'abc' },
      })
      expect(onSearchTagsChange).toHaveBeenCalledWith(['abc'])
    })
  })

  describe('Model Select', () => {
    it('renders Model placeholder', () => {
      renderToolbar()
      expect(screen.getByText('Model')).toBeInTheDocument()
    })

    it('renders all model options', () => {
      renderToolbar()
      MODEL_OPTIONS.forEach((opt) => {
        expect(screen.getByText(opt.label)).toBeInTheDocument()
      })
    })

    it('passes modelFilter as value (empty string when null)', () => {
      const { container } = renderToolbar({ modelFilter: null })
      const selects = container.querySelectorAll('[data-testid="select"]')
      expect(selects[0]).toHaveAttribute('data-value', '')
    })

    it('passes modelFilter value when set', () => {
      const { container } = renderToolbar({ modelFilter: 'miner-am-s19xp' })
      const selects = container.querySelectorAll('[data-testid="select"]')
      expect(selects[0]).toHaveAttribute('data-value', 'miner-am-s19xp')
    })

    it('calls onModelChange with null when cleared', () => {
      const onModelChange = vi.fn()
      const { container } = renderToolbar({ onModelChange })
      const clears = container.querySelectorAll('[data-testid="select-clear"]')
      fireEvent.click(clears[0]!)
      expect(onModelChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Status Select', () => {
    it('renders Status placeholder', () => {
      renderToolbar()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('passes statusFilter as value (empty string when null)', () => {
      const { container } = renderToolbar({ statusFilter: null })
      const selects = container.querySelectorAll('[data-testid="select"]')
      expect(selects[1]).toHaveAttribute('data-value', '')
    })

    it('passes statusFilter value when set', () => {
      const { container } = renderToolbar({ statusFilter: 'mining' })
      const selects = container.querySelectorAll('[data-testid="select"]')
      expect(selects[1]).toHaveAttribute('data-value', 'mining')
    })

    it('calls onStatusChange with null when cleared', () => {
      const onStatusChange = vi.fn()
      const { container } = renderToolbar({ onStatusChange })
      const clears = container.querySelectorAll('[data-testid="select-clear"]')
      fireEvent.click(clears[1]!)
      expect(onStatusChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Pool Select', () => {
    it('renders Current Pool placeholder', () => {
      renderToolbar()
      expect(screen.getByText('Current Pool')).toBeInTheDocument()
    })

    it('passes poolFilter as value (empty string when null)', () => {
      const { container } = renderToolbar({ poolFilter: null })
      const selects = container.querySelectorAll('[data-testid="select"]')
      expect(selects[2]).toHaveAttribute('data-value', '')
    })

    it('passes poolFilter value when set', () => {
      const { container } = renderToolbar({ poolFilter: 'pool-1' })
      const selects = container.querySelectorAll('[data-testid="select"]')
      expect(selects[2]).toHaveAttribute('data-value', 'pool-1')
    })

    it('calls onPoolChange with null when cleared', () => {
      const onPoolChange = vi.fn()
      const { container } = renderToolbar({ onPoolChange })
      const clears = container.querySelectorAll('[data-testid="select-clear"]')
      fireEvent.click(clears[2]!)
      expect(onPoolChange).toHaveBeenCalledWith(null)
    })
  })

  describe('select count', () => {
    it('renders exactly 3 Select components', () => {
      const { container } = renderToolbar()
      expect(container.querySelectorAll('[data-testid="select"]')).toHaveLength(3)
    })
  })
})
