export const TIME_FORMAT = 'HH:mm'
export const DATE_FORMAT = 'dd-MM-yyyy'
export const DATE_FORMAT_SLASHED = 'dd/MM/yyyy'
export const SHORT_DATE_FORMAT = 'dd MMM yyyy'
export const DATE_TIME_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}`
export const DATE_TIME_FORMAT_WITH_SECONDS = `${DATE_TIME_FORMAT}:ss`

// Type exports
export type DateFormatType =
  | typeof DATE_FORMAT
  | typeof DATE_FORMAT_SLASHED
  | typeof SHORT_DATE_FORMAT
export type TimeFormatType = typeof TIME_FORMAT
export type DateTimeFormatType = typeof DATE_TIME_FORMAT | typeof DATE_TIME_FORMAT_WITH_SECONDS
