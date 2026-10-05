'use strict'

// Shared by check-example-paths.mjs and check-table-refs.mjs: both load a
// JSON skip-list config that requires a `_skip_notes` entry for every skip,
// and both translate glob patterns to RegExp for file-path matching.

export function globToRegExp (glob) {
  let re = '^'
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++
        if (glob[i + 1] === '/') {
          i++
          re += '(?:.*/)?'
        } else {
          re += '.*'
        }
      } else {
        re += '[^/]*'
      }
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c
    } else {
      re += c
    }
  }
  re += '$'
  return new RegExp(re)
}

// Throws if any of `keys` (skip entries, already stringified by the caller)
// lacks a matching entry in `notes` — a silent skip with no note is a false
// negative waiting to happen.
export function requireSkipNotes (configFileName, arrayNamesLabel, keys, notes) {
  const missing = keys.filter((key) => !notes[key])
  if (missing.length > 0) {
    throw new Error(
      `${configFileName}: every ${arrayNamesLabel} entry needs a _skip_notes entry ` +
      `(a silent skip with no note is a false negative waiting to happen). Missing notes for: ${missing.join(', ')}`
    )
  }
}

export function isSkippedFile (relFile, skipFiles) {
  return skipFiles.some((re) => re.test(relFile))
}
