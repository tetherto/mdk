'use strict'

// Global route schemas
const schemas = {
  // Query schemas
  query: {
    type: {
      type: 'object',
      properties: {
        type: { type: 'string' }
      },
      required: ['type']
    },
    globalData: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        gt: { type: 'integer' },
        gte: { type: 'integer' },
        lte: { type: 'integer' },
        lt: { type: 'integer' },
        limit: { type: 'integer' },
        reverse: { type: 'boolean' },
        query: { type: 'string' },
        groupBy: { type: 'string' },
        overwriteCache: { type: 'boolean' }
      },
      required: ['type']
    },
    features: {
      type: 'object',
      properties: {
        overwriteCache: { type: 'boolean' }
      }
    },
    globalConfig: {
      type: 'object',
      properties: {
        fields: { type: 'string' },
        overwriteCache: { type: 'boolean' }
      }
    }
  },
  // Body schemas
  body: {
    globalData: {
      type: 'object',
      properties: {
        data: {
          type: 'object'
        }
      },
      required: ['data']
    },
    features: {
      type: 'object',
      properties: {
        data: {
          type: 'object'
        }
      },
      required: ['data']
    },
    globalConfig: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            isAutoSleepAllowed: {
              type: 'boolean'
            }
          },
          required: ['isAutoSleepAllowed']
        }
      },
      required: ['data']
    }
  }
}

module.exports = schemas
