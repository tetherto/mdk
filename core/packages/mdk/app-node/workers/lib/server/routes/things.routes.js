'use strict'
const {
  ENDPOINTS,
  HTTP_METHODS,
  COMMENT_ACTION
} = require('../../constants')
const {
  listThingsRoute,
  listRacksRoute,
  processThingComment,
  getThingSettings,
  saveThingSettings,
  getWorkerConfig,
  getThingConfig
} = require('../handlers/things.handlers')
const { createAuthRoute, createCachedAuthRoute } = require('../lib/routeHelpers')

const COMMENT_SCHEMA = {
  body: {
    type: 'object',
    properties: {
      id: { type: 'string', minLength: 1 },
      rackId: { type: 'string', minLength: 1 },
      thingId: { type: 'string', minLength: 1 },
      ts: { type: 'number' },
      comment: { type: 'string', minLength: 1 }
    },
    required: ['rackId', 'thingId', 'comment']
  }
}

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.LIST_THINGS,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          status: { type: 'string' },
          offset: { type: 'integer' },
          limit: { type: 'integer' },
          overwriteCache: { type: 'boolean' },
          fields: { type: 'string' }
        }
      }
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => [
        'list-things', req.query.query, req.query.status,
        req.query.offset, req.query.limit, req.query.fields
      ],
      ENDPOINTS.LIST_THINGS,
      listThingsRoute
    )
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.LIST_RACKS,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          overwriteCache: { type: 'boolean' }
        }
      }
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => ['list-racks', req.query.type],
      ENDPOINTS.LIST_RACKS,
      listRacksRoute
    )
  },
  {
    method: HTTP_METHODS.POST,
    url: ENDPOINTS.THING_COMMENT,
    schema: COMMENT_SCHEMA,
    ...createAuthRoute(ctx, (ctx, req) => processThingComment(ctx, req, COMMENT_ACTION.ADD))
  },
  {
    method: HTTP_METHODS.PUT,
    url: ENDPOINTS.THING_COMMENT,
    schema: COMMENT_SCHEMA,
    ...createAuthRoute(ctx, (ctx, req) => processThingComment(ctx, req, COMMENT_ACTION.EDIT))
  },
  {
    method: HTTP_METHODS.DELETE,
    url: ENDPOINTS.THING_COMMENT,
    schema: {
      body: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          rackId: { type: 'string' },
          thingId: { type: 'string' },
          ts: { type: 'number' }
        },
        required: ['rackId', 'thingId']
      }
    },
    ...createAuthRoute(ctx, (ctx, req) => processThingComment(ctx, req, COMMENT_ACTION.DELETE))
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.SETTINGS,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          rackId: { type: 'string' }
        },
        required: ['rackId']
      }
    },
    ...createAuthRoute(ctx, getThingSettings)
  },
  {
    method: HTTP_METHODS.PUT,
    url: ENDPOINTS.SETTINGS,
    schema: {
      body: {
        type: 'object',
        properties: {
          rackId: { type: 'string' },
          entries: {
            type: 'object',
            propertyNames: {
              type: 'string'
            },
            additionalProperties: true,
            minProperties: 1
          }
        },
        required: ['rackId', 'entries']
      }
    },
    ...createAuthRoute(ctx, saveThingSettings)
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.WORKER_CONFIG,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          fields: { type: 'string' },
          type: { type: 'string' },
          overwriteCache: { type: 'boolean' }
        },
        required: ['type']
      }
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => ['worker-config', req.query.fields, req.query.type],
      ENDPOINTS.WORKER_CONFIG,
      getWorkerConfig
    )
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.THING_CONFIG,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          requestType: { type: 'string' }
        },
        required: ['type', 'requestType']
      }
    },
    ...createAuthRoute(ctx, getThingConfig)
  }
]
