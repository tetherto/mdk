import { useCallback, useEffect, useState } from 'react'

import type { CascaderOption, CascaderValue, LocalFilters } from '@tetherto/mdk-core-ui'

import type { FilterOption } from '../utils/list-view-utils'
import { getFilterOptionsByTab } from '../utils/list-view-utils'
import type { AvailableDevices } from './use-get-available-devices'

export type FilterSelectionTuple = CascaderValue

export type UseListViewFiltersParams = {
  site?: string
  selectedType?: string
  availableDevices: AvailableDevices
  typeFiltersForSite: CascaderOption[]
}

export const useListViewFilters = ({
  site,
  selectedType,
  availableDevices: _availableDevices,
  typeFiltersForSite,
}: UseListViewFiltersParams) => {
  const [filters, setFilters] = useState<LocalFilters | undefined>()
  const [previousFilters, setPreviousFilters] = useState<LocalFilters | undefined>()

  const filterOptionsByTab: FilterOption[] = getFilterOptionsByTab(selectedType ?? '')

  const listViewFilterOptions: FilterOption[] = site
    ? filterOptionsByTab
        .map((option) => {
          if (option.value !== 'type') return option

          const siteTypeFilter = typeFiltersForSite.find(
            (f) => f.value === selectedType?.toLowerCase(),
          )

          return { ...option, children: siteTypeFilter?.children }
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : []

  useEffect(() => {
    setFilters(undefined)
    setPreviousFilters(undefined)
  }, [selectedType])

  const onFiltersChange = useCallback((selections: FilterSelectionTuple[]) => {
    setFilters((currentFilters) => {
      setPreviousFilters(currentFilters)

      const grouped = selections.reduce<LocalFilters>((result, current) => {
        const [key, value, childValue] = current as [string, string, string?]
        const existing = (result[key] as string[] | undefined) ?? []
        return { ...result, [key]: [...existing, childValue ?? value] }
      }, {})

      const lastAlerts = grouped['last.alerts']
      if (Array.isArray(lastAlerts) && lastAlerts.length !== 1) {
        const { 'last.alerts': _removed, ...rest } = grouped
        return rest
      }

      return grouped
    })
  }, [])

  return {
    onFiltersChange,
    listViewFilterOptions,
    filters,
    setFilters,
    previousFilters,
    setPreviousFilters,
  }
}
