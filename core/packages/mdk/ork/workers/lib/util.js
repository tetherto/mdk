'use strict'

const { MS_24_HOURS } = require('./constants')

const daysTo24HrIntervals = (days, utcOffsetMs = 0) => {
  const intervals = []
  let startTs = new Date(new Date().setUTCHours(0, 0, 0, 0)).getTime() - utcOffsetMs
  let endTs = Date.now()
  for (let index = 0; index < days; index++) {
    intervals.push({ startTs, endTs, index })
    endTs = startTs
    startTs = startTs - MS_24_HOURS
  }
  return intervals
}

const isCurrentDay = (ts, utcOffsetMs = 0) => {
  return new Date(ts + utcOffsetMs).getUTCDate() === new Date().getUTCDate()
}

const getNestedProperty = (obj, [...props]) => {
  if (props.length === 1) return obj?.[props[0]]
  return getNestedProperty(obj[props.shift()], props)
}

const getValue = (obj, path) => {
  const keys = path.split('.')
  return keys.reduce((acc, key) => acc && acc[key], obj)
}

const sortThings = (a, b, sortBy) => {
  const regex = /\d+|\D+/g // Matches numbers or non-numbers

  if (!sortBy || Object.keys(sortBy).length === 0) {
    return 1
  }

  // Iterate through all sort keys in sortBy
  for (const [key, order] of Object.entries(sortBy)) {
    const valA = getValue(a, key)
    const valB = getValue(b, key)

    if (valA === undefined || valB === undefined) {
      return (valA === undefined) - (valB === undefined)
    }

    const parseValue = value => String(value).match(regex) || []
    const partsA = parseValue(valA)
    const partsB = parseValue(valB)

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      const [partA, partB] = [partsA[i], partsB[i]]

      const diff =
        !isNaN(partA) && !isNaN(partB)
          ? Number(partA) - Number(partB) // Numeric comparison
          : partA.localeCompare(partB) // Lexicographic comparison

      if (diff !== 0) {
        return diff * order // Apply order (1 or -1)
      }
    }

    const lengthDiff = partsA.length - partsB.length
    if (lengthDiff !== 0) {
      return lengthDiff * order // Handle prefix cases
    }
  }

  return 0 // If all sort keys are equal, maintain order
}

module.exports = {
  daysTo24HrIntervals,
  isCurrentDay,
  getNestedProperty,
  getValue,
  sortThings
}
