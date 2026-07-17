'use strict'

const { HOUR_MS, HOURS_24_MS } = require('./constants')

const isCurrentMonth = (month) => {
  return parseInt(month.split('-')[0]) === new Date().getMonth() + 1
}

const convertMsToSeconds = (timestampMs) => {
  return Math.floor(timestampMs / 1000)
}

const getTimeRanges = (start, end, isHourly = true) => {
  if (start >= end) return []

  const ranges = []
  const timeDiff = isHourly ? HOUR_MS : HOURS_24_MS
  let endTime = new Date(start + timeDiff)

  if (isHourly) {
    endTime.setUTCMinutes(0, 0, 0)
  } else {
    endTime.setUTCHours(0, 0, 0, 0)
  }

  endTime = endTime.getTime()
  while (start < end) {
    ranges.push({ start, end: endTime })
    start = endTime
    endTime += timeDiff
  }
  return ranges
}

module.exports = {
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
}
