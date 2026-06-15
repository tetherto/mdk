export type AlertLocalFilters = {
  severity?: string[] | string
  status?: string[]
  type?: string[]
  id?: string[]
  thing?: { id?: string }
  [key: string]: unknown
}

export type AlertActions = {
  onAlertClick?: (id: string, uuid: string) => void
  id?: string
  uuid: string
}

export type AlertTableRecord = {
  shortCode: string
  device: string
  alertName: string
  description?: string
  message?: string
  severity: string
  createdAt: number | string
  id?: string
  uuid: string
  actions?: AlertActions
  [key: string]: unknown
}

export type ParsedAlertEntry = {
  shortCode: string
  device: string
  tags: string[]
  alertName: string
  alertCode: string
  severity: string
  description?: string
  message?: string
  createdAt: string | number
  status?: string
  uuid: string
  id?: string
  type?: string
  actions: AlertActions
  [key: string]: unknown
}
