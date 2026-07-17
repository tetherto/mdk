'use strict'

module.exports = async (ctx) => ctx.device.status || 'online'
