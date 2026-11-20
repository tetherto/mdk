import { createRef } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from '..'

const pageButtons = (): string[] =>
  screen
    .getAllByRole('button', { name: /^Page \d+$/ })
    .map((button) => button.getAttribute('aria-label') ?? '')

const openSizeChanger = (): void => {
  const trigger = screen.getByRole('combobox', { name: 'Items per page' })
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
}

describe('Pagination', () => {
  describe('root element', () => {
    it('applies the default size modifier and forwards className and props', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Pagination ref={ref} className="custom" data-testid="pagination" total={10} />)

      const root = screen.getByTestId('pagination')
      expect(root).toBe(ref.current)
      expect(root).toHaveClass('mdk-pagination', 'mdk-pagination--sm', 'custom')
      expect(root).not.toHaveClass('mdk-pagination--disabled')
    })

    it('applies the size and disabled modifiers', () => {
      render(<Pagination data-testid="pagination" size="lg" disabled total={10} />)

      expect(screen.getByTestId('pagination')).toHaveClass(
        'mdk-pagination--lg',
        'mdk-pagination--disabled',
      )
    })
  })

  describe('page list', () => {
    it('renders no page buttons when there are no items', () => {
      render(<Pagination total={0} />)

      expect(screen.queryAllByRole('button', { name: /^Page \d+$/ })).toHaveLength(0)
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    })

    it('renders every page when there are 7 pages or fewer', () => {
      render(<Pagination total={70} pageSize={10} />)

      expect(pageButtons()).toEqual([1, 2, 3, 4, 5, 6, 7].map((n) => `Page ${n}`))
      expect(screen.queryByRole('button', { name: /^Jump/ })).not.toBeInTheDocument()
    })

    it('marks the current page', () => {
      render(<Pagination current={2} total={50} pageSize={10} />)

      const active = screen.getByRole('button', { name: 'Page 2' })
      expect(active).toHaveAttribute('aria-current', 'page')
      expect(active).toHaveClass('mdk-pagination__button--active')
      expect(screen.getByRole('button', { name: 'Page 1' })).not.toHaveAttribute('aria-current')
    })

    it('shows only a forward ellipsis near the start of a long list', () => {
      render(<Pagination current={3} total={200} pageSize={10} />)

      expect(pageButtons()).toEqual(['Page 1', 'Page 2', 'Page 3', 'Page 4', 'Page 20'])
      expect(screen.getByRole('button', { name: 'Jump forward 5 pages' })).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Jump backward 5 pages' }),
      ).not.toBeInTheDocument()
    })

    it('shows both ellipses in the middle of a long list', () => {
      render(<Pagination current={10} total={200} pageSize={10} />)

      expect(pageButtons()).toEqual(['Page 1', 'Page 9', 'Page 10', 'Page 11', 'Page 20'])
      expect(screen.getByRole('button', { name: 'Jump forward 5 pages' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Jump backward 5 pages' })).toBeInTheDocument()
    })

    it('shows only a backward ellipsis near the end of a long list', () => {
      render(<Pagination current={18} total={200} pageSize={10} />)

      expect(pageButtons()).toEqual(['Page 1', 'Page 17', 'Page 18', 'Page 19', 'Page 20'])
      expect(screen.getByRole('button', { name: 'Jump backward 5 pages' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Jump forward 5 pages' })).not.toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('moves to the previous and next page', () => {
      const onChange = vi.fn()
      render(<Pagination current={3} total={100} pageSize={10} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
      expect(onChange).toHaveBeenLastCalledWith(2, 10)

      fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
      expect(onChange).toHaveBeenLastCalledWith(4, 10)
    })

    it('disables Previous on the first page and Next on the last page', () => {
      const { rerender } = render(<Pagination current={1} total={30} pageSize={10} />)
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()

      rerender(<Pagination current={3} total={30} pageSize={10} />)
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    })

    it('moves to a clicked page', () => {
      const onChange = vi.fn()
      render(<Pagination current={1} total={50} pageSize={10} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'Page 4' }))
      expect(onChange).toHaveBeenCalledWith(4, 10)
    })

    it('ignores a click on the current page', () => {
      const onChange = vi.fn()
      render(<Pagination current={2} total={50} pageSize={10} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }))
      expect(onChange).not.toHaveBeenCalled()
    })

    it('works without an onChange handler', () => {
      render(<Pagination current={1} total={50} pageSize={10} />)

      expect(() => fireEvent.click(screen.getByRole('button', { name: 'Page 2' }))).not.toThrow()
    })

    it('jumps five pages forward and backward', () => {
      const onChange = vi.fn()
      render(<Pagination current={10} total={200} pageSize={10} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'Jump forward 5 pages' }))
      expect(onChange).toHaveBeenLastCalledWith(15, 10)

      fireEvent.click(screen.getByRole('button', { name: 'Jump backward 5 pages' }))
      expect(onChange).toHaveBeenLastCalledWith(5, 10)
    })

    it('clamps ellipsis jumps to the first and last page', () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <Pagination current={17} total={200} pageSize={10} onChange={onChange} />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Jump forward 5 pages' }))
      expect(onChange).toHaveBeenLastCalledWith(20, 10)

      rerender(<Pagination current={4} total={200} pageSize={10} onChange={onChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Jump backward 5 pages' }))
      expect(onChange).toHaveBeenLastCalledWith(1, 10)
    })

    it('disables every control when disabled', () => {
      const onChange = vi.fn()
      render(<Pagination current={10} total={200} pageSize={10} disabled onChange={onChange} />)

      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeDisabled()
        fireEvent.click(button)
      }
      expect(screen.getByRole('combobox', { name: 'Items per page' })).toBeDisabled()
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('total', () => {
    it('is hidden by default', () => {
      const { container } = render(<Pagination total={100} />)

      expect(container.querySelector('.mdk-pagination__total')).not.toBeInTheDocument()
    })

    it('shows the range of the current page', () => {
      render(<Pagination current={2} total={45} pageSize={20} showTotal />)

      expect(screen.getByText('21-40 of 45')).toBeInTheDocument()
    })

    it('caps the range at the total on the last page', () => {
      render(<Pagination current={3} total={45} pageSize={20} showTotal />)

      expect(screen.getByText('41-45 of 45')).toBeInTheDocument()
    })

    it('shows an empty range when there are no items', () => {
      render(<Pagination total={0} showTotal />)

      expect(screen.getByText('0-0 of 0')).toBeInTheDocument()
    })
  })

  describe('page size changer', () => {
    it('names the trigger button', () => {
      render(<Pagination total={100} pageSize={20} />)

      const trigger = screen.getByRole('combobox', { name: 'Items per page' })
      expect(trigger).toHaveClass('mdk-pagination__size-changer--trigger')
      expect(trigger).toHaveTextContent('20 / page')
    })

    it('is hidden when showSizeChanger is false', () => {
      render(<Pagination total={100} showSizeChanger={false} />)

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })

    it('lists the page size options', () => {
      render(<Pagination total={100} pageSizeOptions={[5, 25]} pageSize={5} />)
      openSizeChanger()

      const listbox = screen.getByRole('listbox')
      expect(
        within(listbox)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['5 / page', '25 / page'])
    })

    it('keeps the current page when it still exists at the new size', () => {
      const onChange = vi.fn()
      const onSizeChange = vi.fn()
      render(
        <Pagination
          current={2}
          total={100}
          pageSize={10}
          onChange={onChange}
          onSizeChange={onSizeChange}
        />,
      )
      openSizeChanger()
      fireEvent.click(screen.getByRole('option', { name: '20 / page' }))

      expect(onSizeChange).toHaveBeenCalledWith(2, 20)
      expect(onChange).toHaveBeenCalledWith(2, 20)
    })

    it('moves to the new last page when the current page no longer exists', () => {
      const onChange = vi.fn()
      const onSizeChange = vi.fn()
      render(
        <Pagination
          current={8}
          total={100}
          pageSize={10}
          onChange={onChange}
          onSizeChange={onSizeChange}
        />,
      )
      openSizeChanger()
      fireEvent.click(screen.getByRole('option', { name: '50 / page' }))

      expect(onSizeChange).toHaveBeenCalledWith(2, 50)
      expect(onChange).toHaveBeenCalledWith(2, 50)
    })

    it('works without change handlers', () => {
      render(<Pagination current={1} total={100} pageSize={10} />)
      openSizeChanger()

      expect(() => fireEvent.click(screen.getByRole('option', { name: '20 / page' }))).not.toThrow()
    })
  })
})
