'use strict'

const { HTTP_METHODS } = require('../../constants')
const { getWorkers, getTelemetry, getState, postCommand, getHashrate } = require('../handlers/site-monitor.handlers')
const { createAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: '/site-monitor/workers',
    ...createAuthRoute(ctx, getWorkers)
  },
  {
    method: HTTP_METHODS.GET,
    url: '/site-monitor/devices/:deviceId/telemetry',
    ...createAuthRoute(ctx, getTelemetry)
  },
  {
    method: HTTP_METHODS.GET,
    url: '/site-monitor/devices/:deviceId/state',
    ...createAuthRoute(ctx, getState)
  },
  {
    method: HTTP_METHODS.POST,
    url: '/site-monitor/devices/:deviceId/commands',
    ...createAuthRoute(ctx, postCommand)
  },
  {
    method: HTTP_METHODS.GET,
    url: '/site-monitor/hashrate',
    ...createAuthRoute(ctx, getHashrate)
  }
]
