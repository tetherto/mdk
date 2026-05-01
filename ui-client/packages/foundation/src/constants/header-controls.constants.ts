import { WEBAPP_SHORT_NAME } from '.'

export type HeaderPreferences = {
  poolMiners: boolean
  miners: boolean
  poolHashrate: boolean
  hashrate: boolean
  consumption: boolean
  efficiency: boolean
}

export const DEFAULT_HEADER_PREFERENCES: HeaderPreferences = {
  poolMiners: true,
  miners: true,
  poolHashrate: true,
  hashrate: true,
  consumption: true,
  efficiency: true,
}

export const HEADER_ITEMS = [
  { key: 'poolMiners' as keyof HeaderPreferences, label: 'Pool Miners' },
  { key: 'miners' as keyof HeaderPreferences, label: `${WEBAPP_SHORT_NAME} Miners` },
  { key: 'poolHashrate' as keyof HeaderPreferences, label: 'Pool Hashrate' },
  { key: 'hashrate' as keyof HeaderPreferences, label: `${WEBAPP_SHORT_NAME} Hashrate` },
  { key: 'consumption' as keyof HeaderPreferences, label: 'Consumption' },
  { key: 'efficiency' as keyof HeaderPreferences, label: 'Efficiency' },
] as const

export const HEADER_PREFERENCES_STORAGE_KEY = 'headerControlsPreferences'

export const HEADER_PREFERENCES_EVENTS = {
  STORAGE: 'storage',
  PREFERENCES_CHANGED: 'headerPreferencesChanged',
} as const
