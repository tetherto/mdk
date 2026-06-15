import { format as fmt } from 'date-fns/format'
import { parse } from 'date-fns/parse'
import _map from 'lodash/map'
import _replace from 'lodash/replace'
import _split from 'lodash/split'
import _trim from 'lodash/trim'

export const DATE_FORMAT = 'MMM dd, yyyy'
export const API_DATE_FORMAT = 'yyyy-MM-dd'

export const parseDateRange = (dateRange: string) => {
  const parts = _map(_split(dateRange, '-'), (segment) => _trim(segment))
  const fromRaw = parts[0] ?? ''
  const toRaw = parts[1] ?? parts[0] ?? ''

  const toParts = _split(toRaw, ',') || []
  const year = _trim(toParts[1])

  const startDateStr = year ? `${fromRaw}, ${year}` : fromRaw
  const endDateStr = toRaw

  try {
    const startDate = fmt(parse(startDateStr, DATE_FORMAT, new Date()), API_DATE_FORMAT)
    const endDate = fmt(parse(endDateStr, DATE_FORMAT, new Date()), API_DATE_FORMAT)
    return { startDate, endDate, startDateStr, endDateStr }
  } catch {
    return {
      startDate: fmt(new Date(), API_DATE_FORMAT),
      endDate: fmt(new Date(), API_DATE_FORMAT),
      startDateStr,
      endDateStr,
    }
  }
}

export const getMonthYear = (dateRange: string) => {
  const [firstPart] = _split(dateRange, '-')
  const [, yearPart] = _split(dateRange, ',')

  if (!yearPart) return { monthName: '', year: '' }

  try {
    const dateStr = `${_trim(firstPart)},${yearPart}`
    const date = new Date(dateStr)
    return {
      monthName: date.toLocaleString('en-US', { month: 'long' }),
      year: date.getFullYear(),
    }
  } catch {
    return { monthName: '', year: '' }
  }
}

export const formatDateForFilename = (dateRange: string): string => {
  try {
    const { startDate, endDate } = parseDateRange(dateRange)
    const startFormatted = _replace(startDate, /-/g, '')
    const endFormatted = _replace(endDate, /-/g, '')
    return `${startFormatted}-${endFormatted}`
  } catch {
    return 'date-unknown'
  }
}
