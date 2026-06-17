import { CURRENCY } from '@core'
import _capitalize from 'lodash/capitalize'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import _forEach from 'lodash/forEach'
import _includes from 'lodash/includes'
import _isNil from 'lodash/isNil'
import _isString from 'lodash/isString'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _meanBy from 'lodash/meanBy'
import _reduce from 'lodash/reduce'
import _some from 'lodash/some'

import type { RevenueDataItem, RevenueDatasetEntry, RevenueDatasetValue, SiteItem } from './revenue-chart.types'

const RESERVED_KEYS = ['timeKey', 'period', 'timestamp']

const isDateValue = (entry: RevenueDatasetValue | string | undefined): entry is RevenueDatasetValue =>
  !_isNil(entry) && !_isString(entry) && entry.value !== undefined

/**
 * Transforms raw multi-site revenue API data into an intermediate dataset keyed by timeKey.
 * Each element represents one site; date keys map to `{ value }` objects.
 * Color assignment is deferred to the component layer.
 */
export const getMonthlyRevenueDataset = (
  data: RevenueDataItem[],
  siteList: (string | SiteItem)[] = [],
): RevenueDatasetEntry[] => {
  if (_isNil(data) || data.length === 0) return []

  const firstEntry = data[0] as RevenueDataItem
  const regionKeys = _filter(_keys(firstEntry), (key) => !_includes(RESERVED_KEYS, key))

  const labels = _map(regionKeys, (regionKey) => {
    const site = _find(siteList, (siteEntry) => {
      const siteId = _isString(siteEntry) ? siteEntry : siteEntry.id
      return siteId.toUpperCase() === regionKey.toUpperCase()
    })
    if (site && !_isString(site) && site.name) return site.name
    return _capitalize(regionKey)
  })

  return _map(regionKeys, (regionKey, regionIndex) =>
    _reduce(
      data,
      (acc, entry) => {
        acc[entry.timeKey] = { value: (entry[regionKey] as number) || 0 }
        return acc
      },
      {
        label: labels[regionIndex] ?? regionKey,
        stackGroup: 'revenue',
      } as RevenueDatasetEntry,
    ),
  )
}

/**
 * Checks whether values are already in BTC scale (any average > 1) or need conversion to Sats.
 * If all per-date label averages are ≤ 1, multiplies every value by 1 000 000 and returns `'Sats'`.
 *
 * @param dataset - Intermediate dataset from {@link getMonthlyRevenueDataset}
 * @returns Potentially converted dataset and the resolved currency unit string
 */
export const processRevenueDataset = (
  dataset: RevenueDatasetEntry[],
): { dataset: RevenueDatasetEntry[]; currencyUnit: string } => {
  if (_isNil(dataset) || dataset.length === 0) {
    return { dataset: [], currencyUnit: CURRENCY.BTC }
  }

  const allDateKeys = new Set<string>()
  for (const entry of dataset) {
    _forEach(_keys(entry), (key) => {
      if (key !== 'label' && key !== 'stackGroup') allDateKeys.add(key)
    })
  }

  const hasAverageAboveOne = _some([...allDateKeys], (dateKey) => {
    const values = _filter(_map(dataset, (entry) => entry[dateKey]), isDateValue)
    if (values.length === 0) return false
    return _meanBy(values, (entry) => entry.value) > 1
  })

  if (!hasAverageAboveOne) {
    const convertedDataset = _map(dataset, (entry) => {
      const converted: RevenueDatasetEntry = { label: entry.label, stackGroup: entry.stackGroup }
      _forEach(_keys(entry), (key) => {
        if (key === 'label' || key === 'stackGroup') return
        const dateEntry = entry[key]
        if (isDateValue(dateEntry)) {
          converted[key] = { ...dateEntry, value: dateEntry.value * 1_000_000 }
        }
      })
      return converted
    })
    return { dataset: convertedDataset, currencyUnit: CURRENCY.SATS }
  }

  return { dataset, currencyUnit: CURRENCY.BTC }
}
