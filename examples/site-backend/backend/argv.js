'use strict'

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function parseMinerCount (value, defaultCount) {
  const n = Number(value)
  return n > 0 && Number.isFinite(n) ? Math.floor(n) : defaultCount
}

function minerCountFromArgv (defaultCount) {
  return parseMinerCount(arg('--miners', defaultCount), defaultCount)
}

module.exports = { arg, parseMinerCount, minerCountFromArgv }
