import type { CSSProperties } from 'react'

export type LogData = {
  uuid: string
  body: string
  title: string
  status: string
  subtitle: string
}

export type LogRowProps = {
  /** Log entry data */
  log: LogData
  /** Log type (controls dot appearance) */
  type: string
  /** Inline style for the row container */
  style?: CSSProperties
  /** Click handler */
  onLogClicked?: (uuid: string) => void
}

export type LogPagination = {
  current: number
  total: number
  pageSize: number
  handlePaginationChange: (page: number) => void
}

export type LogsCardProps = Partial<{
  /** Log type (`'Incidents'` or `'Activity'`); controls the `LogDot` appearance */
  type: string
  /** Card header label */
  label: string
  /**
   * Applies dark card theme
   * @default false
   */
  isDark: boolean
  /**
   * Shows skeleton rows while loading
   * @default false
   */
  isLoading: boolean
  /**
   * Array of log entries to display
   * @default []
   */
  logsData: LogData[]
  /**
   * Message shown when `logsData` is empty
   * @default 'No active incidents'
   */
  emptyMessage: string
  /**
   * Number of skeleton rows shown during loading
   * @default 4
   */
  skeletonRows: number
  /** Pagination config; hides pagination when on page 1 or data is empty */
  pagination: LogPagination
  /** Fired with the log UUID when a row is clicked */
  onLogClicked: (uuid: string) => void
}>

export type LogDotProps = {
  /** `'Incidents'` renders a colored circle; `'Activity'` renders an activity icon */
  type: string
  /** Severity string for color mapping */
  status: string
}

export type LogItemProps = {
  data: LogData
  onLogClicked?: (uuid: string) => void
}

export type LogActivityIconProps = {
  status: string
}
