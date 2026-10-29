'use strict'

// The only metacharacter in a resource, resourceName or verb pattern is `*`,
// which matches any run of characters, `/` included: `miner/*` covers
// `miner/antminer/antminer-a/AM-001`, and `*` alone covers everything.
// Everything else is literal and the match is anchored at both ends.

function compileGlob (pattern) {
  if (pattern === '*') return () => true
  if (!pattern.includes('*')) return (value) => value === pattern
  const source = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')
  const re = new RegExp(`^${source}$`, 's')
  return (value) => re.test(value)
}

// One matcher for a list of patterns: true when any of them matches.
function compileGlobs (patterns) {
  const matchers = patterns.map(compileGlob)
  return (value) => matchers.some((m) => m(value))
}

module.exports = { compileGlob, compileGlobs }
