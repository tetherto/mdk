import type { Alert } from './alerts'

export type MinerStats = {
  status: string
  errors: Alert[] | unknown
  hashrate_mhs: Partial<{
    t_5m: number
    [key: string]: unknown
  }>
  are_all_errors_minor: boolean
  [key: string]: unknown
}

export type MinerConfig = {
  power_mode: string
  [key: string]: unknown
}

export type MinerSnap = {
  stats: Partial<MinerStats>
  config: Partial<MinerConfig>
  [key: string]: unknown
}

export type MinerLast = {
  snap: Partial<MinerSnap>
  err: string
  alerts: Partial<Alert[]>
  [key: string]: unknown
}

export type Miner = {
  snap: Partial<MinerSnap>
  last: Partial<MinerLast>
  temperature: Partial<Record<string, number>>
  err?: string
  error?: boolean
  [key: string]: unknown
}
