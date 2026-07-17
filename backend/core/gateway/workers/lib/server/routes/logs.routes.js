'use strict'
const { parseJsonQueryParam } = require('../../utils')
const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')
const {
  tailLogRoute,
  tailLogMultiRoute,
  tailLogRangeAggrRoute,
  getHistoryLogRoute
} = require('../handlers/logs.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => {
  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.TAIL_LOG,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            type: { type: 'string' },
            tag: { type: 'string' },
            start: { type: 'integer' },
            end: { type: 'integer' },
            offset: { type: 'integer' },
            limit: { type: 'integer' },
            fields: { type: 'string' },
            aggrFields: { type: 'string' },
            aggrTimes: { type: 'string' },
            mergeSitesData: { type: 'boolean' },
            applyAggrCrossthg: { type: 'boolean' },
            overwriteCache: { type: 'boolean' }
          },
          required: ['key']
        }
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'tail-log', req.query.key, req.query.type, req.query.tag,
          req.query.start, req.query.end, req.query.offset, req.query.limit,
          req.query.fields, req.query.aggrFields, req.query.aggrTimes, req.query.mergeSitesData,
          req.query.applyAggrCrossthg
        ],
        ENDPOINTS.TAIL_LOG,
        tailLogRoute
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.TAIL_LOG_MULTI,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            keys: { type: 'string' },
            start: { type: 'integer' },
            end: { type: 'integer' },
            offset: { type: 'integer' },
            limit: { type: 'integer' },
            fields: { type: 'string' },
            aggrFields: { type: 'string' },
            aggrTimes: { type: 'string' },
            overwriteCache: { type: 'boolean' }
          },
          required: ['keys']
        }
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'tail-log/multi', req.query.keys, req.query.start, req.query.end,
          req.query.offset, req.query.limit, req.query.fields, req.query.aggrFields, req.query.aggrTimes
        ],
        ENDPOINTS.TAIL_LOG_MULTI,
        tailLogMultiRoute
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.TAIL_LOG_RANGE_AGGR,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            keys: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  timezoneOffset: { type: 'number' },
                  fields: { type: 'object' }
                },
                required: ['type', 'startDate', 'endDate']
              },
              minItems: 1
            },
            overwriteCache: { type: 'boolean' }
          },
          required: ['keys']
        }
      },
      preValidation: (req, rep, done) => {
        if (req.query.keys) {
          req.query.keys = parseJsonQueryParam(req.query.keys, 'ERR_KEYS_INVALID_JSON')
        }
        done()
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => ['tail-log/range-aggr', JSON.stringify(req.query.keys)],
        ENDPOINTS.TAIL_LOG_RANGE_AGGR,
        tailLogRangeAggrRoute
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.HISTORY_LOG,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            start: { type: 'integer' },
            end: { type: 'integer' },
            offset: { type: 'integer' },
            limit: { type: 'integer' },
            startExcl: { type: 'integer' },
            endExcl: { type: 'integer' },
            overwriteCache: { type: 'boolean' },
            tag: { type: 'string' },
            logType: { type: 'string' }, // allowed types : alerts, info
            query: { type: 'string' },
            fields: { type: 'string' }
          },
          required: ['logType']
        }
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'history-log',
          req.query.start,
          req.query.end,
          req.query.offset,
          req.query.limit,
          req.query.startExcl,
          req.query.endExcl,
          req.query.tag,
          req.query.logType,
          req.query.fields,
          req.query.query
        ],
        ENDPOINTS.HISTORY_LOG,
        getHistoryLogRoute
      )
    }
  ]
}
