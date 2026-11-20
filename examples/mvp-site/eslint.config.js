'use strict'

const setup = require('@bitfinex/lint-js')
const { defaultIgnores } = require('@bitfinex/lint-js/lib/ignores')

// Skip generated/local files (gitignored); bfx-lint-js does not read .gitignore.
module.exports = setup({
  ignores: [...defaultIgnores, '.site-data/', 'store/', 'ui/', 'deploy/ecosystem.config.js']
})
