'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')
const {
  getHashrate,
  getConsumption,
  getEfficiency,
  getMinerStatus,
  getPowerMode,
  getPowerModeTimeline,
  getTemperature,
  getContainerTelemetry,
  getContainerHistory
} = require('../handlers/metrics.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => {
  const schemas = require('../schemas/metrics.schemas.js')

  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_HASHRATE,
      schema: {
        querystring: schemas.query.hashrate
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/hashrate',
          req.query.start,
          req.query.end,
          req.query.groupBy
        ],
        ENDPOINTS.METRICS_HASHRATE,
        getHashrate
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_CONSUMPTION,
      schema: {
        querystring: schemas.query.consumption
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/consumption',
          req.query.start,
          req.query.end,
          req.query.groupBy
        ],
        ENDPOINTS.METRICS_CONSUMPTION,
        getConsumption
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_EFFICIENCY,
      schema: {
        querystring: schemas.query.efficiency
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/efficiency',
          req.query.start,
          req.query.end
        ],
        ENDPOINTS.METRICS_EFFICIENCY,
        getEfficiency
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_MINER_STATUS,
      schema: {
        querystring: schemas.query.minerStatus
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/miner-status',
          req.query.start,
          req.query.end
        ],
        ENDPOINTS.METRICS_MINER_STATUS,
        getMinerStatus
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_POWER_MODE,
      schema: {
        querystring: schemas.query.powerMode
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/power-mode',
          req.query.start,
          req.query.end,
          req.query.interval
        ],
        ENDPOINTS.METRICS_POWER_MODE,
        getPowerMode
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_POWER_MODE_TIMELINE,
      schema: {
        querystring: schemas.query.powerModeTimeline
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/power-mode/timeline',
          req.query.start,
          req.query.end,
          req.query.container
        ],
        ENDPOINTS.METRICS_POWER_MODE_TIMELINE,
        getPowerModeTimeline
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_TEMPERATURE,
      schema: {
        querystring: schemas.query.temperature
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/temperature',
          req.query.start,
          req.query.end,
          req.query.interval,
          req.query.container
        ],
        ENDPOINTS.METRICS_TEMPERATURE,
        getTemperature
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_CONTAINER_HISTORY,
      schema: {
        querystring: schemas.query.containerHistory
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/containers/history',
          req.params.id,
          req.query.start,
          req.query.end,
          req.query.limit
        ],
        ENDPOINTS.METRICS_CONTAINER_HISTORY,
        getContainerHistory
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.METRICS_CONTAINER_TELEMETRY,
      schema: {
        querystring: schemas.query.containerTelemetry
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'metrics/containers/telemetry',
          req.params.id
        ],
        ENDPOINTS.METRICS_CONTAINER_TELEMETRY,
        getContainerTelemetry
      )
    }
  ]
}
