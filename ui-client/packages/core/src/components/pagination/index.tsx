import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import * as React from 'react'

import type { ComponentSize } from '../../types'
import { cn } from '../../utils'
import { Button } from '../button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select'

type Direction = 'forward' | 'backward'
type PageItem = 'page' | 'ellipsis'

export type PaginationProps = {
  /**
   * Current active page number
   */
  current?: number
  /**
   * Total number of items
   */
  total?: number
  /**
   * Number of items per page
   * @default 20
   */
  pageSize?: number
  /**
   * Page size options for the select dropdown
   * @default [10, 20, 50, 100]
   */
  pageSizeOptions?: number[]
  /**
   * Show page size changer
   * @default true
   */
  showSizeChanger?: boolean
  /**
   * Show total count text
   * @default false
   */
  showTotal?: boolean
  /**
   * Disable pagination
   * @default false
   */
  disabled?: boolean
  /**
   * Size variant
   * @default 'sm'
   */
  size?: ComponentSize
  /**
   * Custom className for the root element
   */
  className?: string
  /**
   * Callback when page number or page size changes
   */
  onChange?: (page: number, pageSize: number) => void
  /**
   * Callback when page size changes
   */
  onSizeChange?: (current: number, size: number) => void
}

/**
 * Pagination component for navigating through pages
 *
 * @example
 * ```tsx
 * <Pagination
 *   current={1}
 *   total={100}
 *   pageSize={20}
 *   onChange={(page, pageSize) => console.log(page, pageSize)}
 * />
 * ```
 */
export const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      current = 1,
      total = 0,
      pageSize = 20,
      pageSizeOptions = [10, 20, 50, 100],
      showSizeChanger = true,
      showTotal = false,
      disabled = false,
      size = 'sm',
      className,
      onChange,
      onSizeChange,
      ...props
    },
    ref,
  ) => {
    const totalPages = Math.ceil(total / pageSize)
    const hasPrev = current > 1
    const hasNext = current < totalPages

    // Calculate range for current page
    const rangeStart = total === 0 ? 0 : (current - 1) * pageSize + 1
    const rangeEnd = Math.min(current * pageSize, total)

    const handlePageChange = (page: number): void => {
      if (page < 1 || page > totalPages || page === current || disabled) return
      onChange?.(page, pageSize)
    }

    const handlePageSizeChange = (newSize: number): void => {
      const newTotalPages = Math.ceil(total / newSize)
      const newCurrent = current > newTotalPages ? newTotalPages : current
      onSizeChange?.(newCurrent, newSize)
      onChange?.(newCurrent, newSize)
    }

    const handleEllipsisClick = (direction: Direction): void => {
      if (direction === 'forward') {
        handlePageChange(Math.min(current + 5, totalPages))
      } else {
        handlePageChange(Math.max(current - 5, 1))
      }
    }

    // Generate page numbers to display
    const getPageNumbers = (): {
      type: PageItem
      value: number
      direction?: Direction
    }[] => {
      const pages: {
        type: PageItem
        value: number
        direction?: Direction
      }[] = []

      if (totalPages <= 7) {
        // Show all pages if total is small
        for (let i = 1; i <= totalPages; i++) {
          pages.push({ type: 'page', value: i })
        }
      } else {
        // Always show first page
        pages.push({ type: 'page', value: 1 })

        if (current > 3) {
          pages.push({ type: 'ellipsis', value: current - 5, direction: 'backward' })
        }

        // Show pages around current
        const start = Math.max(2, current - 1)
        const end = Math.min(totalPages - 1, current + 1)

        for (let i = start; i <= end; i++) {
          pages.push({ type: 'page', value: i })
        }

        if (current < totalPages - 2) {
          pages.push({ type: 'ellipsis', value: current + 5, direction: 'forward' })
        }

        // Always show last page
        pages.push({ type: 'page', value: totalPages })
      }

      return pages
    }
    const renderTotal = (): React.ReactNode | null => {
      if (!showTotal) return null

      return (
        <div className="mdk-pagination__total">
          {rangeStart}-{rangeEnd} of {total}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'mdk-pagination',
          `mdk-pagination--${size}`,
          disabled && 'mdk-pagination--disabled',
          className,
        )}
        {...props}
      >
        {renderTotal()}

        <div className="mdk-pagination__controls">
          {/* Page Numbers */}
          <div className="mdk-pagination__pages">
            {/* Previous Button */}
            <Button
              variant="icon"
              icon={<ChevronLeftIcon />}
              disabled={!hasPrev || disabled}
              onClick={() => handlePageChange(current - 1)}
              className="mdk-pagination__button mdk-pagination__button--prev"
              aria-label="Previous page"
            />
            {getPageNumbers().map((item, index) => {
              if (item.type === 'ellipsis') {
                return (
                  <button
                    key={`ellipsis-${index}`}
                    className="mdk-pagination__ellipsis"
                    onClick={() => handleEllipsisClick(item.direction!)}
                    disabled={disabled}
                    aria-label={`Jump ${item.direction === 'forward' ? 'forward' : 'backward'} 5 pages`}
                  >
                    <span className="mdk-pagination__ellipsis--dot">•••</span>
                    <span className="mdk-pagination__ellipsis--arrow">
                      {item.direction === 'forward' ? (
                        <DoubleArrowRightIcon />
                      ) : (
                        <DoubleArrowLeftIcon />
                      )}
                    </span>
                  </button>
                )
              }

              return (
                <Button
                  key={item.value}
                  variant={item.value === current ? 'primary' : 'secondary'}
                  disabled={disabled}
                  onClick={() => handlePageChange(item.value)}
                  className={cn(
                    'mdk-pagination__button mdk-pagination__button--page',
                    item.value === current && 'mdk-pagination__button--active',
                  )}
                  aria-label={`Page ${item.value}`}
                  aria-current={item.value === current ? 'page' : undefined}
                >
                  {item.value}
                </Button>
              )
            })}
            {/* Next Button */}
            <Button
              variant="icon"
              icon={<ChevronRightIcon />}
              disabled={!hasNext || disabled}
              onClick={() => handlePageChange(current + 1)}
              className="mdk-pagination__button mdk-pagination__button--next"
              aria-label="Next page"
            />
          </div>
        </div>

        {/* Page Size Changer */}
        {showSizeChanger && (
          <Select
            value={pageSize?.toString()}
            onValueChange={(value) => handlePageSizeChange(Number(value))}
            disabled={disabled}
            aria-label="Items per page"
          >
            <SelectTrigger disabled={disabled} className="mdk-pagination__size-changer--trigger">
              <SelectValue placeholder="Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pageSizeOptions.map((size) => (
                  <SelectItem
                    className="mdk-pagination__size-changer--item"
                    key={size}
                    value={size?.toString()}
                  >
                    {size} / page
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>
    )
  },
)

Pagination.displayName = 'Pagination'
