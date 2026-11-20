'use strict'

module.exports = async (ctx, params) => {
  ctx.device.power = params.watts
  return { watts: params.watts }
}
