import { useMemo } from 'react'

import type { CascaderOption, CascaderValue } from '@tetherto/mdk-core-ui'
import { cn, ListViewFilter, TagInput } from '@tetherto/mdk-core-ui'
import _map from 'lodash/map'

import _capitalize from 'lodash/capitalize'
import _find from 'lodash/find'
import _reject from 'lodash/reject'

import type { AlertLocalFilters } from '../alerts-types'

import { ALERTS_FILTER_OPTIONS } from './tag-filter-bar.const'

import './tag-filter-bar.scss'

export type TagFilterBarProps = {
  filterTags: string[]
  localFilters: AlertLocalFilters
  onSearchTagsChange: (tags: string[]) => void
  onLocalFiltersChange: (filters: AlertLocalFilters) => void
  /**
   * Site-specific overrides for the "type" filter children.
   * If provided, the "Type" filter group will use these instead of the defaults.
   */
  typeFiltersForSite?: CascaderOption[]
  placeholder?: string
  className?: string
}

const groupSelections = (selections: CascaderValue[]): AlertLocalFilters =>
  selections.reduce<AlertLocalFilters>((result, current) => {
    const [key, value, childValue] = current as [string, string, string?]
    const existing = (result[key] as string[] | undefined) ?? []
    return { ...result, [key]: [...existing, childValue ?? value] }
  }, {})

export const TagFilterBar = ({
  filterTags,
  localFilters,
  onSearchTagsChange,
  onLocalFiltersChange,
  typeFiltersForSite,
  placeholder,
  className,
}: TagFilterBarProps): JSX.Element => {
  const options = useMemo<CascaderOption[]>(() => {
    if (!typeFiltersForSite || typeFiltersForSite.length === 0) {
      return ALERTS_FILTER_OPTIONS
    }

    const typeOption = _find(ALERTS_FILTER_OPTIONS, { value: 'type' })

    return [
      ..._reject(ALERTS_FILTER_OPTIONS, { value: 'type' }),
      ...(typeOption
        ? [
            {
              ...typeOption,
              label: _capitalize(typeOption.label as string),
              children: typeFiltersForSite,
            },
          ]
        : []),
    ]
  }, [typeFiltersForSite])

  const handleFiltersChange = (selections: CascaderValue[]): void => {
    onLocalFiltersChange(groupSelections(selections))
  }

  return (
    <div className={cn('mdk-alerts-tag-filter-bar', className)}>
      <ListViewFilter
        options={options}
        onChange={handleFiltersChange}
        localFilters={localFilters as Parameters<typeof ListViewFilter>[0]['localFilters']}
      />
      <TagInput
        size="md"
        value={filterTags}
        onTagsChange={onSearchTagsChange}
        placeholder={placeholder ?? 'Search / filter devices'}
        variant="search"
        allowCustomTags
        options={_map(filterTags, (tag) => ({ value: tag, label: tag }))}
        className="mdk-alerts-tag-filter-bar__search"
      />
    </div>
  )
}
