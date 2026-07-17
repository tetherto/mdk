import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _last from 'lodash/last'
import _map from 'lodash/map'
import _orderBy from 'lodash/orderBy'
import _toPairs from 'lodash/toPairs'

import { isLeakedGroupedContainerKey } from '../../utils/grouped-container-metrics'
import { BAR_HASHRATE_COLOR, mhsToThs, SITE_HASHRATE_COLOR } from './hashrate-chart-shared'
import { HASHRATE_BAR_SERIES_LABEL, SITE_VIEW_SERIES_LABEL } from './hashrate.constants'
import type {
  HashrateBarChartData,
  HashrateFilterOption,
  HashrateGroupedLog,
  HashrateSiteViewChartData,
} from './hashrate.types'

/**
 * Display labels for known miner-type ids. The view falls back to the raw id
 * when a key is missing, so adding new miners doesn't require touching this
 * file - the catalog is here only to give the chart human-friendly axis names.
 *
 * @tier internal
 */
export const MINER_TYPE_LABELS: Record<string, string> = {
  'miner-am-s19xp': 'Antminer S19XP',
  'miner-am-s19xp_h': 'Antminer S19XP Hyd',
  'miner-av-a1346': 'Avalon A1346',
  'miner-wm-m30sp': 'WhatsMiner M30SP',
  'miner-wm-m53s': 'WhatsMiner M53S',
  'miner-wm-m56s': 'WhatsMiner M56S',
  'miner-demo-m1': 'Demo M1',
}

/**
 * Display labels for known container ids - falls back to the raw id when
 * missing.
 *
 * @tier internal
 */
export const CONTAINER_LABELS: Record<string, string> = {
  'bitdeer-1a': 'Bitdeer 1A',
  'bitdeer-4a': 'Bitdeer 4A',
  'bitdeer-4b': 'Bitdeer 4B',
  'bitdeer-5a': 'Bitdeer 5A',
  'bitdeer-5b': 'Bitdeer 5B',
  'bitdeer-9a': 'Bitdeer 9A',
  'bitdeer-9b': 'Bitdeer 9B',
  'bitdeer-10a': 'Bitdeer 10A',
  'bitdeer-10b': 'Bitdeer 10B',
  'microbt-1': 'MicroBT 1',
  'microbt-2': 'MicroBT 2',
  'bitmain-imm-1': 'Bitmain IMM 1',
  'bitmain-imm-2': 'Bitmain IMM 2',
  'bitmain-hydro-1': 'Bitmain Hydro 1',
  'bitmain-hydro-2': 'Bitmain Hydro 2',
}

const getCleanGroupedEntries = (
  hashrateMhs: Record<string, number>,
  isContainer: boolean,
): [string, number][] => {
  const entries = _toPairs(hashrateMhs)
  if (!isContainer) return entries
  return _filter(entries, ([key]) => !isLeakedGroupedContainerKey(key))
}

/**
 * Site View line chart input - sums hashrate across all (or selected) miner
 * types for each timestamp.
 *
 * Expects a `groupBy=miner` grouped log. Pass `selectedMinerTypes` to restrict
 * the sum to a subset (empty array = include all types).
 */
export const transformToSiteViewData = (
  log: HashrateGroupedLog | undefined,
  selectedMinerTypes: ReadonlyArray<string> = [],
): HashrateSiteViewChartData => {
  if (_isEmpty(log)) return { series: [] }

  const sortedLog = _orderBy(log, ['ts'], ['asc'])

  const aggregatedSeries = {
    label: SITE_VIEW_SERIES_LABEL,
    color: SITE_HASHRATE_COLOR,
    points: _map(sortedLog, ({ ts, hashrateMhs }) => {
      const entries = _toPairs(hashrateMhs)
      const includedEntries = _isEmpty(selectedMinerTypes)
        ? entries
        : _filter(entries, ([key]) => _includes(selectedMinerTypes, key))
      const total = includedEntries.reduce((sum, [, value]) => sum + (value || 0), 0)

      return {
        ts: new Date(ts).toISOString(),
        value: mhsToThs(total),
      }
    }),
  }

  return { series: [aggregatedSeries] }
}

const transformToBarData = (
  log: HashrateGroupedLog | undefined,
  selectedKeys: ReadonlyArray<string>,
  labels: Record<string, string>,
  isContainer: boolean,
): HashrateBarChartData => {
  if (_isEmpty(log)) return { labels: [], series: [] }

  const latest = _last(log)
  if (!latest) return { labels: [], series: [] }

  const cleanEntries = getCleanGroupedEntries(latest.hashrateMhs, isContainer)
  const nonZeroEntries = _filter(cleanEntries, ([, value]) => value > 0)
  const filteredEntries = _isEmpty(selectedKeys)
    ? nonZeroEntries
    : _filter(nonZeroEntries, ([key]) => _includes(selectedKeys, key))

  const transformed = _map(filteredEntries, ([key, value]) => ({
    label: labels[key] ?? key,
    value: mhsToThs(value),
  }))
  const sorted = _orderBy(transformed, ['value'], ['desc'])

  return {
    labels: _map(sorted, 'label'),
    series: [
      {
        label: HASHRATE_BAR_SERIES_LABEL,
        values: _map(sorted, 'value'),
        color: BAR_HASHRATE_COLOR,
      },
    ],
  }
}

export const transformToMinerTypeBarData = (
  log: HashrateGroupedLog | undefined,
  selectedMinerTypes: ReadonlyArray<string> = [],
): HashrateBarChartData => transformToBarData(log, selectedMinerTypes, MINER_TYPE_LABELS, false)

export const transformToMiningUnitBarData = (
  log: HashrateGroupedLog | undefined,
  selectedMiningUnits: ReadonlyArray<string> = [],
): HashrateBarChartData => transformToBarData(log, selectedMiningUnits, CONTAINER_LABELS, true)

const getOptionsFromLog = (
  log: HashrateGroupedLog | undefined,
  labels: Record<string, string>,
  isContainer: boolean,
): HashrateFilterOption[] => {
  if (!log || _isEmpty(log)) return []

  const seen = new Set<string>()
  for (const { hashrateMhs } of log) {
    for (const [key, value] of getCleanGroupedEntries(hashrateMhs, isContainer)) {
      if (value > 0) seen.add(key)
    }
  }

  return _map([...seen], (key) => ({
    value: key,
    label: labels[key] ?? key,
  }))
}

export const getMinerTypeOptionsFromLog = (
  log: HashrateGroupedLog | undefined,
): HashrateFilterOption[] => getOptionsFromLog(log, MINER_TYPE_LABELS, false)

export const getMiningUnitOptionsFromLog = (
  log: HashrateGroupedLog | undefined,
): HashrateFilterOption[] => getOptionsFromLog(log, CONTAINER_LABELS, true)
