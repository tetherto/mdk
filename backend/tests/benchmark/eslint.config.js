'use strict'

const setup = require('@bitfinex/lint-js')
const { defaultIgnores } = require('@bitfinex/lint-js/lib/ignores')

// Skip generated run output (gitignored); bfx-lint-js does not read .gitignore.
module.exports = setup({
  ignores: [...defaultIgnores, 'results/', '.mdk-data/']
})
