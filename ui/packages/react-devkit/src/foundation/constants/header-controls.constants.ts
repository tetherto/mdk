import { WEBAPP_SHORT_NAME } from '.'

export type HeaderPreferences = {
  poolMiners: boolean
  mosMiners: boolean
  poolHashrate: boolean
  mosHashrate: boolean
  consumption: boolean
  efficiency: boolean
}

export const DEFAULT_HEADER_PREFERENCES: HeaderPreferences = {
  poolMiners: true,
  mosMiners: true,
  poolHashrate: true,
  mosHashrate: true,
  consumption: true,
  efficiency: true,
}

export const HEADER_ITEMS = [
  { key: 'poolMiners' as keyof HeaderPreferences, label: 'Pool Miners' },
  { key: 'mosMiners' as keyof HeaderPreferences, label: `${WEBAPP_SHORT_NAME} Miners` },
  { key: 'poolHashrate' as keyof HeaderPreferences, label: 'Pool Hashrate' },
  { key: 'mosHashrate' as keyof HeaderPreferences, label: `${WEBAPP_SHORT_NAME} Hashrate` },
  { key: 'consumption' as keyof HeaderPreferences, label: 'Consumption' },
  { key: 'efficiency' as keyof HeaderPreferences, label: 'Efficiency' },
] as const

export const HEADER_PREFERENCES_STORAGE_KEY = 'headerControlsPreferences'

export const HEADER_PREFERENCES_EVENTS = {
  STORAGE: 'storage',
  PREFERENCES_CHANGED: 'headerPreferencesChanged',
} as const
