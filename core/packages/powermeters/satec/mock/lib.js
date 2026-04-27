'use strict'

function useTelemetry (ctx) {
  return {
    sendTelemetryRequest: (req, uuid) => {
      if (ctx.telemetry) {
        ctx.telemetry.sendRequest({ req, uuid })
      }
    },
    sendTelemetryResponse: (res, uuid) => {
      if (ctx.telemetry) {
        ctx.telemetry.sendResponse({ res, uuid })
      }
    }
  }
}

module.exports = {
  useTelemetry
}
