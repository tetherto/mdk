'use strict'

const schemas = {
  query: {
    containers: {
      type: 'object',
      properties: {
        filter: { type: 'string' },
        sort: { type: 'string' },
        fields: { type: 'string' },
        search: { type: 'string' },
        offset: { type: 'integer', minimum: 0 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        overwriteCache: { type: 'boolean' }
      }
    },
    cabinets: {
      type: 'object',
      properties: {
        filter: { type: 'string' },
        sort: { type: 'string' },
        offset: { type: 'integer', minimum: 0 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        overwriteCache: { type: 'boolean' }
      }
    }
  }
}

module.exports = schemas
