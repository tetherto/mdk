'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')
const {
  getContainers,
  getCabinets,
  getCabinetById
} = require('../handlers/devices.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => {
  const schemas = require('../schemas/devices.schemas.js')

  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.CONTAINERS,
      schema: {
        querystring: schemas.query.containers
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'containers',
          req.query.filter,
          req.query.sort,
          req.query.fields,
          req.query.search,
          req.query.offset,
          req.query.limit
        ],
        ENDPOINTS.CONTAINERS,
        getContainers
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.CABINETS,
      schema: {
        querystring: schemas.query.cabinets
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'cabinets',
          req.query.filter,
          req.query.sort,
          req.query.offset,
          req.query.limit
        ],
        ENDPOINTS.CABINETS,
        getCabinets
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.CABINET_BY_ID,
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'cabinets',
          req.params.id
        ],
        ENDPOINTS.CABINET_BY_ID,
        getCabinetById
      )
    }
  ]
}
