export type Alert = {
  id?: string
  severity: string
  createdAt: number | string
  name: string
  description: string
  message?: string
  uuid?: string
  code?: string | number
  [key: string]: unknown
}

export type LogFormattedAlertData = {
  title: string
  subtitle: string
  status: string
  severityLevel: number
  creationDate: number | string
  body: string
  id: string
  uuid?: string
  [key: string]: unknown
}
