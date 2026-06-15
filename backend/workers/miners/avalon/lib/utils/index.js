'use strict'

function parseAvalonResponseString (inputString) {
  const keyValuePairs = inputString.split(',') // Split the string into key-value pairs

  const parsedObject = {}
  for (const pair of keyValuePairs) {
    const [key, value] = pair.split('=') // Split each key-value pair into key and value
    parsedObject[key] = value
  }

  return parsedObject
}

function parseAvalonPoolData (inputString) {
  const poolsData = inputString.split('|').map((pool) => parseAvalonResponseString(pool))

  // remove first and last element and return
  return poolsData.slice(1, -1)
}

function extractValueBetweenBrackets (inputString, key) {
  const regex = new RegExp(`${key}\\[(.*?)\\]`)
  const match = inputString.match(regex)
  return match ? match[1] : null
}

module.exports = {
  parseAvalonResponseString,
  parseAvalonPoolData,
  extractValueBetweenBrackets
}
