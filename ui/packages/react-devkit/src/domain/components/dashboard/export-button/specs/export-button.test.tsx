import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExportButton } from '../export-button'

vi.mock('@primitives', () => ({
  Button: ({ children, disabled, icon, className }: any) => (
    <button
      type="button"
      data-testid="export-trigger-button"
      data-disabled={String(disabled)}
      data-class={className}
    >
      <span data-testid="export-icon">{icon}</span>
      {children}
    </button>
  ),
  DropdownMenu: {
    Root: ({ children }: any) => <div data-testid="dropdown-root">{children}</div>,
    Trigger: ({ children, asChild }: any) =>
      asChild ? (
        <span data-testid="dropdown-trigger">{children}</span>
      ) : (
        <button data-testid="dropdown-trigger">{children}</button>
      ),
    Content: ({ children, align, size, className }: any) => (
      <div
        data-testid="dropdown-content"
        data-align={align}
        data-size={size}
        data-class={className}
      >
        {children}
      </div>
    ),
    Item: ({ children, onSelect }: any) => (
      <div data-testid="dropdown-item" role="menuitem" onClick={() => onSelect?.()}>
        {children}
      </div>
    ),
  },
}))

vi.mock('@radix-ui/react-icons', () => ({
  DownloadIcon: () => <svg data-testid="download-icon" />,
  ChevronDownIcon: ({ className }: any) => (
    <svg data-testid="chevron-icon" data-class={className} />
  ),
}))

describe('ExportButton', () => {
  describe('rendering', () => {
    it('renders the dropdown root, trigger, and content', () => {
      render(<ExportButton onExport={vi.fn()} />)

      expect(screen.getByTestId('dropdown-root')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument()
    })

    it('renders the download and chevron icons', () => {
      render(<ExportButton onExport={vi.fn()} />)

      expect(screen.getByTestId('download-icon')).toBeInTheDocument()
      expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
    })

    it('renders the chevron with the expected BEM class', () => {
      render(<ExportButton onExport={vi.fn()} />)

      expect(screen.getByTestId('chevron-icon')).toHaveAttribute(
        'data-class',
        'mdk-export-button__chevron',
      )
    })

    it('passes align=start and size=sm to the dropdown content', () => {
      render(<ExportButton onExport={vi.fn()} />)

      const content = screen.getByTestId('dropdown-content')
      expect(content).toHaveAttribute('data-align', 'start')
      expect(content).toHaveAttribute('data-size', 'sm')
      expect(content).toHaveAttribute('data-class', 'mdk-export-button__menu')
    })
  })

  describe('label prop', () => {
    it('defaults the label to "Export"', () => {
      render(<ExportButton onExport={vi.fn()} />)

      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('uses a custom label when provided', () => {
      render(<ExportButton onExport={vi.fn()} label="Download" />)

      expect(screen.getByText('Download')).toBeInTheDocument()
      expect(screen.queryByText('Export')).not.toBeInTheDocument()
    })
  })

  describe('disabled prop', () => {
    it('defaults disabled to false', () => {
      render(<ExportButton onExport={vi.fn()} />)

      expect(screen.getByTestId('export-trigger-button')).toHaveAttribute('data-disabled', 'false')
    })

    it('passes disabled=true through', () => {
      render(<ExportButton onExport={vi.fn()} disabled />)

      expect(screen.getByTestId('export-trigger-button')).toHaveAttribute('data-disabled', 'true')
    })
  })

  describe('className prop', () => {
    it('omits user className from the trigger when not provided', () => {
      render(<ExportButton onExport={vi.fn()} />)

      // 'mdk-export-button', filtered: ['mdk-export-button', undefined].filter(Boolean).join(' ')
      expect(screen.getByTestId('export-trigger-button')).toHaveAttribute(
        'data-class',
        'mdk-export-button',
      )
    })

    it('appends a custom className to the trigger', () => {
      render(<ExportButton onExport={vi.fn()} className="extra" />)

      expect(screen.getByTestId('export-trigger-button')).toHaveAttribute(
        'data-class',
        'mdk-export-button extra',
      )
    })
  })

  describe('formats prop', () => {
    it('renders the default csv and json items when formats is not provided', () => {
      render(<ExportButton onExport={vi.fn()} />)

      const items = screen.getAllByTestId('dropdown-item')
      expect(items).toHaveLength(2)
      expect(items[0]).toHaveTextContent('Export as CSV')
      expect(items[1]).toHaveTextContent('Export as JSON')
    })

    it('renders a single item when only csv is requested', () => {
      render(<ExportButton onExport={vi.fn()} formats={['csv']} />)

      const items = screen.getAllByTestId('dropdown-item')
      expect(items).toHaveLength(1)
      expect(items[0]).toHaveTextContent('Export as CSV')
    })

    it('renders a single item when only json is requested', () => {
      render(<ExportButton onExport={vi.fn()} formats={['json']} />)

      const items = screen.getAllByTestId('dropdown-item')
      expect(items).toHaveLength(1)
      expect(items[0]).toHaveTextContent('Export as JSON')
    })

    it('renders no items when formats is an empty list', () => {
      render(<ExportButton onExport={vi.fn()} formats={[]} />)

      expect(screen.queryAllByTestId('dropdown-item')).toHaveLength(0)
    })

    it('preserves the order of the formats array', () => {
      render(<ExportButton onExport={vi.fn()} formats={['json', 'csv']} />)

      const items = screen.getAllByTestId('dropdown-item')
      expect(items[0]).toHaveTextContent('Export as JSON')
      expect(items[1]).toHaveTextContent('Export as CSV')
    })
  })

  describe('onExport', () => {
    it('fires onExport("csv") when the CSV item is selected', () => {
      const onExport = vi.fn()
      render(<ExportButton onExport={onExport} />)

      fireEvent.click(screen.getAllByTestId('dropdown-item')[0])

      expect(onExport).toHaveBeenCalledWith('csv')
    })

    it('fires onExport("json") when the JSON item is selected', () => {
      const onExport = vi.fn()
      render(<ExportButton onExport={onExport} />)

      fireEvent.click(screen.getAllByTestId('dropdown-item')[1])

      expect(onExport).toHaveBeenCalledWith('json')
    })

    it('fires onExport once per selection', () => {
      const onExport = vi.fn()
      render(<ExportButton onExport={onExport} />)

      fireEvent.click(screen.getAllByTestId('dropdown-item')[0])

      expect(onExport).toHaveBeenCalledTimes(1)
    })
  })
})
