'use strict'

const { templates } = require('@tetherto/mdk-core')

const { conf, specs } = templates.stats

module.exports = { conf, specs: { ...specs } }
