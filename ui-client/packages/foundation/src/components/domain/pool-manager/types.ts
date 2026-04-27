import type { Device } from '../../../types'

export type PoolEndpoint = {
  role?: string
  host: string
  port: string
  pool: string
  url?: string
}

export type PoolEndpointFormValues = Omit<PoolEndpoint, 'role' | 'region'>

type PoolCredentialTemplate = {
  workerName: string
  suffixType: string
}

export type PoolSummary = {
  id: string
  name: string
  description: string
  units: number
  miners: number
  workerName: string | undefined
  workerPassword: string | undefined
  endpoints: PoolEndpoint[]
  validation?: {
    status: string
  }
  credentialsTemplate?: Partial<PoolCredentialTemplate>
  updatedAt: Date
}

export type MinerRecord = {
  id: string
  code: string
  status?: string
  unit?: string
  hashrate?: number
  lastSyncedAt: Date
  tags?: string[]
  pool?: string
  raw: Device
}

export type RawDeviceStats = {
  status?: string
  hashrate_mhs?: { t_5m?: number }
}
