'use strict'

const schemas = {
  query: {
    groupsStats: {
      type: 'object',
      properties: {
        racks: { type: 'string' },
        overwriteCache: { type: 'boolean' }
      },
      required: ['racks']
    }
  }
}

module.exports = schemas
