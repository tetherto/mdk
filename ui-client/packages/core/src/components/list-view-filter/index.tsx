import * as React from 'react'

import { cn } from '../../utils'
import { Badge } from '../badge'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

import type { CascaderOption, CascaderValue } from '../cascader'
import { Cascader } from '../cascader'
import { Typography } from '../typography'

export type LocalFilters = Record<string, string | number | boolean | (string | number | boolean)[]>

type ListViewFilterProps = {
  /**
   * Cascader options for filtering
   */
  options: CascaderOption[]

  /**
   * Optional key to force re-mounting the Cascader when filters change
   * Useful if you want to reset the internal state of the Cascader when filters change
   */
  filterKey?: string
  /**
   * Current filter values as key-value pairs
   * Example: { type: 'Antminer S19XP H', status: ['active', 'pending'] }
   */
  localFilters?: LocalFilters

  /**
   * Callback when filters change
   * @param selections - Array of selected filter paths
   */
  onChange: (selections: CascaderValue[]) => void

  /**
   * Custom className for the filter button
   */
  className?: string
}

/**
 * ListViewFilter - Filter button with cascader dropdown
 *
 * Features:
 * - Filter icon button with count badge
 * - Cascader dropdown for hierarchical filtering
 * - Multiple selection support
 * - Tag display for selected filters
 * - Auto-sync with URL params
 *
 * @example
 * ```tsx
 * const filterOptions = [
 *   {
 *     value: 'type',
 *     label: 'Type',
 *     children: [
 *       { value: 'Antminer S19XP', label: 'Antminer S19XP' },
 *       { value: 'Avalon A1346', label: 'Avalon A1346' }
 *     ]
 *   }
 * ]
 *
 * <ListViewFilter
 *   options={filterOptions}
 *   localFilters={filters}
 *   onChange={handleFilterChange}
 * />
 * ```
 */
const FilterIcon = (): JSX.Element => {
  return (
    <svg
      viewBox="64 64 896 896"
      focusable="false"
      data-icon="filter"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M880.1 154H143.9c-24.5 0-39.8 26.7-27.5 48L349 597.4V838c0 17.7 14.2 32 31.8 32h262.4c17.6 0 31.8-14.3 31.8-32V597.4L907.7 202c12.2-21.3-3.1-48-27.6-48zM603.4 798H420.6V642h182.9v156zm9.6-236.6l-9.5 16.6h-183l-9.5-16.6L212.7 226h598.6L613 561.4z"></path>
    </svg>
  )
}

const ListViewFilter = React.forwardRef<HTMLDivElement, ListViewFilterProps>(
  ({ options, onChange, localFilters, className, filterKey = 'default' }, ref) => {
    const [open, setOpen] = React.useState(false)
    /**
     * Convert localFilters object to Cascader value format
     * Transforms: { type: 'value', status: ['val1', 'val2'] }
     * To: [['type', 'value'], ['status', 'val1'], ['status', 'val2']]
     */
    const cascaderValues = React.useMemo(() => {
      if (!localFilters || typeof localFilters !== 'object') return []

      const values: CascaderValue[] = []

      Object.entries(localFilters).forEach(([key, vals]) => {
        const optionGroup = options.find(({ value }) => value === key)
        if (!optionGroup) return

        // Handle array of values
        if (Array.isArray(vals)) {
          vals.forEach((val) => {
            const value = typeof val === 'boolean' ? val : String(val)
            // Find the child option to get the correct path
            const childOption = optionGroup.children?.find((child) => child.value === value)
            if (childOption) {
              values.push([key, childOption.value])
            }
          })
        } else {
          // Handle single value
          const value = typeof vals === 'boolean' ? vals : String(vals)
          const childOption = optionGroup.children?.find((child) => child.value === value)
          if (childOption) {
            values.push([key, childOption.value])
          }
        }
      })

      return values
    }, [localFilters, options])

    /**
     * Handle filter changes from Cascader
     * Converts Cascader format back to onChange format
     */
    const handleFiltersChange = React.useCallback(
      (selections: CascaderValue[] | CascaderValue | null) => {
        if (!selections) {
          onChange([])
          return
        }

        const selectionArray = Array.isArray(selections[0])
          ? (selections as CascaderValue[])
          : [selections as CascaderValue]

        onChange(selectionArray as CascaderValue[])
      },
      [onChange],
    )

    /**
     * Handle popover open/close
     */
    const handleOpenChange = React.useCallback((newOpen: boolean) => {
      setOpen(newOpen)
    }, [])

    // Count of active filters
    const filtersCount = cascaderValues.length

    return (
      <div ref={ref} className={cn('mdk-list-view-filter', className)}>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <div className="mdk-list-view-filter__trigger">
              <Badge color="primary" count={filtersCount} size="sm">
                <Button variant="secondary" icon={<FilterIcon />}>
                  Filter
                </Button>
              </Badge>
            </div>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            side="bottom"
            className="mdk-list-view-filter__dropdown"
            sideOffset={8}
          >
            <div className="mdk-list-view-filter__header">
              <Typography size="sm" variant="caption">
                Filters
              </Typography>
              <div className="mdk-list-view-filter__content">
                <Cascader
                  key={filterKey}
                  options={options}
                  value={cascaderValues}
                  onChange={handleFiltersChange}
                  multiple
                  placeholder=""
                  dropdownClassName="mdk-list-view-filter__cascader-dropdown"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  },
)

ListViewFilter.displayName = 'ListViewFilter'

export { ListViewFilter }
