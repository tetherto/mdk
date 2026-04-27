import type { LocalFilters } from '@mdk/core'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

export type useFilterStateParams = {
  filters?: LocalFilters
  onFiltersChange: (value: LocalFilters) => void
}

export type useFilterStateReturn = {
  filters: LocalFilters
  onFiltersChange: (selections: (string | number | boolean)[][]) => void
}

export const useFilterState = ({
  filters: providedFilters,
  onFiltersChange: onFilterChange,
}: useFilterStateParams): useFilterStateReturn => {
  const [filters, setFilters] = useControllableState<LocalFilters>({
    prop: providedFilters,
    defaultProp: {},
    onChange: onFilterChange,
  })

  /**
   * Handle filter changes
   * Converts array of tuples to LocalFilters object
   */
  const handleFilterChange = (selections: Array<Array<string | number | boolean>>): void => {
    if (!selections || selections.length === 0) {
      setFilters({})
      return
    }

    const newFilters: LocalFilters = {}

    selections.forEach((selection) => {
      if (!Array.isArray(selection) || selection.length < 2) return

      const category = String(selection[0])
      const value = selection[selection.length - 1] // Get the leaf value

      if (value === undefined) return

      if (newFilters[category]) {
        // Category already exists
        const existingValue = newFilters[category]
        if (Array.isArray(existingValue)) {
          // Already an array, add if not exists
          if (!existingValue.includes(value)) {
            existingValue.push(value)
          }
        } else {
          // Convert to array if values are different
          if (existingValue !== value) {
            newFilters[category] = [existingValue, value]
          }
        }
      } else {
        // New category
        newFilters[category] = value
      }
    })
    setFilters(newFilters)
  }

  return {
    filters,
    onFiltersChange: handleFilterChange,
  }
}
