'use strict'

module.exports = async (ctx) => ctx.device.getMetric('active_workers_count')
