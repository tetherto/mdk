'use strict'

module.exports = async (ctx) => String(ctx.device.apiVersion || '')
