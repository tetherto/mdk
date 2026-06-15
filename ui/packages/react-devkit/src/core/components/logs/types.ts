import type { CSSProperties } from 'react'

export type LogData = {
  uuid: string
  body: string
  title: string
  status: string
  subtitle: string
}

export type LogRowProps = {
  log: LogData
  type: string
  style?: CSSProperties
  onLogClicked?: (uuid: string) => void
}

export type LogPagination = {
  current: number
  total: number
  pageSize: number
  handlePaginationChange: (page: number) => void
}

export type LogsCardProps = Partial<{
  type: string
  label: string
  isDark: boolean
  isLoading: boolean
  logsData: LogData[]
  emptyMessage: string
  skeletonRows: number
  pagination: LogPagination
  onLogClicked: (uuid: string) => void
}>

export type LogDotProps = {
  type: string
  status: string
}

export type LogItemProps = {
  data: LogData
  onLogClicked?: (uuid: string) => void
}

export type LogActivityIconProps = {
  status: string
}
