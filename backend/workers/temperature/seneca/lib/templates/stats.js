'use strict'

const { templates } = require('../../../../../core/mdk')

const { conf, specs } = templates.stats

module.exports = { conf, specs: { ...specs } }
