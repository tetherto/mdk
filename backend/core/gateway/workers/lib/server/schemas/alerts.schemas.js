'use strict'

const schemas = {
  query: {
    siteAlerts: {
      type: 'object',
      properties: {
        filter: { type: 'string' },
        sort: { type: 'string' },
        search: { type: 'string' },
        offset: { type: 'integer', minimum: 0 },
        limit: { type: 'integer', minimum: 1 },
        overwriteCache: { type: 'boolean' }
      }
    },
    alertsHistory: {
      type: 'object',
      properties: {
        start: { type: 'integer', minimum: 0 },
        end: { type: 'integer', minimum: 0 },
        filter: { type: 'string' },
        search: { type: 'string' },
        sort: { type: 'string' },
        offset: { type: 'integer', minimum: 0 },
        limit: { type: 'integer', minimum: 1 },
        overwriteCache: { type: 'boolean' }
      },
      required: ['start', 'end']
    }
  }
}

module.exports = schemas
